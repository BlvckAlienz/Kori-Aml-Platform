"""
KORI Sales OS — Layer 5: Learning Loop
Path: layer5-learning-loop/analytics/learning_loop.py

The moat builder. Tracks every outreach outcome, measures what converts,
identifies winning patterns, and generates weekly improvement recommendations.

Run daily: python learning_loop.py --daily
Run weekly: python learning_loop.py --weekly-report
"""

import json
import csv
import logging
import argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path
from collections import defaultdict

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent / "layer1-data-intelligence" / "data"
LOOP_DIR = Path(__file__).parent / "data"
LOOP_DIR.mkdir(exist_ok=True)

OUTCOMES_FILE = LOOP_DIR / "outcomes.json"
PATTERNS_FILE = LOOP_DIR / "patterns.json"
WEEKLY_REPORTS_DIR = LOOP_DIR / "weekly-reports"
WEEKLY_REPORTS_DIR.mkdir(exist_ok=True)


# ─── Outcome Recording ────────────────────────────────────────────────────────

def record_outcome(
    institution_name: str,
    sequence: str,
    step: int,
    channel: str,
    message_type: str,
    opened: bool,
    responded: bool,
    response_sentiment: str,  # 'positive' | 'neutral' | 'negative' | 'none'
    demo_booked: bool,
    notes: str = ""
) -> None:
    """
    Record a single outreach outcome event.
    Called every time an outreach message is sent AND when a response is received.
    """
    outcomes = _load_outcomes()

    outcome = {
        "id": f"out_{int(datetime.now(timezone.utc).timestamp())}",
        "institution": institution_name,
        "sequence": sequence,
        "step": step,
        "channel": channel,
        "message_type": message_type,
        "opened": opened,
        "responded": responded,
        "response_sentiment": response_sentiment,
        "demo_booked": demo_booked,
        "notes": notes,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }

    outcomes.append(outcome)
    _save_outcomes(outcomes)
    log.info(f"Recorded outcome for {institution_name}: responded={responded}, demo={demo_booked}")


# ─── Pattern Analysis ─────────────────────────────────────────────────────────

def analyze_patterns() -> dict:
    """
    Analyze all outcomes to find winning patterns.
    Returns a structured patterns dict that gets saved and used to improve prompts.
    """
    outcomes = _load_outcomes()
    leads = _load_leads()

    if not outcomes:
        return {"error": "No outcome data yet. Record some outcomes first."}

    # Build lead lookup
    lead_lookup = {l["name"]: l for l in leads}

    patterns = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_outcomes": len(outcomes),
        "by_channel": _analyze_by_dimension(outcomes, "channel"),
        "by_sequence": _analyze_by_dimension(outcomes, "sequence"),
        "by_message_type": _analyze_by_dimension(outcomes, "message_type"),
        "by_step": _analyze_by_dimension(outcomes, "step"),
        "by_license_type": _analyze_by_license_type(outcomes, lead_lookup),
        "time_patterns": _analyze_timing_patterns(outcomes),
        "top_performing": _find_top_performers(outcomes),
        "what_converts": _find_conversion_patterns(outcomes, lead_lookup),
        "improvement_recommendations": [],
    }

    # Generate recommendations
    patterns["improvement_recommendations"] = _generate_recommendations(patterns)

    _save_patterns(patterns)
    log.info(f"Pattern analysis complete: {len(outcomes)} outcomes analyzed")
    return patterns


def _analyze_by_dimension(outcomes: list[dict], dimension: str) -> dict:
    """Calculate response rate and demo rate by a given dimension."""
    by_dim = defaultdict(lambda: {"sent": 0, "responded": 0, "demo": 0})

    for o in outcomes:
        key = str(o.get(dimension, "unknown"))
        by_dim[key]["sent"] += 1
        if o.get("responded"):
            by_dim[key]["responded"] += 1
        if o.get("demo_booked"):
            by_dim[key]["demo"] += 1

    result = {}
    for key, counts in by_dim.items():
        sent = counts["sent"]
        result[key] = {
            "sent": sent,
            "responded": counts["responded"],
            "demo_booked": counts["demo"],
            "response_rate": round(counts["responded"] / sent * 100, 1) if sent > 0 else 0,
            "demo_rate": round(counts["demo"] / sent * 100, 1) if sent > 0 else 0,
        }

    return dict(sorted(result.items(), key=lambda x: -x[1]["response_rate"]))


