# Python Scraper Modifications for Change Detection

## Changes Required

Add these functions and modify the main() function in your scraper to only push NEW notices for web push notifications.

---

## 1. Add Constants (after imports, before CONFIGURATION section)

```python
# File to store previous notices for comparison
PREV_NOTICES_FILE = "prev_notices.json"
```

---

## 2. Add These Functions (after push_to_headsup function)

```python
def load_previous_notices():
    """Load previously scraped notices from file"""
    if os.path.exists(PREV_NOTICES_FILE):
        try:
            with open(PREV_NOTICES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Handle both old format (list) and new format (dict)
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict) and 'notices' in data:
                    return data['notices']
                return data
        except Exception as e:
            print(f"⚠️ Error loading previous notices: {e}")
            return []
    return []


def save_current_notices(notices):
    """Save current notices for next comparison"""
    try:
        with open(PREV_NOTICES_FILE, 'w', encoding='utf-8') as f:
            json.dump(notices, f, ensure_ascii=False, indent=2)
        print(f"💾 Saved {len(notices)} notices to {PREV_NOTICES_FILE}")
    except Exception as e:
        print(f"⚠️ Error saving notices: {e}")


def get_new_notices(current_notices, previous_notices):
    """Compare current and previous notices, return only new ones"""
    # Create a set of previous notice IDs for fast lookup
    prev_ids = {n.get('id') for n in previous_notices if n.get('id')}

    # Find notices that are in current but not in previous
    new_notices = [n for n in current_notices if n.get('id') not in prev_ids]

    print(f"\n📊 Notice Comparison:")
    print(f"   Previous count: {len(previous_notices)}")
    print(f"   Current count: {len(current_notices)}")
    print(f"   🆕 New notices: {len(new_notices)}")

    if new_notices:
        print(f"\n🎯 New Notices Found:")
        for i, notice in enumerate(new_notices[:5], 1):
            print(f"   {i}. [{notice.get('type')}] {notice.get('company')} - {notice.get('category')}")
        if len(new_notices) > 5:
            print(f"   ... and {len(new_notices) - 5} more")

    return new_notices


def trigger_web_push(new_notices):
    """Trigger web push notifications for new notices"""
    if not new_notices:
        print("\n📭 No new notices - skipping web push")
        return

    url = f"{HEADSUP_API}/api/trigger-push"
    print(f"\n🔔 Triggering web push notifications: {url}")
    print(f"   Sending {len(new_notices)} new notices")

    try:
        payload = {
            'new_notices': new_notices,
            'count': len(new_notices)
        }

        r = requests.post(
            url,
            headers={
                "x-api-key": HEADSUP_PUSH_KEY,
                "Content-Type": "application/json; charset=utf-8",
            },
            json=payload,
            timeout=30,
        )

        if not r.ok:
            print(f"⚠️ Push trigger failed: {r.status_code}")
            print("Body:", r.text[:500])
        else:
            result = r.json()
            print(f"✅ Web push triggered successfully!")
            print(f"   Sent to {result.get('sent', 0)} subscriptions")

    except Exception as e:
        print(f"⚠️ Could not trigger web push: {e}")
        import traceback
        traceback.print_exc()
```

---

## 3. Replace the main() Function

Replace your entire `main()` function with this version:

