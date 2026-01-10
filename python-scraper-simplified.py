import os
import requests
import json
import re
import time
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import iitkgp_erp_login.erp as erp
import erpcreds
from urllib.parse import urlparse

load_dotenv()

# ============================================================================
# CONFIGURATION FOR BOTH APPS
# ============================================================================

# Noticeboard API (full notice content)
NOTICEBOARD_API = (os.getenv("NOTICES_API_BASE", "http://localhost:3000") or "").strip().rstrip("/").rstrip(":")
NOTICES_PUSH_KEY = (os.getenv("NOTICES_PUSH_KEY", "dev-key") or "").strip()

# HeadsUp API (minimal data - no notice content)
# HeadsUp now handles change detection and push notifications internally
HEADSUP_API = (os.getenv("HEADSUP_API_BASE", "http://localhost:3000") or "").strip().rstrip("/").rstrip(":")
HEADSUP_PUSH_KEY = (os.getenv("HEADSUP_PUSH_KEY", "dev-key") or "").strip()

# Asia/Kolkata timezone (IST - UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

print("="*70)
print("🔧 CONFIGURATION")
print("="*70)
print("NOTICEBOARD_API:", repr(NOTICEBOARD_API))
print("HEADSUP_API:", repr(HEADSUP_API))
print("="*70)


def push_to_noticeboard(notices_obj: dict) -> None:
    """
    POST the FULL notices JSON to Noticeboard API (includes notice_text).
    This app shows complete notice content.
    """
    url = f"{NOTICEBOARD_API}/api/notices"
    print(f"\n📤 Pushing to NOTICEBOARD: {url}")

    try:
        payload = json.dumps(notices_obj, ensure_ascii=False).encode('utf-8')

        r = requests.post(
            url,
            headers={
                "x-api-key": NOTICES_PUSH_KEY,
                "Content-Type": "application/json; charset=utf-8",
            },
            data=payload,
            timeout=30,
        )

        if not r.ok:
            print("⚠️ Status:", r.status_code)
            print("Body:", r.text[:500])
        r.raise_for_status()
        print(f"✅ Pushed to Noticeboard: {r.json()}")
    except Exception as e:
        print(f"⚠️ Could not push to Noticeboard: {e}")
        import traceback
        traceback.print_exc()


def push_to_headsup(notices_obj: dict) -> None:
    """
    POST MINIMAL notices JSON to HeadsUp API (NO notice_text).
    HeadsUp only shows: company, type, category, notice_time

    HeadsUp will automatically:
    - Detect new notices by comparing with previous data
    - Trigger push notifications for new notices only
    - Save all notices to storage
    """
    url = f"{HEADSUP_API}/api/notices"
    print(f"\n📤 Pushing to HEADSUP: {url}")

    try:
        # Create minimal payload for HeadsUp (remove notice_text and notice_by)
        headsup_notices = []
        for notice in notices_obj.get('notices', []):
            headsup_notices.append({
                'id': notice['id'],
                'type': notice['type'],
                'category': notice['category'],
                'company': notice['company'],
                # notice_text: EXCLUDED for HeadsUp
                # notice_by: EXCLUDED for HeadsUp
                'notice_time': notice['notice_time'],
            })

        headsup_payload = {
            'scraped_at': notices_obj['scraped_at'],
            'total_notices': len(headsup_notices),
            'notices': headsup_notices  # Minimal data only
        }

        payload = json.dumps(headsup_payload, ensure_ascii=False).encode('utf-8')

        r = requests.post(
            url,
            headers={
                "x-api-key": HEADSUP_PUSH_KEY,
                "Content-Type": "application/json; charset=utf-8",
            },
            data=payload,
            timeout=30,
        )

        if not r.ok:
            print("⚠️ Status:", r.status_code)
            print("Body:", r.text[:500])
        r.raise_for_status()

        result = r.json()
        print(f"✅ Pushed to HeadsUp: {result}")

        # Show push notification stats if available
        if result.get('new_notices', 0) > 0:
            print(f"   🔔 Triggered push for {result['new_notices']} new notice(s)")
        else:
            print(f"   📭 No new notices - push notifications skipped")

    except Exception as e:
        print(f"⚠️ Could not push to HeadsUp: {e}")
        import traceback
        traceback.print_exc()


headers = {
    "timeout": "20",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36",
}

ERP_NOTICE_URL = os.getenv("ERP_NOTICE_URL")


