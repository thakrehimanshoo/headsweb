# Web Push Notification System - Complete Workflow

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Python Scraper (Scheduler)                   │
│                                                                  │
│  1. Scrapes ERP notices                                         │
│  2. Compares with previous scrape (prev_notices.json)           │
│  3. Identifies NEW notices                                      │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌──────────────────────────────────────┐
        │    Data Flow (Two Destinations)       │
        └──────────────────────────────────────┘
                │                    │
        ┌───────▼────────┐   ┌──────▼────────┐
        │  ALL Notices   │   │  NEW Notices  │
        │  (Storage)     │   │  (Alert Only) │
        └───────┬────────┘   └──────┬────────┘
                │                    │
                ▼                    ▼
    ┌────────────────────┐  ┌───────────────────┐
    │ POST /api/notices  │  │ POST /api/        │
    │                    │  │  trigger-push     │
    │ • Full dataset     │  │                   │
    │ • Replaces DB      │  │ • New notices only│
    │ • notice_text      │  │ • Triggers push   │
    │   included         │  │ • No storage      │
    └────────────────────┘  └─────────┬─────────┘
                                      │
                                      ▼
                          ┌─────────────────────┐
                          │  web-push library   │
                          │  Sends to FCM/etc   │
                          └─────────┬───────────┘
                                    │
                                    ▼
                          ┌─────────────────────┐
                          │  Service Worker     │
                          │  (sw.js)            │
                          │  Shows notification │
                          └─────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────────┐
                          │  User sees popup    │
                          │  🎓 1 New Notice!   │
                          └─────────────────────┘
```

---

## 🔄 Scraper Workflow

### First Run (No previous data)
```
1. Scrape notices from ERP
   ├─ Found: 15 notices
   └─ Previous: 0 notices

2. Identify new notices
   └─ New: 15 notices (all are new)

3. Push to APIs
   ├─ /api/notices → Store 15 notices
   └─ /api/trigger-push → Send push for 15 notices

4. Save current state
   └─ prev_notices.json → 15 notices saved

5. Result
   └─ ✅ Users receive 15 notifications
```

### Second Run (No changes)
```
1. Scrape notices from ERP
   ├─ Found: 15 notices
   └─ Previous: 15 notices

2. Identify new notices
   └─ New: 0 notices (all already seen)

3. Push to APIs
   ├─ /api/notices → Store 15 notices (update timestamp)
   └─ /api/trigger-push → SKIPPED (no new notices)

4. Save current state
   └─ prev_notices.json → 15 notices saved

5. Result
   └─ 📭 No notifications sent
```

### Third Run (New notice added)
```
1. Scrape notices from ERP
   ├─ Found: 16 notices
   └─ Previous: 15 notices

2. Identify new notices
   └─ New: 1 notice (ID: 12345 - Google)

3. Push to APIs
   ├─ /api/notices → Store 16 notices
   └─ /api/trigger-push → Send push for 1 notice

4. Save current state
   └─ prev_notices.json → 16 notices saved

5. Result
   └─ ✅ Users receive 1 notification
```

---

## 📁 File Structure

```
your-scraper-directory/
├── main.py                  # Modified scraper with change detection
├── prev_notices.json        # Previous scrape results (gitignored)
├── notices.json             # Current scrape results
├── .env                     # Configuration (API keys)
└── .gitignore              # Excludes prev_notices.json
```

---

## 🔑 Key Concepts

### Two Separate Endpoints

| Endpoint | Purpose | Data | Frequency |
|----------|---------|------|-----------|
| `/api/notices` | Store ALL notices | Full dataset | Every scrape |
| `/api/trigger-push` | Send notifications | NEW notices only | Only when changes detected |

### Why This Design?

1. **Storage** (`/api/notices`):
   - Next.js needs the COMPLETE dataset
   - Users browsing the site see all notices
   - Replaces entire database each time

2. **Notifications** (`/api/trigger-push`):
   - Only alerts about NEW notices
   - Prevents spam (no repeat notifications)
   - Users only notified about fresh content

---

## 🧪 Testing the System

### Test 1: Fresh Install
```bash
# First run - all notices are new
python main.py

