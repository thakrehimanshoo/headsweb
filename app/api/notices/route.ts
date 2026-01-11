import { NextResponse } from "next/server";
import { kv } from '@vercel/kv';
import webpush from 'web-push';

// HeadsUp Notice Type (FULL notice data)
type Notice = {
  id: string;
  type: string;
  category: string;
  company: string;
  notice_text: string;
  notice_by: string;
  notice_time: string; // e.g., "11-10-2025 13:07"
};

type Payload = {
  scraped_at: string;
  total_notices?: number;
  notices: Notice[];
};

interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  subscribedAt?: string;
}

// Vercel KV keys for storage
const KV_NOTICES_KEY = 'notices:data';
const KV_SUBSCRIPTIONS_KEY = 'push:subscriptions';
const API_KEY = process.env.HEADSUP_PUSH_KEY || "";

// VAPID configuration for push notifications
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

// Helper: Load previous notices from KV
async function loadPreviousNotices(): Promise<Notice[]> {
  try {
    const data = await kv.get(KV_NOTICES_KEY);
    if (!data || typeof data !== 'object') {
      return [];
    }
    const json = data as Payload;
    return json.notices || [];
  } catch (e) {
    console.error('Error loading previous notices:', e);
    return [];
  }
}

// Helper: Get new notices by comparing IDs
function getNewNotices(currentNotices: Notice[], previousNotices: Notice[]): Notice[] {
  const prevIds = new Set(previousNotices.map(n => n.id));
  return currentNotices.filter(n => !prevIds.has(n.id));
}

// Helper: Load subscriptions from KV
async function loadSubscriptions(): Promise<PushSubscription[]> {
  try {
    const data = await kv.get(KV_SUBSCRIPTIONS_KEY);
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data as PushSubscription[];
  } catch (error) {
    console.error('Error loading subscriptions:', error);
    return [];
  }
}

// Helper: Save subscriptions to KV
async function saveSubscriptions(subscriptions: PushSubscription[]): Promise<void> {
  try {
    await kv.set(KV_SUBSCRIPTIONS_KEY, subscriptions);
  } catch (error) {
    console.error('Error saving subscriptions:', error);
  }
}

// Helper: Send push notification
async function sendPushNotification(
  subscription: PushSubscription,
  payload: object
): Promise<{ success: boolean; expired?: boolean }> {
  try {
    console.log('📤 Sending push to:', subscription.endpoint.substring(0, 50) + '...');

    const result = await webpush.sendNotification(subscription, JSON.stringify(payload));

    console.log('✅ Push delivered! Status:', result.statusCode);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Push failed for subscription!');
    console.error('Error:', {
      message: error.message,
      statusCode: error.statusCode,
      endpoint: subscription.endpoint.substring(0, 50) + '...'
    });

    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('🗑️ Subscription expired or invalid');
      return { success: false, expired: true };
    }

    return { success: false };
  }
}

