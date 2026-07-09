"""
KORI Sales OS — Layer 1: Google Sheets CRM Sync
Pushes enriched leads into Google Sheets for tracking.
Also pulls any manual updates (contact names, email, status) back into local JSON.

Setup:
1. Create a Google Cloud project at console.cloud.google.com
2. Enable Google Sheets API
3. Create a Service Account and download the JSON key
4. Share your Google Sheet with the service account email
5. Set GOOGLE_SERVICE_ACCOUNT_JSON env var to the path of the key file
6. Set GOOGLE_SHEET_ID env var to your sheet ID (from the URL)

Run: python google_sheets_sync.py [--push | --pull | --sync]
"""

import json
import os
import logging
import argparse
from datetime import datetime
from pathlib import Path
from typing import Optional

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

DATA_DIR = Path(__file__).parent.parent / "data"

# Columns in the Google Sheet (order matters)
SHEET_COLUMNS = [
    "lead_score",
    "name",
    "license_type",
    "category",
    "domain",
    "urgency_score",
    "sequence",
    "aml_deadline_months",
    "roadmap_deadline",
    "outreach_status",
    "contact_name",
    "contact_email",
    "contact_linkedin",
    "last_contacted_at",
    "response_received",
    "demo_booked",
    "pilot_started",
    "closed_won",
    "closed_lost_reason",
    "outreach_hook",
    "enriched_at",
]

STATUS_COLORS = {
    "not_contacted": None,
    "contacted": {"backgroundColor": {"red": 1.0, "green": 0.95, "blue": 0.8}},  # yellow
    "responded": {"backgroundColor": {"red": 0.85, "green": 1.0, "blue": 0.85}},  # green
    "demo_booked": {"backgroundColor": {"red": 0.7, "green": 0.9, "blue": 1.0}},  # blue
    "pilot": {"backgroundColor": {"red": 0.9, "green": 0.75, "blue": 1.0}},  # purple
    "closed_won": {"backgroundColor": {"red": 0.6, "green": 1.0, "blue": 0.6}},  # dark green
    "closed_lost": {"backgroundColor": {"red": 1.0, "green": 0.8, "blue": 0.8}},  # red
}


def get_sheets_client():
    """Initialize Google Sheets API client."""
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        creds_path = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
        if not creds_path:
            raise ValueError("GOOGLE_SERVICE_ACCOUNT_JSON env var not set")

        creds = service_account.Credentials.from_service_account_file(
            creds_path,
            scopes=["https://www.googleapis.com/auth/spreadsheets"]
        )
        return build("sheets", "v4", credentials=creds)
    except ImportError:
        log.error("Missing dependencies. Run: pip install google-api-python-client google-auth")
        raise


def get_sheet_id() -> str:
    sheet_id = os.environ.get("GOOGLE_SHEET_ID")
    if not sheet_id:
        raise ValueError("GOOGLE_SHEET_ID env var not set")
    return sheet_id


def load_leads(path: Optional[str] = None) -> list[dict]:
    """Load enriched leads from local JSON."""
    p = Path(path) if path else DATA_DIR / "enriched_leads.json"
    with open(p) as f:
        return json.load(f)


def save_leads(leads: list[dict], path: Optional[str] = None) -> None:
    p = Path(path) if path else DATA_DIR / "enriched_leads.json"
    with open(p, "w") as f:
        json.dump(leads, f, indent=2)
    log.info(f"Saved {len(leads)} leads to {p}")


def push_to_sheets(leads: list[dict]) -> None:
    """Push all leads to Google Sheets (overwrites)."""
    service = get_sheets_client()
    sheet_id = get_sheet_id()
    sheets = service.spreadsheets()

    # Build header + data rows
    rows = [SHEET_COLUMNS]  # Header row
    for lead in leads:
        row = [str(lead.get(col, "")) for col in SHEET_COLUMNS]
        rows.append(row)

    # Clear and rewrite
    sheets.values().clear(
        spreadsheetId=sheet_id,
        range="Sheet1!A1:Z10000"
    ).execute()

    sheets.values().update(
        spreadsheetId=sheet_id,
        range="Sheet1!A1",
        valueInputOption="RAW",
        body={"values": rows}
    ).execute()

    log.info(f"Pushed {len(leads)} leads to Google Sheets")

    # Format header row
    sheets.batchUpdate(
        spreadsheetId=sheet_id,
        body={
            "requests": [
                {
                    "repeatCell": {
                        "range": {"sheetId": 0, "startRowIndex": 0, "endRowIndex": 1},
                        "cell": {
                            "userEnteredFormat": {
                                "backgroundColor": {"red": 0.2, "green": 0.2, "blue": 0.2},
                                "textFormat": {
                                    "foregroundColor": {"red": 1, "green": 1, "blue": 1},
                                    "bold": True
                                }
                            }
                        },
                        "fields": "userEnteredFormat(backgroundColor,textFormat)"
                    }
                },
                {
                    "updateSheetProperties": {
                        "properties": {"sheetId": 0, "gridProperties": {"frozenRowCount": 1}},
                        "fields": "gridProperties.frozenRowCount"
                    }
                }
            ]
        }
    ).execute()

    log.info("Applied formatting to header row")


