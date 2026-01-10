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
      tag: data.tag || 'cdc-notice',
      requireInteraction: data.requireInteraction || true,
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
    // Open the app at the placement page
    const urlToOpen = new URL(event.notification.data.url || '/placement', self.location.origin).href;

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
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
