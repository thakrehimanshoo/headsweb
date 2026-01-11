# 🔧 Push Notification Diagnostic Guide

## ❌ Current Issue: "still no notice"

**Root Cause Found:** `subscriptions.json` does not exist
**This means:** No active push subscriptions have been created yet
**Result:** Push notifications can't be sent because there's nowhere to send them to

---

## ✅ Step-by-Step Fix

### Step 1: Restart Next.js Dev Server

**IMPORTANT:** The service worker and API code have been updated. You MUST restart the server.

```bash
# 1. Stop the current server (Ctrl+C if running)
# 2. Start fresh
cd /home/user/headsweb
npm run dev
```

**Expected Output:**
```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

**Wait for:** "✓ Compiled" message before proceeding

---

### Step 2: Open in Browser (Chrome or Edge ONLY)

**Important:**
- ❌ Do NOT use Firefox (limited push support)
- ❌ Do NOT use Safari (limited push support)
- ✅ Use Chrome or Edge

1. Open a NEW Incognito/Private window (to avoid cache issues):
   - Chrome: `Ctrl + Shift + N`
   - Edge: `Ctrl + Shift + N`

2. Navigate to: **http://localhost:3000/placement**

3. Open Browser DevTools:
   - Press `F12` or `Ctrl + Shift + I`
   - Go to **Console** tab

---

### Step 3: Check for Service Worker Errors

**In the DevTools Console, run:**

```javascript
// Check if service workers are supported
console.log('SW Supported:', 'serviceWorker' in navigator);

// Check if notifications are supported
console.log('Notifications Supported:', 'Notification' in window);

// Check notification permission
console.log('Current Permission:', Notification.permission);

// Check for registered service workers
navigator.serviceWorker.getRegistrations().then(regs => {
    console.log('Registered Service Workers:', regs.length);
    regs.forEach((reg, i) => {
        console.log(`SW ${i+1}:`, reg.scope, 'Active:', !!reg.active);
    });
});

// Check for push subscription
navigator.serviceWorker.ready.then(reg => {
    return reg.pushManager.getSubscription();
}).then(sub => {
    console.log('Current Push Subscription:', sub ? 'EXISTS' : 'NONE');
    if (sub) console.log('Endpoint:', sub.endpoint.substring(0, 50) + '...');
});
```

**Expected Output:**
```
SW Supported: true
Notifications Supported: true
Current Permission: "default" (or "granted" if you already allowed)
Registered Service Workers: 1
SW 1: http://localhost:3000/ Active: true
Current Push Subscription: NONE
```

**If you see errors here, STOP and share the error messages.**

---

### Step 4: Find the "Enable Notifications" Button

**Look for the button in the UI:**
- Should be in the header area (top-right)
- Text: "Enable Notifications" with a bell icon
- Color: Should be visible (not hidden)

**If you DON'T see the button:**

1. Open DevTools Console
2. Run this to check if component is rendered:
   ```javascript
   document.querySelector('button').innerText
   ```

3. Check browser console for React errors

**If button is missing, there's a UI rendering issue - share screenshot**

---

### Step 5: Click "Enable Notifications" Button

**What should happen:**

1. Browser shows a permission dialog at the top:
   ```
   localhost wants to:
   ☐ Show notifications

   [Block] [Allow]
   ```

2. **IMPORTANT:** Click **"Allow"** (NOT "Block")

3. Button text changes from "Enable Notifications" to "Notifications On"

4. Check DevTools Console for success messages:
   ```
   ✅ Subscribed to push notifications
   Subscription endpoint: https://fcm.googleapis.com/fcm/send/...
   ```

**If permission dialog doesn't appear:**
- Click the 🔒 lock icon in address bar
- Go to Site Settings → Notifications
- Change from "Block" to "Allow"
- Refresh page and try again

---

### Step 6: Verify Subscription File Created

**On Windows (PowerShell):**
```powershell
Get-Content /home/user/headsweb/subscriptions.json | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

**On Linux/WSL:**
```bash
cat /home/user/headsweb/subscriptions.json
```

**Expected Output:**
```json
[
  {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "expirationTime": null,
    "keys": {
      "p256dh": "BHmzkq...",
      "auth": "Abc123..."
    },
    "subscribedAt": "2026-01-11T..."
  }
]
```

**If file doesn't exist:**
- Subscription failed to save
- Check Next.js server console for errors
- Share any error messages

---

### Step 7: Test with Manual Push

**PowerShell:**
```powershell
$headers = @{
    "x-api-key" = "f708296cb8ad7c0379ec9bf30b4443aa263728c4"
    "Content-Type" = "application/json"
}

$body = @{
    new_notices = @(
        @{
            id = "DIAGNOSTIC-TEST-001"
            type = "PLACEMENT"
            category = "Test Category"
            company = "Test Company"
            notice_time = "11-01-2026 16:00"
        }
    )
    count = 1
} | ConvertTo-Json -Depth 3

Invoke-WebRequest -Uri "http://localhost:3000/api/trigger-push" -Method POST -Headers $headers -Body $body
```

**Expected Response:**
```json
{
  "success": true,
  "sent": 1,
  "failed": 0
}
```