// Helper: Trigger push notifications for new notices
async function triggerPushNotifications(newNotices: Notice[]): Promise<void> {
  if (newNotices.length === 0) {
    console.log('📭 No new notices - skipping push');
    return;
  }

  console.log(`🔔 Triggering push for ${newNotices.length} new notice(s)`);

  const subscriptions = await loadSubscriptions();

  if (subscriptions.length === 0) {
    console.log('📭 No subscriptions found');
    return;
  }

  console.log(`📱 Sending to ${subscriptions.length} subscription(s)`);

  // Create notification payload
  const count = newNotices.length;
  const timestamp = Date.now();
  const payload = {
    title: `🎓 ${count} New CDC ${count === 1 ? 'Notice' : 'Notices'}!`,
    body: newNotices.slice(0, 3).map(n =>
      `${n.company} - ${n.category}`
    ).join('\n'),
    icon: '/icon-192x192.png',
    badge: '/badge-96x96.png',
    tag: `cdc-notice-${timestamp}`, // Unique tag per notification batch
    requireInteraction: true,
    vibrate: [200, 100, 200], // Vibration pattern for mobile/supported devices
    data: {
      url: '/placement',
      notices: newNotices,
      timestamp
    }
  };

  // Send to all subscriptions
  const results = await Promise.all(
    subscriptions.map(sub => sendPushNotification(sub, payload))
  );

  // Remove expired subscriptions
  const validSubscriptions = subscriptions.filter((sub, index) => {
    if (results[index].expired) {
      console.log('🗑️ Removing expired subscription');
      return false;
    }
    return true;
  });

  if (validSubscriptions.length !== subscriptions.length) {
    await saveSubscriptions(validSubscriptions);
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Push sent to ${successCount}/${subscriptions.length} subscriptions`);
}

export async function GET() {
  try {
    const data = await kv.get(KV_NOTICES_KEY);

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        {
          scraped_at: null,
          notices: [],
          total_notices: 0,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      {
        scraped_at: null,
        notices: [],
        total_notices: 0,
        error: String(e?.message || e),
      },
      { status: 200 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const key = req.headers.get("x-api-key");
    if (!API_KEY || key !== API_KEY) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Payload;

    if (!body || !Array.isArray(body.notices)) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    console.log(`\n📥 Received ${body.notices.length} notices from scraper`);

    // Store ALL notice data (including notice_text and notice_by)
    const allNotices = body.notices;

    // ============================================================================
    // CHANGE DETECTION - Automatically detect new notices
    // ============================================================================

    // Load previous notices from storage
    const previousNotices = await loadPreviousNotices();
    console.log(`📊 Previous: ${previousNotices.length} | Current: ${allNotices.length}`);

    // Find NEW notices
    const newNotices = getNewNotices(allNotices, previousNotices);

    if (newNotices.length > 0) {
      console.log(`🆕 Found ${newNotices.length} new notice(s):`);
      newNotices.slice(0, 3).forEach((n, i) => {
        console.log(`   ${i + 1}. [${n.type}] ${n.company} - ${n.category}`);
      });
      if (newNotices.length > 3) {
        console.log(`   ... and ${newNotices.length - 3} more`);
      }

      // Trigger push notifications asynchronously (don't wait for completion)
      triggerPushNotifications(newNotices).catch(err => {
        console.error('❌ Push notification error:', err);
      });
    } else {
      console.log('📭 No new notices detected');
    }

    // ============================================================================
    // SAVE ALL NOTICES (with full data including notice_text)
    // ============================================================================

    const normalized: Payload = {
      scraped_at: body.scraped_at ?? new Date().toISOString(),
      notices: allNotices,
      total_notices: body.total_notices ?? allNotices.length,
    };

    // Save to Vercel KV
    await kv.set(KV_NOTICES_KEY, normalized);

    console.log(`✅ Saved ${allNotices.length} notices to KV storage`);

    return NextResponse.json({
      ok: true,
      total_notices: allNotices.length,
      new_notices: newNotices.length,
      pushed: newNotices.length > 0
    }, { status: 200 });

  } catch (e: any) {
    console.error('❌ Error in POST /api/notices:', e);
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
// import { NextResponse } from "next/server";
// import path from "path";
// import { promises as fs } from "fs";

// import { broadcastUpdate } from "./bus";

// // HeadsUp Notice Type (NO notice_text, NO notice_by)
// type Notice = {
//   id: string;
//   type: string;
//   category: string;
//   company: string;
//   notice_time: string; // e.g., "11-10-2025 13:07"
// };

// type Payload = {
//   scraped_at: string;
//   total_notices?: number;
//   notices: Notice[];
// };

// const DATA_PATH = path.join(process.cwd(), "data", "notices.json");
// const API_KEY = process.env.HEADSUP_PUSH_KEY || "";

// export async function GET() {
//   try {
//     const buf = await fs.readFile(DATA_PATH); // read raw bytes
//     let txt = buf.toString("utf8");

//     // If a BOM slipped in, remove it
//     if (txt.charCodeAt(0) === 0xfeff) {
//       txt = txt.slice(1);
//     }
//     // If there are many NULs, it was likely UTF-16LE; fallback decode:
//     if (txt.includes("\u0000")) {
//       txt = buf.toString("utf16le");
//       if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1);
//     }

//     const json = JSON.parse(txt);
//     return NextResponse.json(json, { status: 200 });
//   } catch (e: any) {
//     return NextResponse.json(
//       {
//         scraped_at: null,
//         notices: [],
//         total_notices: 0,
//         error: String(e?.message || e),
//       },
//       { status: 200 }
//     );
//   }
// }

// export async function POST(req: Request) {
//   try {
//     const key = req.headers.get("x-api-key");
//     if (!API_KEY || key !== API_KEY) {
//       return NextResponse.json({ error: "unauthorized" }, { status: 401 });
//     }

//     const body = (await req.json()) as Payload;

//     if (!body || !Array.isArray(body.notices)) {
//       return NextResponse.json({ error: "invalid payload" }, { status: 400 });
//     }

//     // HeadsUp: Ensure notices don't contain notice_text or notice_by
//     const cleanedNotices = body.notices.map((notice) => ({
//       id: notice.id,
//       type: notice.type,
//       category: notice.category,
//       company: notice.company,
//       notice_time: notice.notice_time,
//       // notice_text: EXCLUDED
//       // notice_by: EXCLUDED
//     }));

//     // normalize optional
//     const normalized: Payload = {
//       scraped_at: body.scraped_at ?? new Date().toISOString(),
//       notices: cleanedNotices,
//       total_notices: body.total_notices ?? cleanedNotices.length,
//     };

//     await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
//     await fs.writeFile(DATA_PATH, JSON.stringify(normalized, null, 2), "utf8");

//     // Broadcast to all connected SSE clients that data updated
//     broadcastUpdate();

//     return NextResponse.json({ ok: true }, { status: 200 });
//   } catch (e: any) {
//     return NextResponse.json(
//       { error: String(e?.message || e) },
//       { status: 500 }
//     );
//   }
// }