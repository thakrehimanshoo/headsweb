# 🔔 Enable Notifications When Browser is Closed

## Overview

By default, **web push notifications only work when the browser is open**. However, Chrome and Edge can be configured to continue running in the background, allowing notifications even when all browser windows are closed.

**Important:** Firefox does NOT support background notifications - the browser must be running.

---

## ✅ Chrome/Edge - Enable Background Mode

### Windows 10/11

#### Method 1: Chrome Settings (Recommended)

1. **Open Chrome Settings:**
   - Click the three-dot menu (⋮) in the top-right
   - Go to **Settings**
   - Or visit: `chrome://settings/`

2. **Navigate to System:**
   - Scroll down and click **"Advanced"** (or it might already be expanded)
   - Click **"System"**

3. **Enable Background Apps:**
   - Find the option: **"Continue running background apps when Google Chrome is closed"**
   - Toggle it **ON** (blue/enabled)

4. **Restart Chrome:**
   - Close ALL Chrome windows completely
   - Chrome will now keep running in the background (you'll see its icon in the system tray)

#### Method 2: Edge Settings

For Microsoft Edge, the process is similar:

1. Open Edge Settings: `edge://settings/system`
2. Enable: **"Continue running background apps when Microsoft Edge is closed"**
3. Restart Edge

### Verify Background Mode is Working

**Windows System Tray:**
- After closing all browser windows, check the system tray (bottom-right corner, near the clock)
- You should see the Chrome/Edge icon still running
- Right-click the icon → "Exit" to fully close the browser

**Check Running Processes:**
```powershell
# Check if Chrome is running in background
Get-Process -Name "chrome" -ErrorAction SilentlyContinue

# Check if Edge is running in background
Get-Process -Name "msedge" -ErrorAction SilentlyContinue
```

If you see processes listed even after closing all windows, background mode is working!

---

## 📱 How Background Notifications Work

### With Background Mode Enabled:

```
┌─────────────────────────────────────┐
│  User closes all browser windows    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Browser stays running in system    │
│  tray (background process)          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Service Worker stays active        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Python scraper detects new notices │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Push notification sent to browser  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  ✅ Notification appears on desktop!│
│  (Even with no browser windows open)│
└─────────────────────────────────────┘
```

### Without Background Mode:

```
┌─────────────────────────────────────┐
│  User closes all browser windows    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Browser completely exits           │
│  ❌ No background process            │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Service Worker stops               │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Python scraper sends notification  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  ❌ Notification LOST - no browser  │
│  running to receive it              │
└─────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Issue 1: Background mode toggle is missing

**Chrome Managed by Organization:**
If you see "Managed by your organization", your IT admin may have disabled this feature.

**Solution:**
- Use Chrome Canary or ungoverned Chrome installation
- Or contact your IT department to enable background apps policy

### Issue 2: Browser doesn't stay in system tray

**Check Windows Startup:**
1. Press `Win + R` → type `shell:startup` → Press Enter
2. You can add a Chrome/Edge shortcut here to auto-start on Windows boot

**Check Task Manager:**
1. Press `Ctrl + Shift + Esc` to open Task Manager
2. Go to "Startup" tab
3. Ensure Chrome/Edge is "Enabled"

### Issue 3: Windows kills background processes

**Windows 10/11 Battery Saver:**
- Battery Saver mode can terminate background processes
- Disable Battery Saver: Settings → System → Battery → Battery Saver: Off

**Windows Power Settings:**
1. Settings → System → Power & Sleep
2. Click "Additional power settings"
3. Select "High performance" or "Balanced" (not "Power saver")

### Issue 4: Still not receiving notifications when closed

**Check Windows Notification Settings:**
1. Settings → System → Notifications & Actions
2. Ensure "Get notifications from apps and other senders" is ON
3. Scroll to Chrome/Edge → Ensure it's ON
4. **Turn OFF Focus Assist**: Settings → System → Focus Assist → Off

**Test the setup:**
```powershell
# 1. Close all Chrome windows
# 2. Run this test notification command
$headers = @{
    "x-api-key" = "f708296cb8ad7c0379ec9bf30b4443aa263728c4"
    "Content-Type" = "application/json"
}

$body = @{
    new_notices = @(
        @{
            id = "TEST-BACKGROUND"
            type = "PLACEMENT"
            category = "Background Test"
            company = "Background Mode Test"
            notice_time = "11-01-2026 15:00"
        }
    )
    count = 1
} | ConvertTo-Json -Depth 3

Invoke-WebRequest -Uri "http://localhost:3000/api/trigger-push" -Method POST -Headers $headers -Body $body
```

**Expected:** Notification appears even with all browser windows closed!

---

## 🌐 Browser Compatibility

| Browser | Background Notifications | Requirement |
|---------|-------------------------|-------------|
| Chrome (Windows) | ✅ YES | Enable "Continue running background apps" |
| Chrome (macOS) | ⚠️ LIMITED | Browser must be running (even minimized) |
| Chrome (Linux) | ⚠️ LIMITED | Browser must be running |
| Edge (Windows) | ✅ YES | Enable "Continue running background apps" |
| Edge (macOS) | ⚠️ LIMITED | Browser must be running |
| Firefox | ❌ NO | Browser MUST be open - no background support |
| Safari | ⚠️ LIMITED | macOS 13+ only, browser must be running |

---

## 💡 Best Practices

### For Maximum Notification Reliability:

1. **Enable Background Mode** (Chrome/Edge on Windows)
2. **Keep browser minimized** instead of closing (works on all platforms)
3. **Add to Windows Startup** for automatic background start
4. **Disable Focus Assist** during work hours
5. **Test regularly** with the PowerShell command above

### Alternative: Keep Browser Window Open

If background mode doesn't work:
- Keep one browser tab open (can be minimized)
- Pin the HeadsUp tab so it doesn't accidentally close
- Use a browser extension to prevent tab sleep

---

## 🚀 Quick Setup Checklist

For notifications even when browser is closed (Windows only):

- [ ] Using Chrome or Edge (not Firefox)
- [ ] Opened Chrome Settings → System
- [ ] Enabled "Continue running background apps when Chrome is closed"
- [ ] Restarted Chrome completely
- [ ] Closed all windows - Chrome icon still in system tray
- [ ] Windows notifications enabled for browser
- [ ] Focus Assist is OFF
- [ ] Tested with PowerShell command - notification received!

---

## 📊 Alternative Solutions

### Option 1: Desktop Application

For true always-on notifications (no browser required):
- Build an Electron app wrapper around HeadsUp
- Use native push notifications (Windows Notification Center)
- Auto-starts with Windows

### Option 2: Mobile App

- Progressive Web App (PWA) with mobile push
- Android: Chrome supports persistent background notifications
- iOS: Limited support (requires app to be "installed")

### Option 3: Email/SMS Notifications

- Modify Python scraper to also send email/SMS
- More reliable than browser push (always delivered)
- Requires email service (SendGrid, AWS SES) or SMS service (Twilio)

---

## ✅ Summary

**Windows Chrome/Edge Users:**
1. Enable "Continue running background apps" in browser settings
2. Close all windows - browser stays in system tray
3. Notifications work even when browser appears closed! ✨

**All Other Users:**
- Keep at least one browser window open (can be minimized)
- Notifications will work while browser is running

**The notification tag collision fix** (unique tags) ensures you'll receive **ALL** notifications, not just the latest one!
