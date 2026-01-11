// app/api/trigger-push/route.ts
// Triggered by Python scraper when new notices arrive

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import webpush from 'web-push';

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'subscriptions.json');

// VAPID configuration
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@headsup.com';

// Configure web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_EMAIL,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  subscribedAt?: string;
}

interface Notice {
  id: string;
  type: string;
  category: string;
  company: string;
  notice_time: string;
}

interface TriggerPushPayload {
  new_notices: Notice[];
  count: number;
}

function loadSubscriptions(): PushSubscription[] {
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading subscriptions:', error);
  }
  return [];
}

function saveSubscriptions(subscriptions: PushSubscription[]): void {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
  } catch (error) {
    console.error('Error saving subscriptions:', error);
  }
}

async function sendPushNotification(
  subscription: PushSubscription,
  payload: object
): Promise<{ success: boolean; expired?: boolean; error?: string }> {
  try {
    console.log('📤 Sending push to endpoint:', subscription.endpoint.substring(0, 50) + '...');
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    const result = await webpush.sendNotification(subscription, JSON.stringify(payload));

    console.log('✅ Push sent successfully! Status:', result.statusCode);
    console.log('📨 Response headers:', result.headers);

    return { success: true };
  } catch (error: any) {
    console.error('❌ Push failed!');
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      headers: error.headers,
      body: error.body
    });

    // If subscription expired or invalid, return error
    if (error.statusCode === 410 || error.statusCode === 404) {
      return { success: false, expired: true };
    }

    return { success: false, error: error.message };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check VAPID configuration
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.error('❌ VAPID keys not configured!');
      return NextResponse.json(
        { error: 'Server configuration error: VAPID keys missing' },
        { status: 500 }
      );
    }
    console.log('✅ VAPID keys configured');

    // Verify API key
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.HEADSUP_PUSH_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: TriggerPushPayload = await request.json();
    const { new_notices, count } = body;

    if (!new_notices || !Array.isArray(new_notices)) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    console.log(`\n🔔 Triggering push for ${count} new notices`);
    console.log('📋 New notices:', JSON.stringify(new_notices, null, 2));

    // Load subscriptions
    const subscriptions = loadSubscriptions();
    console.log(`📱 Found ${subscriptions.length} subscription(s)`);

    if (subscriptions.length === 0) {
      console.log('📭 No subscriptions found');
      return NextResponse.json({
        success: true,
        message: 'No subscriptions',
        sent: 0
      });
    }

    // Log subscription details
    subscriptions.forEach((sub, idx) => {
      console.log(`  ${idx + 1}. Endpoint: ${sub.endpoint.substring(0, 60)}...`);
      console.log(`     Keys present: p256dh=${!!sub.keys?.p256dh}, auth=${!!sub.keys?.auth}`);
    });

    // Create notification payload
    const timestamp = Date.now();
    const payload = {
      title: `🎓 ${count} New CDC ${count === 1 ? 'Notice' : 'Notices'}!`,
      body: new_notices.slice(0, 3).map(n =>
        `${n.company} - ${n.category}`
      ).join('\n'),
      icon: '/icon-192x192.png',
      badge: '/badge-96x96.png',
      tag: `cdc-notice-${timestamp}`, // Unique tag per notification batch
      requireInteraction: true,
      vibrate: [200, 100, 200], // Vibration pattern for mobile/supported devices
      data: {
        url: '/placement',
        notices: new_notices,
        timestamp
      }
    };

    console.log('📦 Created notification payload:', JSON.stringify(payload, null, 2));

    // Send to all subscriptions
    const results = await Promise.all(
      subscriptions.map(sub => sendPushNotification(sub, payload))
    );

    // Remove expired subscriptions
    const validSubscriptions = subscriptions.filter((sub, index) => {
      if (results[index].expired) {
        console.log('🗑️ Removing expired subscription:', sub.endpoint);
        return false;
      }
      return true;
    });

    if (validSubscriptions.length !== subscriptions.length) {
      saveSubscriptions(validSubscriptions);
    }

    const successCount = results.filter(r => r.success).length;

    console.log(`✅ Push sent to ${successCount}/${subscriptions.length} subscriptions`);

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: subscriptions.length - successCount,
      totalSubscriptions: validSubscriptions.length
    });

  } catch (error) {
    console.error('Error in POST /api/trigger-push:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
