# 🔄 New Architecture: Change Detection in HeadsUp

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Python Scraper (Stateless)                   │
│                                                                  │
│  • Scrapes ERP notices every X minutes                          │
│  • NO state management                                          │
│  • NO change detection                                          │
│  • Just pushes ALL notices to both apps                         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌──────────────────────────────────────┐
        │    Push ALL Notices (Every Scrape)    │
        └──────────────────────────────────────┘
                │                    │
        ┌───────▼────────┐   ┌──────▼────────┐
        │  Noticeboard   │   │  HeadsUp      │
        │  (Different    │   │  (This Repo)  │
        │   Domain)      │   │               │
        └────────────────┘   └──────┬────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │  /api/notices (POST)            │
                    │  • Load previous from storage   │
                    │  • Compare with current         │
                    │  • Detect NEW notices           │
                    │  • Trigger push for NEW only    │
                    │  • Save ALL to storage          │
                    └────────────────┬────────────────┘
                                     │
                            ┌────────▼────────┐
                            │ data/notices.json│
                            │ (Single Source)  │
                            └──────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │  Auto Push Notifications         │
                    │  (Only for NEW notices)          │
                    └─────────────────────────────────┘
```

---

## 🔑 Key Changes

### Before (Old Architecture)

```python
# Python Scraper
1. Scrape notices
2. Load prev_notices.json
3. Compare current vs previous
4. Identify NEW notices
5. Push ALL to /api/notices
6. Push NEW to /api/trigger-push
7. Save prev_notices.json
```

**Problems:**
- ❌ Scraper manages state (prev_notices.json)
- ❌ Two separate API calls
- ❌ Change detection logic in scraper
- ❌ Manual trigger for push notifications

### After (New Architecture)

```python
# Python Scraper
1. Scrape notices
2. Push ALL to /api/notices
✅ Done! (No state, no change detection)
```

```typescript
// HeadsUp /api/notices
1. Receive ALL notices
2. Load data/notices.json (previous)
3. Compare current vs previous
4. Identify NEW notices
5. Auto-trigger push for NEW
6. Save ALL to data/notices.json
```

**Benefits:**
- ✅ Scraper is stateless
- ✅ Single API call
- ✅ Change detection in HeadsUp
- ✅ Automatic push notifications
- ✅ Single source of truth

---

## 📁 File Structure

### Python Scraper (Simplified)

```
scraper/
├── main.py                  # Simplified - no state management
├── notices.json             # Local backup only
├── .env                     # Configuration
└── .gitignore              # Standard ignores
```

**No longer needed:**
- ❌ `prev_notices.json` - removed
- ❌ `trigger_web_push()` function - removed
- ❌ `load_previous_notices()` - removed
- ❌ `save_current_notices()` - removed
- ❌ `get_new_notices()` - removed

### HeadsUp App

```
headsweb/
├── app/api/notices/route.ts     # NOW handles change detection
├── app/api/subscribe/route.ts   # Manages push subscriptions
├── app/api/trigger-push/route.ts # Still exists but rarely used directly
├── data/notices.json            # Single source of truth
├── subscriptions.json           # Push subscriptions
└── .env.local                   # VAPID keys
```

---

## 🔄 How It Works

### Step 1: Scraper Runs (Every 30 min)

```python
# Python scraper is now VERY simple
notices = scrape_from_erp()  # Get all notices
push_to_headsup(notices)     # Push ALL notices
# Done! No state, no change detection
```

### Step 2: HeadsUp Receives Data

```typescript
// app/api/notices/route.ts (POST endpoint)
export async function POST(req) {
  const incoming = await req.json();  // ALL notices from scraper

  // Load previous state
  const previous = await loadPreviousNotices();  // From data/notices.json

  // Detect changes
  const newNotices = getNewNotices(incoming, previous);

  // Auto-trigger push for NEW notices
  if (newNotices.length > 0) {
    await triggerPushNotifications(newNotices);
  }

  // Save ALL notices (becomes new "previous")
  await saveNotices(incoming);

  return { ok: true, new_notices: newNotices.length };
}
```

### Step 3: Push Notifications Sent

```typescript
// Automatic - no manual trigger needed
async function triggerPushNotifications(newNotices) {
  const subscriptions = loadSubscriptions();

  const payload = {
    title: `🎓 ${newNotices.length} New CDC Notices!`,
    body: newNotices.map(n => `${n.company} - ${n.category}`).join('\n'),
    // ...
  };

  // Send to all subscribers
  await Promise.all(
    subscriptions.map(sub => webpush.sendNotification(sub, payload))
  );
}
```

---

## 🧪 Testing

### Test 1: First Push (No Previous Data)

```bash
# Run scraper for first time
python main.py
```

**HeadsUp logs:**
```
📥 Received 15 notices from scraper
📊 Previous: 0 | Current: 15
🆕 Found 15 new notice(s):
   1. [PLACEMENT] Google - Core
   2. [PLACEMENT] Microsoft - Dream
   3. [INTERNSHIP] Amazon - Core
   ... and 12 more
