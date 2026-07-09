"""
KORI Sales OS — Layer 1: CBN Registry Scraper
Pulls all CBN-licensed institutions and outputs a structured lead list.
Run: python cbn_registry_scraper.py
Output: data/cbn_leads_raw.json + data/cbn_leads_raw.csv
"""

import json
import csv
import time
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Optional
import requests
from bs4 import BeautifulSoup

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("scraper.log")]
)
log = logging.getLogger(__name__)

OUTPUT_DIR = Path(__file__).parent.parent / "data"
OUTPUT_DIR.mkdir(exist_ok=True)

# CBN pages that list licensed institutions
CBN_SOURCES = [
    {
        "category": "Deposit Money Banks",
        "url": "https://www.cbn.gov.ng/supervision/Inst-DM.asp",
        "license_type": "DMB",
        "priority": 1,
    },
    {
        "category": "Payment Service Providers",
        "url": "https://www.cbn.gov.ng/supervision/PSP.asp",
        "license_type": "PSP",
        "priority": 1,
    },
    {
        "category": "Mobile Money Operators",
        "url": "https://www.cbn.gov.ng/supervision/MMO.asp",
        "license_type": "MMO",
        "priority": 1,
    },
    {
        "category": "Microfinance Banks",
        "url": "https://www.cbn.gov.ng/supervision/MFB.asp",
        "license_type": "MFB",
        "priority": 2,
    },
    {
        "category": "Finance Companies",
        "url": "https://www.cbn.gov.ng/supervision/FC.asp",
        "license_type": "FC",
        "priority": 2,
    },
    {
        "category": "Primary Mortgage Banks",
        "url": "https://www.cbn.gov.ng/supervision/PMB.asp",
        "license_type": "PMB",
        "priority": 2,
    },
    {
        "category": "Development Finance Institutions",
        "url": "https://www.cbn.gov.ng/supervision/DFI.asp",
        "license_type": "DFI",
        "priority": 3,
    },
]