def _analyze_by_license_type(outcomes: list[dict], lead_lookup: dict) -> dict:
    """Response rates by institution license type."""
    by_type = defaultdict(lambda: {"sent": 0, "responded": 0, "demo": 0})

    for o in outcomes:
        inst = lead_lookup.get(o.get("institution"), {})
        lt = inst.get("license_short", "UNKNOWN")
        by_type[lt]["sent"] += 1
        if o.get("responded"):
            by_type[lt]["responded"] += 1
        if o.get("demo_booked"):
            by_type[lt]["demo"] += 1

    result = {}
    for lt, counts in by_type.items():
        sent = counts["sent"]
        result[lt] = {
            "sent": sent,
            "responded": counts["responded"],
            "response_rate": round(counts["responded"] / sent * 100, 1) if sent else 0,
            "demo_rate": round(counts["demo"] / sent * 100, 1) if sent else 0,
        }
    return dict(sorted(result.items(), key=lambda x: -x[1]["response_rate"]))


def _analyze_timing_patterns(outcomes: list[dict]) -> dict:
    """Identify what day/hour gets the best response rate."""
    by_hour = defaultdict(lambda: {"sent": 0, "responded": 0})
    by_dayofweek = defaultdict(lambda: {"sent": 0, "responded": 0})

    for o in outcomes:
        ts = o.get("recorded_at", "")
        try:
            dt = datetime.fromisoformat(ts)
            hour = dt.hour
            dow = dt.strftime("%A")
            by_hour[hour]["sent"] += 1
            by_dayofweek[dow]["sent"] += 1
            if o.get("responded"):
                by_hour[hour]["responded"] += 1
                by_dayofweek[dow]["responded"] += 1
        except Exception:
            pass

    best_hours = sorted(
        [(h, v["responded"] / max(v["sent"], 1) * 100) for h, v in by_hour.items()],
        key=lambda x: -x[1]
    )[:3]

    best_days = sorted(
        [(d, v["responded"] / max(v["sent"], 1) * 100) for d, v in by_dayofweek.items()],
        key=lambda x: -x[1]
    )[:3]

    return {
        "best_hours_to_send": [{"hour": f"{h}:00", "response_rate": round(r, 1)} for h, r in best_hours],
        "best_days_to_send": [{"day": d, "response_rate": round(r, 1)} for d, r in best_days],
    }


def _find_top_performers(outcomes: list[dict]) -> list[dict]:
    """Find institutions that responded and booked demos."""
    by_inst = defaultdict(lambda: {"responded": False, "demo": False, "sentiment": "none"})
    for o in outcomes:
        inst = o.get("institution", "")
        if o.get("responded"):
            by_inst[inst]["responded"] = True
        if o.get("demo_booked"):
            by_inst[inst]["demo"] = True
        if o.get("response_sentiment") not in ("none", "negative"):
            by_inst[inst]["sentiment"] = o.get("response_sentiment", "none")

    return [
        {"institution": inst, **data}
        for inst, data in by_inst.items()
        if data["responded"] or data["demo"]
    ]


def _find_conversion_patterns(outcomes: list[dict], lead_lookup: dict) -> dict:
    """What characteristics do converting leads share?"""
    converts = [o for o in outcomes if o.get("demo_booked")]
    non_converts = [o for o in outcomes if not o.get("demo_booked")]

    def get_profile(outcome_list: list[dict]) -> dict:
        if not outcome_list:
            return {}
        lt_counts = defaultdict(int)
        seq_counts = defaultdict(int)
        channel_counts = defaultdict(int)
        step_counts = defaultdict(int)
        for o in outcome_list:
            inst = lead_lookup.get(o.get("institution"), {})
            lt_counts[inst.get("license_short", "UNKNOWN")] += 1
            seq_counts[o.get("sequence", "unknown")] += 1
            channel_counts[o.get("channel", "unknown")] += 1
            step_counts[str(o.get("step", "unknown"))] += 1
        total = len(outcome_list)
        return {
            "license_types": {k: round(v / total * 100, 1) for k, v in lt_counts.items()},
            "sequences": {k: round(v / total * 100, 1) for k, v in seq_counts.items()},
            "channels": {k: round(v / total * 100, 1) for k, v in channel_counts.items()},
            "steps": {k: round(v / total * 100, 1) for k, v in step_counts.items()},
        }

    return {
        "demo_bookers": get_profile(converts),
        "non_converters": get_profile(non_converts),
        "sample_size": {"converts": len(converts), "non_converts": len(non_converts)},
    }


