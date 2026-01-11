# 🔔 Push Notification Setup & Troubleshooting

## ✅ Current Status

**What's Working:**
- ✅ VAPID keys configured in `.env.local`
- ✅ Service Worker (`public/sw.js`) implemented
- ✅ Push notification API routes created
- ✅ Change detection in `/api/notices` working
- ✅ Enhanced error logging added

**What's Missing:**
- ❌ No active push subscriptions (subscriptions.json doesn't exist)

---

## 🔍 Root Cause: "Push sent to 0/1 subscriptions"

The issue occurs because there are **no active push subscriptions** saved in `subscriptions.json`.

When the scraper sends new notices:
1. ✅ New notices are detected correctly
2. ✅ Push notification trigger is initiated
3. ❌ No subscriptions found → Nothing to send to
4. ❌ Result: "Push sent to 0/1 subscriptions"

---

## 🚀 How to Fix: Create a Push Subscription

### Step 1: Start the Next.js Development Server

```bash
cd /home/user/headsweb
npm run dev
```

**Expected output:**
```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
- Ready in XXXms
```

### Step 2: Open in Browser

**Important:** Use Chrome, Edge, or Firefox (not Safari on macOS < 16)

1. Open: http://localhost:3000/placement
2. You should see the HeadsUp! CDC Noticeboard

### Step 3: Enable Notifications

1. Look for the **"Enable Notifications"** button in the header (top-right area)
2. Click the button
3. Browser will show a permission prompt:
   ```
   localhost wants to:
   ☐ Show notifications

   [Block] [Allow]
   ```
4. Click **"Allow"**

### Step 4: Verify Subscription Created

Check if `subscriptions.json` was created:

```bash
ls -la subscriptions.json
cat subscriptions.json
```

**Expected output:**
```json
[
  {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "expirationTime": null,
    "keys": {
      "p256dh": "...",
      "auth": "..."
    },
    "subscribedAt": "2026-01-11T..."
  }
]
```

---

## 🧪 Testing Push Notifications

### Test 1: Manual Test (PowerShell/CMD)

```powershell
$headers = @{
    "x-api-key" = "f708296cb8ad7c0379ec9bf30b4443aa263728c4"
    "Content-Type" = "application/json"
}

$body = @{
    new_notices = @(
        @{
            id = "TEST123"
            type = "PLACEMENT"
            category = "Core"
            company = "Test Company"
            notice_time = "11-01-2026 14:30"
        }
    )
    count = 1
} | ConvertTo-Json -Depth 3

Invoke-WebRequest -Uri "http://localhost:3000/api/trigger-push" -Method POST -Headers $headers -Body $body
```

**Expected Response:**
```
StatusCode: 200
Content: {"success":true,"sent":1,"failed":0}
```

**Expected Notification:**
You should see a Windows notification pop-up:
```
🎓 1 New CDC Notice!
Test Company - Core
```

### Test 2: Run Scraper

```bash
cd /path/to/your/python-scraper
python main.py
```

**Expected HeadsUp Logs** (with enhanced logging):
```
📥 Received X notices from scraper
📊 Previous: Y | Current: X
🆕 Found Z new notice(s)
🔔 Triggering push for Z new notice(s)
📱 Sending to 1 subscription(s)

📤 Sending push to: https://fcm.googleapis.com/fcm/send/...
✅ Push delivered! Status: 201
✅ Push sent to 1/1 subscriptions
```

---

## 🔧 Troubleshooting

### Issue 1: "Enable Notifications" button not visible

**Solution:**
```bash
# Check if NotificationButton is imported in PlacementNoticeboard
grep -n "NotificationButton" app/placement/PlacementNoticeboard.tsx
```

Should show:
```typescript
import NotificationButton from "@/app/components/NotificationButton";
// ...
<NotificationButton />
```

### Issue 2: Browser blocks permission prompt

**Chrome/Edge:**
1. Click the 🔒 lock icon in address bar
2. Go to Site Settings → Notifications
3. Change to "Allow"
4. Refresh page and try again

**Firefox:**
1. Click the 🔒 lock icon
2. Click "Connection Secure" → More Information
3. Permissions → Notifications → Allow

### Issue 3: Service Worker not registering

**Check Console:**
```javascript
// In Browser DevTools Console
navigator.serviceWorker.getRegistrations().then(regs => {
    console.log('Service Workers:', regs);
    regs.forEach(reg => console.log('SW:', reg.scope));
});
```

**Expected:**
```
Service Workers: [ServiceWorkerRegistration]
SW: http://localhost:3000/
```

**If empty, manually register:**
1. Stop Next.js server
2. Delete `.next` folder: `rm -rf .next`
3. Restart: `npm run dev`
4. Hard refresh browser: Ctrl+Shift+R (or Cmd+Shift+R)

### Issue 4: Push fails with error (after enhanced logging)

**Check Next.js server logs for:**

```
❌ Push failed for subscription!
Error: {
  message: "...",
  statusCode: XXX,
  endpoint: "..."
}
```

**Common errors:**

| Status Code | Cause | Solution |
|-------------|-------|----------|
| 410 | Subscription expired | User must re-subscribe |
| 404 | Invalid subscription | Delete subscriptions.json, re-subscribe |
| 401 | VAPID key mismatch | Check .env.local keys match |
| 400 | Invalid payload | Check notification data format |

### Issue 5: Notification sent but not visible

**Windows 10/11:**
1. Open Settings → System → Notifications
2. Ensure "Get notifications from apps and other senders" is ON
3. Scroll down to browser (Chrome/Edge/Firefox)
4. Ensure notifications are enabled
5. Check Focus Assist is OFF (Win+A → Focus assist → Off)

**Check notification in browser:**
```javascript
// Browser DevTools Console
Notification.requestPermission().then(console.log);
// Should show: "granted"
```

---

## 📋 Complete Setup Checklist

- [ ] VAPID keys in `.env.local` ✅ (Already done)
- [ ] Service Worker in `public/sw.js` ✅ (Already done)
- [ ] API routes created ✅ (Already done)
- [ ] Enhanced logging added ✅ (Already done)
- [ ] Next.js dev server running (`npm run dev`)
- [ ] Browser notification permission granted
- [ ] `subscriptions.json` file created
- [ ] Test notification sent successfully
- [ ] Python scraper triggers notifications

---

## 🎯 Next Steps

1. **Start dev server:** `npm run dev`
2. **Open browser:** http://localhost:3000/placement
3. **Click:** "Enable Notifications" button
4. **Grant:** Browser permission
5. **Test:** Run manual test (PowerShell command above)
6. **Verify:** See notification pop-up
7. **Deploy:** Run Python scraper to test real notifications

---

## 📊 Expected Workflow

```
┌─────────────────────────────────────────────────────────┐
│  User clicks "Enable Notifications"                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Browser asks permission│
         │ [Allow] [Block]       │
         └───────────┬───────────┘
                     │ (Allow)
                     ▼
         ┌───────────────────────────┐
         │ useWebPush.subscribe()    │
         │ • Register service worker │
         │ • Get push subscription   │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │ POST /api/subscribe       │
         │ • Save to subscriptions.json│
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │ ✅ Ready for notifications!│
         └───────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Python scraper runs (finds new notices)                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │ POST /api/notices         │
         │ • Compare with previous   │
         │ • Detect new notices      │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │ triggerPushNotifications()│
         │ • Load subscriptions      │
         │ • Send via web-push       │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │ FCM delivers to browser   │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │ Service Worker shows      │
         │ notification popup        │
         └───────────────────────────┘
```

---

## 🔍 Enhanced Logging Output

With the latest changes, you'll now see detailed logs:

**Success case:**
```
📤 Sending push to: https://fcm.googleapis.com/fcm/send/...
✅ Push delivered! Status: 201
✅ Push sent to 1/1 subscriptions
```

**Failure case:**
```
📤 Sending push to: https://fcm.googleapis.com/fcm/send/...
❌ Push failed for subscription!
Error: {
  message: "push subscription has unsubscribed or expired",
  statusCode: 410,
  endpoint: "https://fcm.googleapis.com/fcm/send/..."
}
🗑️ Subscription expired or invalid
✅ Push sent to 0/1 subscriptions
```

This will help you identify exactly why notifications are failing.

---

## ✅ Summary

**The fix is simple:**
1. Ensure Next.js dev server is running
2. Open app in browser
3. Click "Enable Notifications" and grant permission
4. This creates `subscriptions.json`
5. Test with manual PowerShell command
6. Run Python scraper for real notifications

The enhanced error logging will now show you exactly what's happening with each push attempt! 🚀
