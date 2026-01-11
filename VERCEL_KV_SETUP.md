# Vercel KV Setup Guide

## Overview
This application now uses Vercel KV (Redis-based key-value store) for persistent storage instead of the file system. This fixes the `EROFS: read-only file system` error that occurred when trying to write files on Vercel's serverless platform.

## What Changed?
- **Before**: Used local file system (`notices.json`, `subscriptions.json`)
- **After**: Uses Vercel KV for persistent storage

## Setup Instructions

### 1. Create a Vercel KV Database

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Navigate to your project
3. Click on the "Storage" tab
4. Click "Create Database"
5. Select "KV" (Key-Value Store)
6. Give it a name (e.g., "headsup-kv")
7. Click "Create"

### 2. Connect to Your Project

After creating the KV database:
1. Click "Connect to Project"
2. Select your HeadsUp project
3. Vercel will automatically add the required environment variables:
   - `KV_URL`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

### 3. Deploy

The environment variables are automatically available in your deployment. Just deploy:

```bash
git push origin main
```

Or trigger a deployment from the Vercel dashboard.

## What's Stored in KV?

### 1. Notices Data
- **Key**: `notices:data`
- **Type**: Object (Payload)
- **Contains**: All notice information including scraped_at, total_notices, and the notices array

### 2. Push Subscriptions
- **Key**: `push:subscriptions`
- **Type**: Array of PushSubscription objects
- **Contains**: All user push notification subscriptions

## Local Development

For local development, you have two options:

### Option 1: Use Vercel CLI (Recommended)
```bash
npm install -g vercel
vercel env pull .env.local
npm run dev
```

This will pull the KV environment variables from your Vercel project.

### Option 2: Mock KV with Redis Locally
1. Install Redis locally
2. Set environment variables in `.env.local`:
   ```
   KV_URL=redis://localhost:6379
   KV_REST_API_URL=http://localhost:6379
   KV_REST_API_TOKEN=local-dev-token
   KV_REST_API_READ_ONLY_TOKEN=local-dev-token
   ```

## Migration Notes

- No data migration is needed - the application will start fresh with an empty KV store
- Old `notices.json` and `subscriptions.json` files are no longer used
- Users will need to re-subscribe to push notifications

## Troubleshooting

### Error: "KV_REST_API_URL is not defined"
- Make sure you've created a Vercel KV database and connected it to your project
- Redeploy after connecting the database

### Local development not working
- Use `vercel env pull` to get the environment variables
- Or set up a local Redis instance

## Cost
Vercel KV has a free tier with:
- 30,000 commands per day
- 256 MB storage

This should be sufficient for most use cases. Monitor your usage in the Vercel dashboard.

## Support
For issues with Vercel KV, see:
- Vercel KV Documentation: https://vercel.com/docs/storage/vercel-kv
- Vercel Support: https://vercel.com/support