def _generate_recommendations(patterns: dict) -> list[str]:
    """Generate actionable improvement recommendations from pattern data."""
    recommendations = []

    # Best channel
    by_channel = patterns.get("by_channel", {})
    if by_channel:
        best_channel = max(by_channel.items(), key=lambda x: x[1].get("response_rate", 0))
        worst_channel = min(by_channel.items(), key=lambda x: x[1].get("response_rate", 0))
        if best_channel[1]["response_rate"] > worst_channel[1]["response_rate"] + 10:
            recommendations.append(
                f"CHANNEL: '{best_channel[0]}' has {best_channel[1]['response_rate']}% response rate vs "
                f"'{worst_channel[0]}' at {worst_channel[1]['response_rate']}%. "
                f"Shift 40% of outreach volume from '{worst_channel[0]}' to '{best_channel[0]}'."
            )

    # Best license type to target
    by_lt = patterns.get("by_license_type", {})
    if by_lt:
        best_lt = max(by_lt.items(), key=lambda x: x[1].get("response_rate", 0))
        recommendations.append(
            f"LICENSE TYPE: '{best_lt[0]}' institutions respond at {best_lt[1]['response_rate']}%. "
            f"Prioritise these in the next 30 days of outreach."
        )

    # Best timing
    timing = patterns.get("time_patterns", {})
    best_hours = timing.get("best_hours_to_send", [])
    best_days = timing.get("best_days_to_send", [])
    if best_hours:
        recommendations.append(
            f"TIMING: Send outreach at {best_hours[0]['hour']} WAT on {', '.join([d['day'] for d in best_days[:2]])} "
            f"for highest response rates."
        )

    # Sequence performance
    by_seq = patterns.get("by_sequence", {})
    if by_seq and len(by_seq) > 1:
        best_seq = max(by_seq.items(), key=lambda x: x[1].get("demo_rate", 0))
        recommendations.append(
            f"SEQUENCE: '{best_seq[0]}' converts at {best_seq[1]['demo_rate']}% to demos. "
            f"Use this sequence structure as the template for all new sequences."
        )

    # Step performance
    by_step = patterns.get("by_step", {})
    if by_step:
        best_step = max(by_step.items(), key=lambda x: x[1].get("response_rate", 0))
        recommendations.append(
            f"SEQUENCE STEP: Step '{best_step[0]}' gets the most responses ({best_step[1]['response_rate']}%). "
            f"Analyse the message at this step — it contains the highest-resonance hook. Replicate its structure in other steps."
        )

    if not recommendations:
        recommendations.append("Insufficient data for recommendations. Record at least 20 outreach outcomes.")

    return recommendations


# ─── Weekly Report ────────────────────────────────────────────────────────────

