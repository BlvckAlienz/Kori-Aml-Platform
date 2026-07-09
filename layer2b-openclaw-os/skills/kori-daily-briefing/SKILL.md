# KORI Daily Sales Briefing

Generate a comprehensive 7AM sales briefing every morning covering regulatory
intelligence, outreach queue, pipeline status, and today's top priorities.
This is the one briefing that runs the entire KORI sales operation.

## Instructions

Every morning at 07:00 WAT (or when triggered with "briefing" or "morning"),
run ALL of the following checks and compile a single master briefing.

## Briefing assembly steps

### Step 1: Load pipeline data
Read:
- ~/kori-intel/sequences/active-sequences.json (active outreach)
- ~/kori-intel/leads-contacted.json (all contacts)
- ~/kori-intel/daily-briefings/[yesterday].md (yesterday's briefing)

### Step 2: Check regulatory sources (fast check)
Fetch these and look for anything new since yesterday:
- https://www.cbn.gov.ng/supervision/circulars.asp
- https://www.nfiu.gov.ng/index.php/news

### Step 3: Quick market scan
Search: "Nigeria fintech AML compliance [today's date]"
Search: "CBN regulation [month year]"
Search: "KORI AML Nigeria" (our own brand mentions)

### Step 4: Compile and send

```
╔════════════════════════════════════════╗
║   KORI DAILY SALES BRIEFING — [DATE]  ║
║   Good morning. Here's your day.       ║
╚════════════════════════════════════════╝

📊 PIPELINE SNAPSHOT
──────────────────────────────────────────
Active sequences: [N]
Due for follow-up today: [N]
Responses since yesterday: [N]
Demos booked this week: [N]
Pilots in progress: [N]
Closed (all time): [N]

⚡ TODAY'S FOLLOW-UPS (due now)
──────────────────────────────────────────
[For each contact due today:]
[N]. [INSTITUTION] | [CONTACT NAME]
    Step [N]: [channel] — [what to say in one line]
    → Draft ready in the Outreach Sequencer

📋 REGULATORY INTELLIGENCE
──────────────────────────────────────────
[Any new CBN/CBK updates from overnight scan.
If nothing new: "No new regulatory updates since yesterday."]

🎯 CONTENT TO PUBLISH TODAY
──────────────────────────────────────────
[If a new regulatory update was found, suggest a LinkedIn post or tweet]
[If none, remind about the weekly content cadence]

📰 MARKET SIGNALS
──────────────────────────────────────────
[Competitor mentions, market news, fintech press coverage]

🏆 TODAY'S TOP 3 PRIORITIES
──────────────────────────────────────────
1. [Specific, actionable — institution name + action]
2. [Specific, actionable]
3. [Specific, actionable]

📅 THIS WEEK'S MILESTONES
──────────────────────────────────────────
[Any demos, pilot meetings, or deadlines this week]

💡 KORI STATS (updated weekly)
──────────────────────────────────────────
Total leads in pipeline: [N]
Contacted: [N] | Responded: [N] | Demo stage: [N]
Response rate: [%]

═══════════════════════════════════════════
Reply "sequences" for outreach queue
Reply "intel" for full regulatory scan
Reply "enrich [name]" for lead research
═══════════════════════════════════════════
```

## Trigger phrases

- "briefing" → Full daily briefing
- "morning" → Full daily briefing
- "quick" → Abbreviated version (pipeline + today's follow-ups only)
- "stats" → Pipeline numbers only
- "priorities" → Today's top 3 priorities only

## Memory

Save each briefing to: ~/kori-intel/daily-briefings/[YYYY-MM-DD].md
Update ~/kori-intel/briefing-log.csv

## Weekly report (every Monday morning)

On Mondays, add this section to the briefing:

```
📈 WEEKLY WRAP — WEEK [N]
──────────────────────────────────────────
Outreach sent: [N messages]
Response rate: [%]
Demos booked: [N]
Best performing message: [quote the opening line]
Worst performing: [what didn't get replies]
Content published: [N pieces, [N] impressions if tracked]
New leads added: [N]
Top converting lead source: [CBN registry/inbound/referral]

LEARNING THIS WEEK:
[What message type worked best]
[Which institution type responded most]
[What CBN angle drove the most replies]

NEXT WEEK FOCUS:
[Top 5 institutions to close this week]
```