def ensure_login(session):
    """Ensures a valid ERP session"""
    if not erp.session_alive(session):
        sessionToken, ssoToken = erp.login(
            headers=headers,
            session=session,
            ERPCREDS=erpcreds,
            OTP_CHECK_INTERVAL=2,
            LOGGING=True,
            SESSION_STORAGE_FILE=".session",
        )
        return sessionToken, ssoToken
    else:
        return (
            session.cookies.get("JSESSIONID") or session.cookies.get("JSID#/IIT_ERP3"),
            session.cookies.get("ssoToken"),
        )


def scrape_notices_without_selenium(session):
    """
    Scrape notices WITHOUT Selenium by directly calling the AJAX endpoint.
    The endpoint returns XML format with <rows><row><cell> structure.
    """
    print("\n🔍 Scraping notices (requests-only method)...")

    try:
        # Step 1: Load the main page to establish session
        print(f"📄 Loading CDC notice page: {ERP_NOTICE_URL}")
        page_response = session.get(ERP_NOTICE_URL, headers=headers, timeout=30)
        page_response.raise_for_status()
        print(f"✅ Page loaded ({len(page_response.text)} bytes)")

        # Step 2: Wait a bit (like Selenium does) to ensure session is ready
        print("⏳ Waiting 2 seconds for session to stabilize...")
        time.sleep(2)

        # Step 3: Call the AJAX endpoint that jqGrid uses
        ajax_url = "https://erp.iitkgp.ac.in/TrainingPlacementSSO/ERPMonitoring.htm"

        print(f"📡 Requesting grid data from: {ajax_url}")

        # These are the parameters jqGrid sends
        ajax_params = {
            'action': 'fetchData',
            'jqqueryid': '54',
            '_search': 'false',
            'nd': int(datetime.now(IST).timestamp() * 1000),
            'rows': '10000',  # Request all rows at once
            'page': '1',
            'sidx': '',
            'sord': 'asc',
        }

        ajax_headers = {
            **headers,
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Referer": ERP_NOTICE_URL,
        }

        # Make the AJAX request
        ajax_response = session.post(ajax_url, data=ajax_params, headers=ajax_headers, timeout=30)

        if ajax_response.status_code != 200:
            print(f"⚠️ POST failed ({ajax_response.status_code}), trying GET...")
            ajax_response = session.get(ajax_url, params=ajax_params, headers=ajax_headers, timeout=30)

        ajax_response.raise_for_status()

        print(f"✅ Response received ({len(ajax_response.text)} bytes)")
        print(f"Content-Type: {ajax_response.headers.get('Content-Type')}")

        # Step 4: Parse the XML response
        return parse_xml_response(ajax_response.text)

    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        import traceback
        traceback.print_exc()
        return []
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return []


def parse_xml_response(xml_content):
    """
    Parse the XML response from jqGrid.
    Format: <rows><row id='...'><cell>value1</cell><cell>value2</cell>...</row></rows>
    """
    print("\n🔍 Parsing XML response...")

    try:
        # Parse as XML (not HTML)
        soup = BeautifulSoup(xml_content, 'xml')

        # Find all row elements
        rows = soup.find_all('row')

        if not rows:
            print("❌ No <row> elements found in XML")
            return []

        print(f"✅ Found {len(rows)} notice rows in XML")

        notices = []

        for idx, row in enumerate(rows, 1):
            # Get all cell values
            cells = row.find_all('cell')

            if len(cells) < 7:
                continue  # Skip incomplete rows

            # Extract cell values (order: id, type, category, company, notice, noticeby, noticeat)
            row_id = row.get('id', '')
            cell_values = [cell.get_text(strip=True) for cell in cells]

            # Parse notice text (may contain HTML)
            raw_notice = cell_values[4] if len(cell_values) > 4 else ''

            # Clean HTML from notice text
            if raw_notice and '<' in raw_notice:
                notice_soup = BeautifulSoup(raw_notice, 'html.parser')
                clean_notice = notice_soup.get_text(strip=True)
            else:
                clean_notice = raw_notice

            notice = {
                'id': cell_values[0] if len(cell_values) > 0 else row_id,
                'type': cell_values[1] if len(cell_values) > 1 else '',
                'category': cell_values[2] if len(cell_values) > 2 else '',
                'company': cell_values[3] if len(cell_values) > 3 else '',
                'notice_text': clean_notice,
                'notice_by': cell_values[5] if len(cell_values) > 5 else '',
                'notice_time': cell_values[6] if len(cell_values) > 6 else '',
            }

            if notice['id'] and notice['type']:
                notices.append(notice)
                if idx <= 5:
                    print(f"  {idx}. [{notice['type']}] {notice['company']} - {notice['category']}")

        return notices

    except Exception as e:
        print(f"❌ XML parsing failed: {e}")
        import traceback
        traceback.print_exc()
        return []