def generate_weekly_report() -> str:
    """Generate a complete weekly sales intelligence report."""
    leads = _load_leads()
    outcomes = _load_outcomes()
    patterns = analyze_patterns()

    week_start = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    this_week_outcomes = [o for o in outcomes if o.get("recorded_at", "") >= week_start]

    # Pipeline summary
    total_leads = len(leads)
    contacted = sum(1 for l in leads if l.get("outreach_status") != "not_contacted")
    responded = sum(1 for l in leads if l.get("response_received"))
    demos = sum(1 for l in leads if l.get("demo_booked"))
    pilots = sum(1 for l in leads if l.get("pilot_started"))
    won = sum(1 for l in leads if l.get("closed_won"))

    response_rate = round(responded / contacted * 100, 1) if contacted > 0 else 0
    demo_rate = round(demos / contacted * 100, 1) if contacted > 0 else 0

    report = f"""
╔═══════════════════════════════════════════════════════════════╗
║           KORI WEEKLY SALES INTELLIGENCE REPORT               ║
║           Week Ending: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}                          ║
╚═══════════════════════════════════════════════════════════════╝

📊 PIPELINE SNAPSHOT
─────────────────────────────────────────────────────────────
Total leads in database:    {total_leads:>5}  (NG: {sum(1 for l in leads if l.get('country')=='Nigeria'):>4}, KE: {sum(1 for l in leads if l.get('country')=='Kenya'):>4})
Contacted:                  {contacted:>5}  ({round(contacted/total_leads*100,1) if total_leads else 0:.1f}% of total)
Responded:                  {responded:>5}  ({response_rate:.1f}% response rate)
Demo booked:                {demos:>5}  ({demo_rate:.1f}% demo rate)
Pilot started:              {pilots:>5}
Closed (won):               {won:>5}

📬 THIS WEEK'S OUTREACH ACTIVITY
─────────────────────────────────────────────────────────────
Messages sent this week:    {len(this_week_outcomes):>5}
Responses this week:        {sum(1 for o in this_week_outcomes if o.get('responded')):>5}
Demos booked this week:     {sum(1 for o in this_week_outcomes if o.get('demo_booked')):>5}

🏆 WHAT'S WORKING (Pattern Analysis)
─────────────────────────────────────────────────────────────

Top performing channels:
{_format_channel_table(patterns.get('by_channel', {}))}

Top performing sequences:
{_format_simple_table(patterns.get('by_sequence', {}))}

Top performing license types:
{_format_simple_table(patterns.get('by_license_type', {}))}

Best times to send:
{_format_timing(patterns.get('time_patterns', {}))}

🎯 IMPROVEMENT RECOMMENDATIONS
─────────────────────────────────────────────────────────────
{chr(10).join(f'{i+1}. {rec}' for i, rec in enumerate(patterns.get('improvement_recommendations', [])))}

📋 NEXT WEEK'S TOP 10 PRIORITY LEADS
─────────────────────────────────────────────────────────────
{_format_top_leads(leads)}

💡 KEY LEARNINGS THIS WEEK
─────────────────────────────────────────────────────────────
{_format_learnings(this_week_outcomes)}

═══════════════════════════════════════════════════════════════
Generated: {datetime.now(timezone.utc).isoformat()}
Next report: {(datetime.now(timezone.utc) + timedelta(days=7)).strftime('%Y-%m-%d')}
═══════════════════════════════════════════════════════════════
"""

    # Save report
    week_str = datetime.now(timezone.utc).strftime("%Y-W%V")
    report_path = WEEKLY_REPORTS_DIR / f"week-{week_str}.txt"
    with open(report_path, "w") as f:
        f.write(report)

    log.info(f"Weekly report saved to {report_path}")
    return report


def _format_channel_table(by_channel: dict) -> str:
    if not by_channel:
        return "  No data yet"
    lines = []
    for ch, stats in list(by_channel.items())[:5]:
        bar = "█" * int(stats["response_rate"] / 5)
        lines.append(f"  {ch:<12} {stats['response_rate']:>5.1f}% {bar}")
    return "\n".join(lines)


def _format_simple_table(data: dict) -> str:
    if not data:
        return "  No data yet"
    lines = []
    for key, stats in list(data.items())[:5]:
        lines.append(
            f"  {str(key):<20} response: {stats.get('response_rate',0):>5.1f}%  "
            f"demo: {stats.get('demo_rate',0):>4.1f}%"
        )
    return "\n".join(lines)


def _format_timing(timing: dict) -> str:
    if not timing:
        return "  No timing data yet"
    lines = []
    for h in timing.get("best_hours_to_send", [])[:3]:
        lines.append(f"  {h.get('hour','?'):>8} WAT  —  {h.get('response_rate',0):.1f}% response rate")
    for d in timing.get("best_days_to_send", [])[:3]:
        lines.append(f"  {d.get('day','?'):<10}  —  {d.get('response_rate',0):.1f}% response rate")
    return "\n".join(lines) if lines else "  No timing data yet"