**Expected Next.js Server Logs:**
```
🔔 Manual push requested for 1 notice(s)
📱 Found 1 subscription(s)
  1. Endpoint: https://fcm.googleapis.com/fcm/send/...
📤 Sending push to: https://fcm.googleapis.com/fcm/send/...
✅ Push delivered! Status: 201
✅ Successfully sent to 1/1 subscriptions
```

**Expected on Desktop:**
- Notification popup appears!
- Title: "🎓 1 New CDC Notice!"
- Body: "Test Company - Test Category"

---

## 🔍 Common Issues & Fixes

### Issue 1: Permission dialog doesn't appear

**Cause:** Notification permission already denied

**Fix:**
1. Click 🔒 lock icon in address bar
2. Find "Notifications" setting
3. Change to "Allow"
4. Refresh page (`Ctrl + R`)
5. Try "Enable Notifications" button again

---

### Issue 2: Button click does nothing

**Cause:** JavaScript error or service worker not registered

**Check DevTools Console for errors:**
- Red error messages
- "Failed to register service worker"
- "VAPID key invalid"

**Fix:**
```bash
# Delete .next cache and restart
rm -rf /home/user/headsweb/.next
cd /home/user/headsweb
npm run dev
```

---

### Issue 3: Subscription saves but test fails

**Check Next.js server logs for:**
```
❌ Push failed for subscription!
Error: {
  message: "...",
  statusCode: XXX
}
```

**Common errors:**

| Status | Meaning | Fix |
|--------|---------|-----|
| 401 | VAPID key mismatch | Check .env.local keys |
| 404 | Invalid subscription | Delete subscriptions.json, re-subscribe |
| 410 | Subscription expired | Delete subscriptions.json, re-subscribe |

**Fix:**
```bash
# Delete subscription and re-subscribe
rm /home/user/headsweb/subscriptions.json
# Then click "Enable Notifications" in browser again
```

---

### Issue 4: Notification sent but not visible

**Check Windows Notification Settings:**

1. **Windows Notifications Enabled:**
   - Settings → System → Notifications & Actions
   - "Get notifications from apps and other senders" = ON

2. **Browser Notifications Enabled:**
   - Scroll down to Chrome/Edge
   - Ensure it's ON (not OFF)

3. **Focus Assist is OFF:**
   - Settings → System → Focus Assist
   - Select "Off" (not "Priority only" or "Alarms only")
   - Or click notification icon in taskbar → Right-click → Focus assist → Off

4. **Check Action Center:**
   - Press `Win + A`
   - Notifications should appear here even if popup dismissed

---

### Issue 5: "Service Worker registration failed"

**In DevTools Console:**
```
Failed to register a ServiceWorker: The script has an unsupported MIME type
```

**Fix:**
```bash
# Ensure public/sw.js exists
ls -la /home/user/headsweb/public/sw.js

# If missing, you need to create it again
```

**Verify sw.js is accessible:**
- Open: http://localhost:3000/sw.js
- Should see JavaScript code (not 404 error)

---

## 📋 Diagnostic Checklist

Run through this checklist and note where it fails:

- [ ] Next.js dev server running on port 3000
- [ ] Opened http://localhost:3000/placement in Chrome/Edge
- [ ] DevTools Console shows no errors
- [ ] Service Worker registered (1 registration found)
- [ ] "Enable Notifications" button visible in UI
- [ ] Clicked button → Browser permission dialog appeared
- [ ] Clicked "Allow" → Button changed to "Notifications On"
- [ ] `subscriptions.json` file created with valid data
- [ ] Manual test command returned Status 200
- [ ] Next.js logs show "✅ Push delivered! Status: 201"
- [ ] Desktop notification appeared
- [ ] Windows notification settings allow browser notifications
- [ ] Focus Assist is OFF

**WHERE DID IT FAIL?** Share the step number where the issue occurs.

---

## 🚨 Quick Diagnostic Commands

**Run these in order and share the output:**

```bash
# 1. Check if server is running
curl http://localhost:3000/api/notices 2>&1 | head -5

# 2. Check if subscriptions.json exists
ls -la /home/user/headsweb/subscriptions.json 2>&1

# 3. Check environment variables
grep VAPID /home/user/headsweb/.env.local

# 4. Check service worker file
ls -la /home/user/headsweb/public/sw.js

# 5. Test service worker URL
curl http://localhost:3000/sw.js 2>&1 | head -5
```

**PowerShell diagnostic:**
```powershell
# Test if server is responding
Invoke-WebRequest -Uri "http://localhost:3000/" | Select-Object StatusCode

# Check if subscriptions file exists
Test-Path "\\wsl$\Ubuntu\home\user\headsweb\subscriptions.json"
```

---

## 💡 What to Share for Help

If still stuck, share:

1. **Output of diagnostic commands above**
2. **Screenshot of browser DevTools Console** (after clicking "Enable Notifications")
3. **Next.js server logs** (from terminal where `npm run dev` is running)
4. **Screenshot of the UI** (showing if button is visible)
5. **Windows notification settings** (Settings → System → Notifications)

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ `subscriptions.json` exists with valid subscription data
2. ✅ Manual test command shows "sent": 1, "failed": 0
3. ✅ Server logs show "✅ Push delivered! Status: 201"
4. ✅ Desktop notification popup appears
5. ✅ Notification visible in Windows Action Center (Win + A)

After this works, your Python scraper will automatically trigger notifications for new notices!