Expected:
  📊 Notice Comparison:
     Previous count: 0
     Current count: 15
     🆕 New notices: 15

  🔔 Triggering web push notifications
     Sending 15 new notices
  ✅ Web push triggered successfully!
     Sent to 1 subscriptions
```

### Test 2: No Changes
```bash
# Second run - no changes
python main.py

Expected:
  📊 Notice Comparison:
     Previous count: 15
     Current count: 15
     🆕 New notices: 0

  📭 No new notices - skipping web push
```

### Test 3: Simulate New Notice
```bash
# Manually edit prev_notices.json - remove one notice
# Then run scraper
python main.py

Expected:
  📊 Notice Comparison:
     Previous count: 14
     Current count: 15
     🆕 New notices: 1

  🔔 Triggering web push notifications
     Sending 1 new notices
  ✅ Web push triggered successfully!
     Sent to 1 subscriptions
```

---

## 🚀 Production Deployment

### Scheduler Setup (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Run every 30 minutes
*/30 * * * * cd /path/to/scraper && /usr/bin/python3 main.py >> scraper.log 2>&1

# Run every hour
0 * * * * cd /path/to/scraper && /usr/bin/python3 main.py >> scraper.log 2>&1
```

### Scheduler Setup (Windows)

Use Task Scheduler:
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily
4. Action: Start a Program
   - Program: `python`
   - Arguments: `C:\path\to\scraper\main.py`
   - Start in: `C:\path\to\scraper`
5. Set to repeat every 30 minutes

---

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Noticeboard API (full notice content)
NOTICES_API_BASE=https://your-noticeboard-app.vercel.app
NOTICES_PUSH_KEY=your-noticeboard-api-key

# HeadsUp API (minimal data + push notifications)
HEADSUP_API_BASE=https://your-headsup-app.vercel.app
HEADSUP_PUSH_KEY=f708296cb8ad7c0379ec9bf30b4443aa263728c4

# ERP credentials
ERP_NOTICE_URL=https://erp.iitkgp.ac.in/...
```

---

## 📊 Monitoring

### Check Logs

```bash
# View recent scraper runs
tail -f scraper.log

# Count new notices in last 24 hours
grep "🆕 New notices:" scraper.log | tail -20

# Check push delivery success rate
grep "Web push triggered successfully" scraper.log | wc -l
```

### Verify Files

```bash
# Check current state
cat prev_notices.json | jq '.[] | {id, company, type}' | head -20

# Compare current vs previous
diff <(jq -r '.[].id' prev_notices.json | sort) \
     <(jq -r '.notices[].id' notices.json | sort)
```

---

## ❓ FAQ

**Q: What happens if `prev_notices.json` is deleted?**
A: All notices will be treated as "new" on next run. Users will receive notifications for all notices.

**Q: Can I manually trigger notifications?**
A: Yes, use the PowerShell/curl commands to call `/api/trigger-push` directly.

**Q: How do I reset the system?**
A: Delete `prev_notices.json` and restart the scraper.

**Q: What if the scraper fails mid-run?**
A: `prev_notices.json` is only updated at the END of a successful run. Failed runs won't corrupt state.

**Q: How many notifications will users receive?**
A: Only for NEW notices since the last successful scrape.

---

## 🎯 Summary

✅ **Scraper**: Detects changes, only alerts on NEW notices
✅ **Next.js**: Stores ALL notices, sends push for NEW ones only
✅ **Users**: Receive notifications only for fresh content
✅ **No Spam**: Repeat scrapes don't trigger repeat notifications

Perfect balance between keeping data fresh and avoiding notification fatigue! 🚀