def save_notices_json(notices, filename='notices.json'):
    """Save CDC notices to JSON file (PLACEMENT + INTERNSHIP)"""

    # Filter PLACEMENT and INTERNSHIP notices
    notices = [n for n in notices if n.get('type') in ['PLACEMENT', 'INTERNSHIP']]

    # Get current time in IST
    now_ist = datetime.now(IST)

    data = {
        'scraped_at': now_ist.isoformat(),
        'total_notices': len(notices),
        'notices': notices
    }

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    placement_count = sum(1 for n in notices if n.get('type') == 'PLACEMENT')
    internship_count = sum(1 for n in notices if n.get('type') == 'INTERNSHIP')

    print(f"\n💾 Saved {len(notices)} CDC notices to {filename}")
    print(f"   📍 Placement: {placement_count}")
    print(f"   🎓 Internship: {internship_count}")
    print(f"   ⏰ Scraped at: {now_ist.strftime('%Y-%m-%d %H:%M:%S IST')}")
    return data


def display_summary(notices):
    """Display a summary of scraped CDC notices"""
    print("\n" + "="*70)
    print("📊 CDC NOTICE SUMMARY")
    print("="*70)

    total = len(notices)
    placement = sum(1 for n in notices if n.get('type') == 'PLACEMENT')
    internship = sum(1 for n in notices if n.get('type') == 'INTERNSHIP')
    other = total - placement - internship

    print(f"Total Notices Scraped: {total}")
    print(f"  📍 Placement: {placement}")
    print(f"  🎓 Internship: {internship}")
    if other > 0:
        print(f"  📄 Other: {other}")

    # Group CDC notices by category (both placement and internship)
    cdc_categories = {}
    for notice in notices:
        if notice.get('type') in ['PLACEMENT', 'INTERNSHIP']:
            cat = notice.get('category', 'Unknown')
            cdc_categories[cat] = cdc_categories.get(cat, 0) + 1

    if cdc_categories:
        print(f"\nCDC Notices by Category:")
        for cat, count in sorted(cdc_categories.items(), key=lambda x: x[1], reverse=True):
            print(f"  • {cat}: {count}")

    # Recent companies (placement and internship)
    recent_companies = [
        (n.get('company'), n.get('type'))
        for n in notices
        if n.get('type') in ['PLACEMENT', 'INTERNSHIP']
    ][:10]

    if recent_companies:
        print(f"\nRecent CDC Companies:")
        for i, (comp, ntype) in enumerate(recent_companies[:5], 1):
            print(f"  {i}. {comp} [{ntype}]")


def main():
    print("="*70)
    print("🎓 IIT KGP CDC DUAL APP SCRAPER")
    print("   📋 Noticeboard (Full Content)")
    print("   ⚡ HeadsUp (Alerts + Auto Push Notifications)")
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

    # Get current time in IST
    now_ist = datetime.now(IST)

    # Prepare FULL payload for Noticeboard (includes notice_text)
    noticeboard_payload = {
        'scraped_at': now_ist.isoformat(),
        'total_notices': len(current_notices),
        'notices': current_notices  # Full data with notice_text
    }

    # ============================================================================
    # PUSH TO BOTH APPS
    # ============================================================================

    print("\n" + "="*70)
    print("🚀 PUSHING TO BOTH APPS")
    print("="*70)

    # Push to Noticeboard (full content)
    push_to_noticeboard(noticeboard_payload)

    # Push to HeadsUp (minimal data - HeadsUp handles change detection & push)
    push_to_headsup(noticeboard_payload)

    # Save to JSON file (PLACEMENT + INTERNSHIP)
    save_notices_json(current_notices)

    # Final message
    print("\n" + "="*70)
    print("✅ SCRAPING COMPLETE!")
    print("="*70)
    print(f"\n📊 Statistics:")
    print(f"   Total notices: {len(current_notices)}")
    print(f"\n📁 Local file: notices.json (full data)")
    print(f"📋 Noticeboard: Full notices with content")
    print(f"⚡ HeadsUp: Minimal alerts + Auto push notifications")
    print(f"   ⏰ Timestamp: {now_ist.strftime('%Y-%m-%d %H:%M:%S IST')}")
    print(f"\n🎉 All systems updated! 🚀")
    print("\nℹ️  HeadsUp automatically detects new notices and sends push notifications")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