🔔 Triggering push for 15 new notice(s)
📱 Sending to 1 subscription(s)
✅ Push sent to 1/1 subscriptions
✅ Saved 15 notices to storage
```

**Result:** Users receive 15 notifications ✅

---

### Test 2: Same Data (No Changes)

```bash
# Run scraper again immediately
python main.py
```

**HeadsUp logs:**
```
📥 Received 15 notices from scraper
📊 Previous: 15 | Current: 15
📭 No new notices detected
✅ Saved 15 notices to storage
```

**Result:** No notifications sent ✅

---

### Test 3: One New Notice

```bash
# Scraper finds 16 notices (1 new)
python main.py
```

**HeadsUp logs:**
```
📥 Received 16 notices from scraper
📊 Previous: 15 | Current: 16
🆕 Found 1 new notice(s):
   1. [PLACEMENT] Apple - Dream
🔔 Triggering push for 1 new notice(s)
📱 Sending to 1 subscription(s)
✅ Push sent to 1/1 subscriptions
✅ Saved 16 notices to storage
```

**Result:** Users receive 1 notification for Apple ✅

---

## 📋 API Endpoints

### POST /api/notices

**Purpose:** Receive notices from scraper, detect changes, auto-push

**Request:**
```json
{
  "scraped_at": "2026-01-10T18:00:00+05:30",
  "total_notices": 16,
  "notices": [
    {
      "id": "12345",
      "type": "PLACEMENT",
      "category": "Core",
      "company": "Google",
      "notice_time": "10-01-2026 14:30"
    }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "total_notices": 16,
  "new_notices": 1,
  "pushed": true
}
```

**What it does:**
1. ✅ Validates API key
2. ✅ Loads previous notices from `data/notices.json`
3. ✅ Compares and finds NEW notices
4. ✅ Triggers push notifications (if new notices exist)
5. ✅ Saves ALL notices to storage
6. ✅ Returns statistics

---

### POST /api/trigger-push

**Purpose:** Manual trigger (rarely used now)

Still exists but typically NOT called by scraper anymore. HeadsUp's `/api/notices` handles this automatically.

**When to use:**
- Manual testing
- Emergency notifications
- Custom triggers

---

### POST /api/subscribe

**Purpose:** Manage push notification subscriptions

Users click "Enable Notifications" → Browser calls this endpoint

---

## 🚀 Deployment

### Python Scraper

```bash
# Setup cron job (every 30 minutes)
*/30 * * * * cd /path/to/scraper && python3 main.py >> scraper.log 2>&1
```

**Scraper only needs:**
```env
HEADSUP_API_BASE=https://your-headsup-app.vercel.app
HEADSUP_PUSH_KEY=your-api-key
```

### HeadsUp App

```bash
# Deploy to Vercel/Railway/etc
npm run build
```

**HeadsUp needs:**
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BHmzkq...
VAPID_PRIVATE_KEY=DRJ0Xpgb...
VAPID_EMAIL=mailto:admin@headsup.com
HEADSUP_PUSH_KEY=f708296cb8...
```

---

## 🔧 Configuration

### Scraper (.env)

```bash
# HeadsUp API (minimal data + auto push)
HEADSUP_API_BASE=https://headsup.vercel.app
HEADSUP_PUSH_KEY=f708296cb8ad7c0379ec9bf30b4443aa263728c4

# Noticeboard API (full content - different domain)
NOTICEBOARD_API_BASE=https://noticeboard.vercel.app
NOTICES_PUSH_KEY=85CE79688BFEED39786FDF7B25E7D

# ERP credentials
ERP_NOTICE_URL=https://erp.iitkgp.ac.in/...
```

---

## 📊 Monitoring

### Check HeadsUp Logs

```bash
# View Next.js logs
tail -f .next/server.log

# Or check Vercel deployment logs
vercel logs
```

**Look for:**
```
📥 Received 16 notices from scraper
🆕 Found 1 new notice(s)
🔔 Triggering push for 1 new notice(s)
✅ Push sent to 1/1 subscriptions
```

### Check Scraper Logs

```bash
tail -f scraper.log
```

**Look for:**
```
✅ Pushed to HeadsUp: {'ok': True, 'new_notices': 1, 'pushed': True}
   🔔 Triggered push for 1 new notice(s)
```

---

## ❓ FAQ

**Q: What if I delete `data/notices.json`?**
A: Next scrape will treat ALL notices as new. Users get notifications for everything.

**Q: Can I still use `/api/trigger-push` directly?**
A: Yes! It still exists for manual testing or emergency notifications.

**Q: Does scraper need `prev_notices.json` anymore?**
A: No! The scraper is now stateless. HeadsUp manages all state.

**Q: What if scraper sends same data twice in a row?**
A: HeadsUp detects no changes → No push notifications sent.

**Q: How do I force a notification for all notices?**
A: Delete `data/notices.json` and restart scraper.

**Q: Can I run multiple scraper instances?**
A: Yes, but they'll all push to same HeadsUp instance. HeadsUp handles deduplication.

---

## ✅ Summary

| Component | Responsibility |
|-----------|---------------|
| **Python Scraper** | Scrape ERP → Push ALL notices |
| **HeadsUp** | Detect changes → Auto-push → Store data |
| **Noticeboard** | Display full content (different domain) |

**Benefits:**
- ✅ Simpler scraper (no state)
- ✅ Single API call per scrape
- ✅ Automatic push notifications
- ✅ Single source of truth (`data/notices.json`)
- ✅ Better separation of concerns

**Perfect for:**
- ✅ Scheduled scraping (cron jobs)
- ✅ Multiple scraper instances
- ✅ Easy testing and debugging
- ✅ Scalable architecture

🎉 **The new architecture is production-ready!**
