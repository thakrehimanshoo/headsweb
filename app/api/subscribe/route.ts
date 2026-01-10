// app/api/subscribe/route.ts
// Manages user subscriptions to push notifications

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'subscriptions.json');

interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  subscribedAt?: string;
}

// Load subscriptions from file
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

// Save subscriptions to file
function saveSubscriptions(subscriptions: PushSubscription[]): void {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
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
    const subscriptions = loadSubscriptions();

    // Check if already subscribed (by endpoint)
    const exists = subscriptions.some(sub => sub.endpoint === subscription.endpoint);

    if (!exists) {
      // Add new subscription
      subscriptions.push({
        ...subscription,
        subscribedAt: new Date().toISOString()
      });

      saveSubscriptions(subscriptions);
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

    const subscriptions = loadSubscriptions();
    const filtered = subscriptions.filter(sub => sub.endpoint !== endpoint);

    saveSubscriptions(filtered);
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