def pull_from_sheets() -> list[dict]:
    """Pull data from Google Sheets back into local leads."""
    service = get_sheets_client()
    sheet_id = get_sheet_id()

    result = service.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range="Sheet1!A1:Z10000"
    ).execute()

    values = result.get("values", [])
    if not values:
        log.warning("No data in Google Sheet")
        return []

    headers = values[0]
    leads = []
    for row in values[1:]:
        # Pad row if shorter than headers
        row = row + [""] * (len(headers) - len(row))
        lead = dict(zip(headers, row))
        # Convert boolean strings
        for bool_col in ["response_received", "demo_booked", "pilot_started", "closed_won"]:
            if bool_col in lead:
                lead[bool_col] = lead[bool_col].lower() in ("true", "yes", "1")
        leads.append(lead)

    log.info(f"Pulled {len(leads)} leads from Google Sheets")
    return leads


def sync(leads_path: Optional[str] = None) -> None:
    """
    Bidirectional sync:
    1. Pull latest from Sheets (has manual updates)
    2. Merge with local enriched data
    3. Push back up
    """
    local_leads = load_leads(leads_path)
    log.info(f"Loaded {len(local_leads)} local leads")

    try:
        sheet_leads = pull_from_sheets()
        # Build lookup by institution name
        sheet_lookup = {l["name"]: l for l in sheet_leads if l.get("name")}

        # Merge: prefer sheet values for human-editable fields
        human_fields = [
            "contact_name", "contact_email", "contact_linkedin",
            "outreach_status", "last_contacted_at", "response_received",
            "demo_booked", "pilot_started", "closed_won", "closed_lost_reason",
            "notes"
        ]
        for lead in local_leads:
            if lead["name"] in sheet_lookup:
                sheet_version = sheet_lookup[lead["name"]]
                for field in human_fields:
                    if sheet_version.get(field):
                        lead[field] = sheet_version[field]

        log.info("Merged sheet data into local leads")
    except Exception as e:
        log.warning(f"Could not pull from sheets: {e}. Pushing local data only.")

    save_leads(local_leads, leads_path)
    push_to_sheets(local_leads)
    log.info("=== Sync complete ===")


def generate_summary_report(leads: list[dict]) -> dict:
    """Generate a pipeline summary for the daily briefing."""
    statuses = [l.get("outreach_status", "not_contacted") for l in leads]
    return {
        "total_leads": len(leads),
        "not_contacted": statuses.count("not_contacted"),
        "contacted": statuses.count("contacted"),
        "responded": statuses.count("responded"),
        "demo_booked": sum(1 for l in leads if l.get("demo_booked")),
        "pilot": statuses.count("pilot"),
        "closed_won": sum(1 for l in leads if l.get("closed_won")),
        "top_score_uncontacted": [
            l["name"] for l in leads
            if l.get("outreach_status") == "not_contacted"
        ][:5],
        "generated_at": datetime.utcnow().isoformat(),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="KORI Google Sheets CRM Sync")
    parser.add_argument("--push", action="store_true", help="Push local leads to Sheets")
    parser.add_argument("--pull", action="store_true", help="Pull Sheets data to local")
    parser.add_argument("--sync", action="store_true", help="Bidirectional sync")
    parser.add_argument("--summary", action="store_true", help="Print pipeline summary")
    parser.add_argument("--input", help="Path to enriched leads JSON")
    args = parser.parse_args()

    if args.push:
        leads = load_leads(args.input)
        push_to_sheets(leads)
    elif args.pull:
        leads = pull_from_sheets()
        save_leads(leads, args.input)
    elif args.sync:
        sync(args.input)
    elif args.summary:
        leads = load_leads(args.input)
        report = generate_summary_report(leads)
        print(json.dumps(report, indent=2))
    else:
        log.info("Use --push, --pull, --sync, or --summary")