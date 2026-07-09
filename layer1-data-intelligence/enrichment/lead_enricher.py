"""
KORI Sales OS — Layer 1: Lead Enricher
Takes the raw institution list and enriches each with:
- Likely decision-maker titles and email patterns
- LinkedIn search URLs (manual lookup or Phantombuster)
- Compliance risk score (based on license type + company size estimate)
- Personalized outreach hooks

Run: python lead_enricher.py --input ../data/cbn_leads_latest.json
Output: ../data/enriched_leads.json + ../data/enriched_leads.csv
"""

import json
import csv
import argparse
import logging
import re
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger(__name__)

OUTPUT_DIR = Path(__file__).parent.parent / "data"

# Decision-maker titles by license type — who signs the AML budget
DECISION_MAKERS = {
    "DMB": [
        "Chief Compliance Officer",
        "Group Chief Risk Officer",
        "Head of AML/CFT",
        "Director, Compliance",
        "Chief Technology Officer",
    ],
    "PSP": [
        "Chief Compliance Officer",
        "Head of Risk & Compliance",
        "Chief Risk Officer",
        "Chief Technology Officer",
        "CEO",
    ],
    "MMO": [
        "Chief Compliance Officer",
        "Head of Financial Crime",
        "Chief Risk Officer",
        "Head of Regulatory Affairs",
        "CEO",
    ],
    "VASP": [
        "CEO",
        "Chief Compliance Officer",
        "Head of AML",
        "Chief Risk Officer",
        "CTO",
    ],
    "MFB": [
        "CEO",
        "Compliance Officer",
        "Head of Operations",
        "MD",
    ],
    "FC": ["CEO", "Compliance Officer", "CFO"],
    "PMB": ["CEO", "Compliance Officer", "MD"],
    "DFI": ["Director General", "Compliance Officer", "CFO"],
}

# Email patterns to try (enricher generates guesses, human validates)
EMAIL_PATTERNS = [
    "{first}@{domain}",
    "{first}.{last}@{domain}",
    "{f}{last}@{domain}",
    "compliance@{domain}",
    "aml@{domain}",
    "risk@{domain}",
]

# Compliance pain points by license type — used for outreach personalization
PAIN_POINTS = {
    "DMB": [
        "18-month CBN deployment deadline starting now",
        "STR filing automation to NFIU within 24 hours",
        "Real-time transaction monitoring across NIBSS rails",
        "Travel Rule compliance for correspondent banking",
    ],
    "PSP": [
        "24-month CBN AML automation deadline",
        "High-volume transaction monitoring at scale",
        "Agent network fraud detection (shared SIM, device fingerprinting)",
        "STR automation for payment card channels",
    ],
    "MMO": [
        "24-month CBN AML automation deadline",
        "SIM swap fraud detection in real time",
        "Agent network abuse monitoring",
        "USSD transaction pattern analysis",
    ],
    "VASP": [
        "CBN named in AML pilot — immediate regulatory scrutiny",
        "FATF Travel Rule compliance (Recommendation 16)",
        "Crypto wallet clustering and source-of-funds analysis",
        "STR filing for suspicious crypto transactions",
    ],
    "MFB": [
        "24-month CBN AML automation deadline",
        "Low-cost compliance solution for smaller institutions",
        "Group lending fraud detection",
        "Mobile-first compliance reporting",
    ],
}

CBN_PILOT_INSTITUTIONS = {
    "flutterwave", "paystack", "yellow card", "quidax", "busha",
    "kucoin", "luno", "opay", "moniepoint", "palmpay"
}


def normalize_institution_name(name: str) -> str:
    """Clean up institution name for consistent matching."""
    return re.sub(r"\s+", " ", name.strip().lower())


def extract_domain_from_website(website: str) -> str:
    """Extract clean domain from website URL."""
    if not website:
        return ""
    website = website.lower().strip()
    website = re.sub(r"^https?://", "", website)
    website = re.sub(r"^www\.", "", website)
    website = website.split("/")[0]
    return website


def generate_email_patterns(domain: str) -> list[str]:
    """Generate likely email patterns for outreach."""
    if not domain:
        return []
    return [
        f"compliance@{domain}",
        f"aml@{domain}",
        f"risk@{domain}",
        f"cco@{domain}",
    ]


def build_linkedin_search_url(institution_name: str, title: str) -> str:
    """Build LinkedIn people search URL for finding the right contact."""
    query = f'"{institution_name}" "{title}" Nigeria'
    encoded = query.replace(" ", "%20").replace('"', "%22")
    return f"https://www.linkedin.com/search/results/people/?keywords={encoded}"


def build_google_search_url(institution_name: str, title: str) -> str:
    """Build Google search URL as backup for finding contacts."""
    query = f'"{institution_name}" "{title}" site:linkedin.com'
    encoded = query.replace(" ", "+").replace('"', "%22")
    return f"https://www.google.com/search?q={encoded}"


def calculate_lead_score(institution: dict) -> int:
    """
    Score each lead 0-100 based on urgency and fit.
    Higher score = contact first.
    """
    score = institution.get("urgency_score", 50)

    # Bonus for being named in CBN pilot
    name_lower = normalize_institution_name(institution.get("name", ""))
    if any(pilot in name_lower for pilot in CBN_PILOT_INSTITUTIONS):
        score = min(score + 30, 100)

    # Bonus for having a website (we can enrich further)
    if institution.get("website"):
        score += 5

    # Bonus for high-priority license types
    license_bonuses = {"VASP": 20, "DMB": 15, "PSP": 10, "MMO": 10, "MFB": 5}
    score += license_bonuses.get(institution.get("license_type", ""), 0)

    return min(score, 100)


