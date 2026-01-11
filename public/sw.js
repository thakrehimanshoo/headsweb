// public/sw.js
// Service Worker for handling push notifications

self.addEventListener('install', (event) => {
  console.log('✅ Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('🔔 Push event received!', event);

  try {
    if (!event.data) {
      console.warn('⚠️ No data in push event');
      // Show a default notification anyway
      event.waitUntil(
        self.registration.showNotification('HeadsUp! New Notice', {
          body: 'A new CDC notice has been posted',
          icon: '/icon-192x192.png',
          badge: '/badge-96x96.png',
          tag: 'cdc-notice-default'
        })
      );
      return;
    }

    let data;
    try {
      data = event.data.json();
      console.log('📦 Push data parsed:', data);
    } catch (parseError) {
      console.error('❌ Failed to parse push data:', parseError);
      console.log('Raw data:', event.data.text());
      // Show error notification
      event.waitUntil(
        self.registration.showNotification('HeadsUp! Error', {
          body: 'Received notification but could not parse data',
          icon: '/icon-192x192.png'
        })
      );
      return;
    }

    const options = {
      body: data.body || 'New CDC notice available',
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/badge-96x96.png',
      tag: data.tag || `cdc-notice-${Date.now()}`, // Unique tag to prevent replacement
      requireInteraction: data.requireInteraction || true,
      vibrate: data.vibrate || [200, 100, 200], // Vibration for supported devices
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'View Notices'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ]
    };

    console.log('📤 Showing notification with options:', options);

    event.waitUntil(
      self.registration.showNotification(data.title || 'HeadsUp! New Notice', options)
        .then(() => {
          console.log('✅ Notification shown successfully');
        })
        .catch((error) => {
          console.error('❌ Failed to show notification:', error);
        })
    );

  } catch (error) {
    console.error('❌ Error in push event handler:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'view' || event.action === '') {
    // Build URL with notice IDs as query params for highlighting
    const baseUrl = event.notification.data.url || '/placement';
    const noticeIds = event.notification.data.notices?.map(n => n.id).join(',') || '';
    const urlToOpen = new URL(
      `${baseUrl}?new=${noticeIds}&from=notification&ts=${Date.now()}`,
      self.location.origin
    ).href;

    console.log('Opening URL with new notices:', urlToOpen);

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if app is already open at the base URL
        const baseUrlFull = new URL(baseUrl, self.location.origin).href;
        for (const client of clientList) {
          if (client.url.startsWith(baseUrlFull) && 'focus' in client) {
            // Navigate to new URL with highlight params
            return client.focus().then(() => client.navigate(urlToOpen));
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});