# Known VASPs from CBN pilot (from press release — highest priority)
KNOWN_VASPS = [
    {"name": "Flutterwave", "license_type": "VASP", "priority": 0, "source": "CBN_PILOT", "website": "flutterwave.com"},
    {"name": "Paystack", "license_type": "VASP", "priority": 0, "source": "CBN_PILOT", "website": "paystack.com"},
    {"name": "Yellow Card", "license_type": "VASP", "priority": 0, "source": "CBN_PILOT", "website": "yellowcard.io"},
    {"name": "Quidax", "license_type": "VASP", "priority": 0, "source": "CBN_PILOT", "website": "quidax.com"},
    {"name": "Busha", "license_type": "VASP", "priority": 0, "source": "CBN_PILOT", "website": "busha.co"},
    {"name": "KuCoin Nigeria", "license_type": "VASP", "priority": 0, "source": "CBN_PILOT", "website": "kucoin.com"},
    {"name": "Luno Nigeria", "license_type": "VASP", "priority": 0, "source": "CBN_PILOT", "website": "luno.com"},
    {"name": "OPay", "license_type": "MMO", "priority": 0, "source": "CBN_PILOT", "website": "opayweb.com"},
    {"name": "Moniepoint", "license_type": "MMO", "priority": 0, "source": "CBN_PILOT", "website": "moniepoint.com"},
    {"name": "PalmPay", "license_type": "MMO", "priority": 0, "source": "CBN_PILOT", "website": "palmpay.com"},
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; KORIResearchBot/1.0; +https://kori.seamount.io)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def fetch_page(url: str, retries: int = 3) -> Optional[BeautifulSoup]:
    """Fetch a page with retry logic and exponential backoff."""
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            resp.raise_for_status()
            return BeautifulSoup(resp.text, "html.parser")
        except requests.RequestException as e:
            wait = 2 ** attempt
            log.warning(f"Attempt {attempt+1} failed for {url}: {e}. Retrying in {wait}s...")
            time.sleep(wait)
    log.error(f"All retries exhausted for {url}")
    return None


def extract_institutions_from_page(soup: BeautifulSoup, source_meta: dict) -> list[dict]:
    """
    Extract institution records from CBN listing pages.
    CBN pages vary in structure — this handles the most common patterns.
    """
    institutions = []

    # Pattern 1: Table-based listings (most common on CBN site)
    tables = soup.find_all("table")
    for table in tables:
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue

        headers = [th.get_text(strip=True).lower() for th in rows[0].find_all(["th", "td"])]
        if not any(keyword in " ".join(headers) for keyword in ["name", "bank", "institution", "company"]):
            continue

        for row in rows[1:]:
            cells = row.find_all("td")
            if len(cells) < 2:
                continue

            name = cells[0].get_text(strip=True)
            if not name or len(name) < 3:
                continue

            # Try to extract state/location if available
            location = ""
            if len(cells) > 1:
                location = cells[1].get_text(strip=True)

            # Try to find website link in the row
            link = row.find("a")
            website = ""
            if link and link.get("href", "").startswith("http"):
                website = link["href"]

            institutions.append({
                "name": name,
                "license_type": source_meta["license_type"],
                "category": source_meta["category"],
                "location": location,
                "website": website,
                "priority": source_meta["priority"],
                "source": "CBN_REGISTRY",
                "scraped_at": datetime.utcnow().isoformat(),
                "aml_deadline_months": 18 if source_meta["license_type"] == "DMB" else 24,
                "cbk_also": False,
            })

    # Pattern 2: Unordered list of institution names
    if not institutions:
        for ul in soup.find_all("ul"):
            items = ul.find_all("li")
            for item in items:
                name = item.get_text(strip=True)
                if name and len(name) > 3 and any(c.isupper() for c in name):
                    institutions.append({
                        "name": name,
                        "license_type": source_meta["license_type"],
                        "category": source_meta["category"],
                        "location": "",
                        "website": "",
                        "priority": source_meta["priority"],
                        "source": "CBN_REGISTRY",
                        "scraped_at": datetime.utcnow().isoformat(),
                        "aml_deadline_months": 18 if source_meta["license_type"] == "DMB" else 24,
                        "cbk_also": False,
                    })

    log.info(f"Extracted {len(institutions)} from {source_meta['category']}")
    return institutions


def deduplicate(institutions: list[dict]) -> list[dict]:
    """Remove duplicates by normalizing institution names."""
    seen = set()
    unique = []
    for inst in institutions:
        key = re.sub(r"[^a-z0-9]", "", inst["name"].lower())
        if key not in seen:
            seen.add(key)
            unique.append(inst)
    return unique


def enrich_with_compliance_urgency(institutions: list[dict]) -> list[dict]:
    """
    Tag each institution with compliance urgency signals.
    CBN directive: 90 days to submit roadmap (deadline ~June 8 2026).
    Banks: 18 months to deploy. Others: 24 months.
    """
    for inst in institutions:
        # Priority 0 = named in CBN pilot = most urgent
        # Priority 1 = DMB/PSP/MMO = 18-month deadline
        # Priority 2+ = longer timeline
        inst["urgency_score"] = {0: 100, 1: 80, 2: 60, 3: 40}.get(inst["priority"], 20)
        inst["roadmap_deadline"] = "June 2026"
        inst["deployment_deadline"] = "Q3 2027" if inst["license_type"] == "DMB" else "Q1 2028"
        inst["cbn_requires_aml"] = True
        # Flag for follow-up
        inst["outreach_status"] = "not_contacted"
        inst["notes"] = ""
    return institutions


def save_results(institutions: list[dict]) -> None:
    """Save to both JSON and CSV for different downstream uses."""
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M")

    json_path = OUTPUT_DIR / f"cbn_leads_{ts}.json"
    with open(json_path, "w") as f:
        json.dump(institutions, f, indent=2)
    log.info(f"Saved {len(institutions)} institutions to {json_path}")

    latest_json = OUTPUT_DIR / "cbn_leads_latest.json"
    with open(latest_json, "w") as f:
        json.dump(institutions, f, indent=2)

    csv_path = OUTPUT_DIR / f"cbn_leads_{ts}.csv"
    if institutions:
        with open(csv_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=institutions[0].keys())
            writer.writeheader()
            writer.writerows(institutions)
    log.info(f"Saved CSV to {csv_path}")


def run() -> None:
    log.info("=== KORI CBN Registry Scraper Starting ===")
    all_institutions = list(KNOWN_VASPS)  # Start with known VASPs

    for source in CBN_SOURCES:
        log.info(f"Scraping {source['category']} from {source['url']}")
        soup = fetch_page(source["url"])
        if soup:
            institutions = extract_institutions_from_page(soup, source)
            all_institutions.extend(institutions)
        time.sleep(2)  # Be polite to CBN servers

    # Deduplicate and enrich
    unique = deduplicate(all_institutions)
    enriched = enrich_with_compliance_urgency(unique)

    # Sort by urgency
    enriched.sort(key=lambda x: x["urgency_score"], reverse=True)

    save_results(enriched)
    log.info(f"=== Done. Total unique institutions: {len(enriched)} ===")

    # Print summary
    by_type = {}
    for inst in enriched:
        lt = inst["license_type"]
        by_type[lt] = by_type.get(lt, 0) + 1
    log.info("Breakdown by license type:")
    for lt, count in sorted(by_type.items(), key=lambda x: -x[1]):
        log.info(f"  {lt}: {count}")


if __name__ == "__main__":
    run()