def generate_outreach_hook(institution: dict) -> str:
    """
    Generate a personalized first-touch message hook.
    This is the opening line that will be used in outreach.
    """
    name = institution["name"]
    lt = institution.get("license_type", "PSP")
    pain_list = PAIN_POINTS.get(lt, PAIN_POINTS["PSP"])
    primary_pain = pain_list[0] if pain_list else "CBN AML compliance deadline"

    # Special hook for CBN pilot institutions
    name_lower = normalize_institution_name(name)
    if any(pilot in name_lower for pilot in CBN_PILOT_INSTITUTIONS):
        return (
            f"[NAME], I saw {name} was included in the CBN's AML/CFT supervision pilot. "
            f"We built KORI specifically for institutions in your position — the platform "
            f"maps exactly to the CBN's baseline standards and generates audit-ready reports. "
            f"Worth a 20-minute call before you submit your implementation roadmap?"
        )

    if lt == "DMB":
        return (
            f"[NAME], the CBN's March 10th circular gives {name} 18 months to deploy "
            f"automated AML — and 90 days to submit a roadmap. KORI is the only Nigeria-built "
            f"graph-based fraud detection platform already meeting those standards. Can we show you "
            f"how other Nigerian banks are approaching their roadmaps?"
        )

    return (
        f"[NAME], with the CBN's new AML automation mandate, {name} has "
        f"{'18' if lt == 'DMB' else '24'} months to deploy a compliant system. "
        f"KORI is built for {lt}s operating on Nigerian rails — "
        f"real-time, CBN §5.1 aligned, and already live. "
        f"15 minutes to see a demo?"
    )


def enrich_institution(institution: dict) -> dict:
    """Add all enrichment data to a single institution record."""
    lt = institution.get("license_type", "PSP")
    domain = extract_domain_from_website(institution.get("website", ""))

    institution["domain"] = domain
    institution["email_patterns"] = generate_email_patterns(domain)
    institution["target_titles"] = DECISION_MAKERS.get(lt, DECISION_MAKERS["PSP"])
    institution["pain_points"] = PAIN_POINTS.get(lt, PAIN_POINTS["PSP"])
    institution["lead_score"] = calculate_lead_score(institution)
    institution["outreach_hook"] = generate_outreach_hook(institution)

    # LinkedIn search URLs for top 2 target titles
    institution["linkedin_searches"] = [
        {
            "title": title,
            "linkedin_url": build_linkedin_search_url(institution["name"], title),
            "google_url": build_google_search_url(institution["name"], title),
        }
        for title in institution["target_titles"][:2]
    ]

    # Sequence assignment (which outreach sequence to use)
    institution["sequence"] = "vasp_pilot" if institution.get("urgency_score", 0) == 100 else (
        "dmb_urgent" if lt == "DMB" else "standard_aml"
    )

    # Initialize CRM tracking fields
    institution.setdefault("outreach_status", "not_contacted")
    institution["enriched_at"] = datetime.utcnow().isoformat()
    institution["contact_name"] = ""
    institution["contact_email"] = ""
    institution["contact_linkedin"] = ""
    institution["last_contacted_at"] = ""
    institution["response_received"] = False
    institution["demo_booked"] = False
    institution["pilot_started"] = False
    institution["closed_won"] = False
    institution["closed_lost_reason"] = ""

    return institution


def run(input_path: str) -> None:
    log.info(f"=== KORI Lead Enricher Starting. Input: {input_path} ===")

    with open(input_path) as f:
        institutions = json.load(f)

    log.info(f"Loaded {len(institutions)} institutions")

    enriched = [enrich_institution(inst) for inst in institutions]

    # Sort by lead score (highest first)
    enriched.sort(key=lambda x: x["lead_score"], reverse=True)

    # Save JSON
    json_out = OUTPUT_DIR / "enriched_leads.json"
    with open(json_out, "w") as f:
        json.dump(enriched, f, indent=2)
    log.info(f"Saved enriched JSON to {json_out}")

    # Save CSV (flatten for Google Sheets)
    csv_out = OUTPUT_DIR / "enriched_leads.csv"
    flat_fields = [
        "name", "license_type", "category", "domain", "lead_score",
        "urgency_score", "sequence", "aml_deadline_months",
        "roadmap_deadline", "deployment_deadline",
        "outreach_status", "contact_name", "contact_email",
        "contact_linkedin", "last_contacted_at", "response_received",
        "demo_booked", "pilot_started", "closed_won", "outreach_hook",
        "enriched_at"
    ]
    with open(csv_out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=flat_fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(enriched)
    log.info(f"Saved enriched CSV to {csv_out}")

    # Print top 20 leads
    log.info("\n=== TOP 20 LEADS (by score) ===")
    for i, inst in enumerate(enriched[:20], 1):
        log.info(
            f"{i:2}. [{inst['lead_score']:3}/100] {inst['name']:<40} "
            f"{inst['license_type']:<5} — {inst['sequence']}"
        )

    log.info(f"\n=== Done. Total enriched: {len(enriched)} ===")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Enrich KORI lead list")
    parser.add_argument(
        "--input",
        default=str(OUTPUT_DIR / "cbn_leads_latest.json"),
        help="Path to raw leads JSON"
    )
    args = parser.parse_args()
    run(args.input)