```python
def main():
    print("="*70)
    print("🎓 IIT KGP CDC DUAL APP SCRAPER")
    print("   📋 Noticeboard (Full Content) + ⚡ HeadsUp (Alerts Only)")
    print("   🔔 With Web Push Notifications")
    print("="*70)

    # Show current IST time
    now_ist = datetime.now(IST)
    print(f"⏰ Current Time (IST): {now_ist.strftime('%Y-%m-%d %H:%M:%S')}")

    # Initialize session
    session = requests.Session()

    print("\n🔐 Logging into ERP...")
    sessionToken, ssoToken = ensure_login(session)
    print(f"✅ Login successful! Session ID: {sessionToken[:20]}...")

    # Scrape notices
    print("\n" + "="*70)
    print("🔍 SCRAPING CDC NOTICES")
    print("="*70)

    notices = scrape_notices_without_selenium(session)

    if not notices:
        print("\n❌ No notices found!")
        print("\nPossible reasons:")
        print("  • Notice board is empty")
        print("  • Access permissions issue")
        print("  • Page structure changed")
        return

    # Display summary
    display_summary(notices)

    # Filter PLACEMENT + INTERNSHIP notices
    current_notices = [n for n in notices if n.get('type') in ['PLACEMENT', 'INTERNSHIP']]

    # ============================================================================
    # CHANGE DETECTION - NEW!
    # ============================================================================

    # Load previous notices
    previous_notices = load_previous_notices()

    # Get NEW notices only
    new_notices = get_new_notices(current_notices, previous_notices)

    # Save current as previous for next run
    save_current_notices(current_notices)

    # ============================================================================
    # PUSH TO APIS
    # ============================================================================

    now_ist = datetime.now(IST)

    # Prepare FULL payload for Noticeboard (includes notice_text)
    noticeboard_payload = {
        'scraped_at': now_ist.isoformat(),
        'total_notices': len(current_notices),
        'notices': current_notices  # Full data with notice_text
    }

    print("\n" + "="*70)
    print("🚀 PUSHING TO BOTH APPS")
    print("="*70)

    # Push ALL notices to Noticeboard (full content)
    push_to_noticeboard(noticeboard_payload)

    # Push ALL notices to HeadsUp (minimal data - no notice content)
    push_to_headsup(noticeboard_payload)  # Function will strip out notice_text

    # ============================================================================
    # TRIGGER WEB PUSH - NEW!
    # ============================================================================

    # Trigger web push ONLY for NEW notices
    if new_notices:
        trigger_web_push(new_notices)

    # Save to JSON file (PLACEMENT + INTERNSHIP)
    save_notices_json(current_notices)

    # Final message
    print("\n" + "="*70)
    print("✅ SCRAPING COMPLETE!")
    print("="*70)
    print(f"\n📊 Statistics:")
    print(f"   Total notices: {len(current_notices)}")
    print(f"   🆕 New notices: {len(new_notices)}")
    print(f"   🔔 Push sent: {'Yes' if new_notices else 'No'}")
    print(f"\n📁 Local file: notices.json (full data)")
    print(f"📋 Noticeboard: Full notices with content")
    print(f"⚡ HeadsUp: Minimal alerts (no content)")
    print(f"   ⏰ Timestamp: {now_ist.strftime('%Y-%m-%d %H:%M:%S IST')}")
    print(f"\n🎉 All systems updated! 🚀")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
```

---

## 4. Add to .gitignore

Add this line to your scraper's `.gitignore`:

```
prev_notices.json
```

---

## Summary of Changes

### What Changed:
1. **Added `PREV_NOTICES_FILE`** - Stores previous scrape results
2. **Added `load_previous_notices()`** - Loads last scrape data
3. **Added `save_current_notices()`** - Saves current scrape for next time
4. **Added `get_new_notices()`** - Compares current vs previous notices
5. **Added `trigger_web_push()`** - Sends push notifications for new notices only
6. **Modified `main()`** - Implements change detection workflow

### How It Works:
1. **First Run**: All notices are "new" → Push notifications sent for all
2. **Subsequent Runs**: Only NEW notices trigger push notifications
3. **API Storage**: ALL notices are still sent to `/api/notices` (for storage)
4. **Web Push**: ONLY new notices sent to `/api/trigger-push` (for notifications)

### Files Created:
- `prev_notices.json` - Tracks previous scrape (gitignored)

---

## Testing

After making these changes:

1. **First run**: Should trigger notifications for all notices
2. **Second run (no changes)**: Should show "No new notices - skipping web push"
3. **Third run (with new notices)**: Should only notify about new ones

Example output:
```
📊 Notice Comparison:
   Previous count: 15
   Current count: 16
   🆕 New notices: 1

🎯 New Notices Found:
   1. [PLACEMENT] Google - Core

🔔 Triggering web push notifications
   Sending 1 new notices
✅ Web push triggered successfully!
   Sent to 1 subscriptions
```