def _format_top_leads(leads: list[dict]) -> str:
    not_contacted = [l for l in leads if l.get("outreach_status") == "not_contacted"][:10]
    if not not_contacted:
        return "  All high-priority leads have been contacted."
    lines = []
    for i, l in enumerate(not_contacted, 1):
        lines.append(
            f"  {i:2}. [{l.get('lead_score',0):3}] {l['name'][:40]:<40} | "
            f"{l.get('license_short','?'):<5} | {l.get('country','?')}"
        )
    return "\n".join(lines)


def _format_learnings(this_week: list[dict]) -> str:
    if not this_week:
        return "  No outreach recorded this week. Run the outreach sequences."

    responded = [o for o in this_week if o.get("responded")]
    positive = [o for o in responded if o.get("response_sentiment") == "positive"]

    if not responded:
        return "  Messages sent but no responses yet this week."

    learnings = [
        f"  Sent {len(this_week)} messages, received {len(responded)} responses "
        f"({round(len(responded)/len(this_week)*100,1)}% response rate).",
    ]
    if positive:
        learnings.append(
            f"  {len(positive)} positive responses — these institutions are in active consideration."
        )
    neg = [o for o in responded if o.get("response_sentiment") == "negative"]
    if neg:
        learnings.append(
            f"  {len(neg)} negative responses. Common reason (check notes): "
            f"{', '.join([o.get('notes','not logged')[:30] for o in neg[:2]])}"
        )
    return "\n".join(learnings)


# ─── Storage Helpers ──────────────────────────────────────────────────────────

def _load_outcomes() -> list[dict]:
    if OUTCOMES_FILE.exists():
        with open(OUTCOMES_FILE) as f:
            return json.load(f)
    return []


def _save_outcomes(outcomes: list[dict]) -> None:
    with open(OUTCOMES_FILE, "w") as f:
        json.dump(outcomes, f, indent=2)


def _save_patterns(patterns: dict) -> None:
    with open(PATTERNS_FILE, "w") as f:
        json.dump(patterns, f, indent=2)


def _load_leads() -> list[dict]:
    leads_path = DATA_DIR / "enriched_leads.json"
    if leads_path.exists():
        with open(leads_path) as f:
            return json.load(f)
    return []


# ─── CLI ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="KORI Learning Loop Analytics")
    parser.add_argument("--daily", action="store_true", help="Run daily pattern analysis")
    parser.add_argument("--weekly-report", action="store_true", help="Generate weekly sales report")
    parser.add_argument("--record", action="store_true", help="Record a new outcome (interactive)")
    parser.add_argument("--patterns", action="store_true", help="Show current patterns")
    args = parser.parse_args()

    if args.daily:
        patterns = analyze_patterns()
        print("\n📊 PATTERN ANALYSIS COMPLETE")
        print(f"Recommendations:")
        for i, rec in enumerate(patterns.get("improvement_recommendations", []), 1):
            print(f"  {i}. {rec}")

    elif args.weekly_report:
        report = generate_weekly_report()
        print(report)

    elif args.record:
        print("=== Record Outreach Outcome ===")
        institution = input("Institution name: ").strip()
        sequence = input("Sequence (vasp_pilot/dmb_urgent/standard_aml): ").strip()
        step = int(input("Sequence step number: ").strip())
        channel = input("Channel (whatsapp/email/linkedin): ").strip()
        message_type = input("Message type (intro/follow-up/checklist/case-study/final): ").strip()
        responded = input("Did they respond? (y/n): ").strip().lower() == "y"
        sentiment = input("Response sentiment (positive/neutral/negative/none): ").strip() if responded else "none"
        demo = input("Demo booked? (y/n): ").strip().lower() == "y"
        notes = input("Notes (optional): ").strip()
        record_outcome(
            institution_name=institution,
            sequence=sequence,
            step=step,
            channel=channel,
            message_type=message_type,
            opened=True,
            responded=responded,
            response_sentiment=sentiment,
            demo_booked=demo,
            notes=notes
        )
        print(f"✅ Outcome recorded for {institution}")

    elif args.patterns:
        patterns = analyze_patterns()
        print(json.dumps(patterns, indent=2))

    else:
        print("Use: --daily | --weekly-report | --record | --patterns")


if __name__ == "__main__":
    main()