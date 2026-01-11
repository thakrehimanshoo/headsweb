// app/api/subscribe/route.ts
// Manages user subscriptions to push notifications

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const KV_SUBSCRIPTIONS_KEY = 'push:subscriptions';

interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  subscribedAt?: string;
}

// Load subscriptions from KV
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

// Save subscriptions to KV
async function saveSubscriptions(subscriptions: PushSubscription[]): Promise<void> {
  try {
    await kv.set(KV_SUBSCRIPTIONS_KEY, subscriptions);
  } catch (error) {
    console.error('Error saving subscriptions:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json();

    // Validate subscription
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription' },
        { status: 400 }
      );
    }

    // Load existing subscriptions
    const subscriptions = await loadSubscriptions();

    // Check if already subscribed (by endpoint)
    const exists = subscriptions.some(sub => sub.endpoint === subscription.endpoint);

    if (!exists) {
      // Add new subscription
      subscriptions.push({
        ...subscription,
        subscribedAt: new Date().toISOString()
      });

      await saveSubscriptions(subscriptions);
      console.log('✅ New subscription added:', subscription.endpoint);
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription saved',
      totalSubscriptions: subscriptions.length
    });

  } catch (error) {
    console.error('Error in POST /api/subscribe:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint required' },
        { status: 400 }
      );
    }

    const subscriptions = await loadSubscriptions();
    const filtered = subscriptions.filter(sub => sub.endpoint !== endpoint);

    await saveSubscriptions(filtered);
    console.log('🗑️ Subscription removed:', endpoint);

    return NextResponse.json({
      success: true,
      message: 'Subscription removed',
      totalSubscriptions: filtered.length
    });

  } catch (error) {
    console.error('Error in DELETE /api/subscribe:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
