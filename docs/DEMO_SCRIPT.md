# Kori AML Platform — 5-Minute Live Demo Script
**For: CBN-regulated banks, fintechs, and VASPs**
**Format: Screen share / in-person presentation**

---

## Pre-Demo Setup (10 min before)
```bash
# 1. Add demo phone to blocklist (so alerts fire during demo)
curl -X POST https://api-service.onrender.com/blocklist \
  -H "Content-Type: application/json" \
  -d '{"type":"phone","value":"08099887766","source":"demo_efcc_list"}'

# 2. Generate fraud ring in background
python scripts/generate_fraud_ring.py \
  --url https://ingest-service.onrender.com \
  --rings 1 \
  --supabase-url YOUR_SUPABASE_URL \
  --supabase-key YOUR_SERVICE_ROLE_KEY

# 3. Open browser tabs:
#    Tab 1: https://kori-aml-platform.vercel.app (dashboard)
#    Tab 2: https://kori-aml-platform.vercel.app/reports
#    Tab 3: https://kori-aml-platform.vercel.app/audit
```

---

## Minute 0:00–0:45 — The Problem (don't skip this)

> **"Every institution in this room is required by the CBN's March 2026
> Baseline Standards to deploy an automated AML/CFT/CPF solution.
> The question isn't whether you need one. It's whether yours actually works.
> Traditional systems look at each transaction in isolation. Fraudsters
> don't operate in isolation. Let me show you what that means."**

---

## Minute 0:45–1:30 — Live Transaction Ingestion

**[On screen: Dashboard]**

Send a normal transaction (terminal or Postman):
```bash
curl -X POST https://ingest-service.onrender.com/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "DEMO_NORMAL_001",
    "user_id": "customer_abc",
    "amount": 15000,
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "phone": "08033445566",
    "ip_address": "41.211.100.5"
  }'
```

> **"₦15,000 — this is a normal transaction. Watch the dashboard.
> It appears in the feed immediately. Risk score: 0%. No alert.
> That's the system working correctly — it's not paranoid, it's precise."**

Refresh dashboard. Point to the transaction appearing.

---

## Minute 1:30–2:30 — High-Risk Transaction + Instant Alert

Send the alert-triggering transaction:
```bash
curl -X POST https://ingest-service.onrender.com/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "DEMO_HIGH_001",
    "user_id": "customer_xyz",
    "amount": 750000,
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "phone": "08099887766",
    "ip_address": "197.210.44.55"
  }'
```

Refresh dashboard.

> **"₦750,000. Same phone number that appears on our blocklist — sourced
> from an EFCC intelligence feed. The system calculated a risk score of 80%
> in under 2 seconds. An alert is already sitting in the Priority Alerts panel.
> No human had to look at this first. The analyst's attention is now
> directed precisely where it's needed."**

---

## Minute 2:30–3:30 — Alert Investigation + Explainable AI

**[Click the alert → opens /alerts/{id}]**

> **"This is where compliance gets defensible. The CBN wants to know that
> you can explain every decision. Here's the risk breakdown."**

Point to risk breakdown panel:
- "Amount > ₦500K: +30%"
- "Phone on blocklist: +50%"
- "Total: 80% — above our 80% alert threshold"

> **"If the CBN examiner asks 'why did you flag this transaction?'
> — that answer is right there, printable, exportable, timestamped."**

Click **"Mark Investigating"**. Show status badge change.

---

## Minute 3:30–4:15 — Fraud Ring (The Show-Stopper)

**[Navigate to Alerts, click a ring alert from the generated fraud ring]**

> **"Now this is where graph technology changes everything.
> Look at this graph. Three different customer accounts. Three different
> transaction amounts. But they all share one IP address and one phone number.
> Traditional systems would process these as three separate, unrelated cases.
> Kori connects the dots."**

Point to the ForceGraph:
- Three User nodes → same SIM node, same IP node
- "This is a money mule network"

> **"Total movement across this ring: ₦9.9 million.
> Detection time: under 30 seconds from the first transaction hitting our system.
> Investigation time with Kori vs. manual correlation: 2 hours vs. 3 weeks."**

---

## Minute 4:15–4:45 — CBN Evidence Package (Close the Deal)

**[Navigate to /reports]**

> **"The CBN requires institutions to demonstrate effectiveness — not just
> that you have a system, but that it's working. Here are your metrics:
> STR conversion rate, false positive rate, investigation turnaround time.
> All exportable as PDF or CSV for your CBN submission."**

**[Navigate to /audit]**

> **"And every action taken in this platform — every alert status change,
> every blocklist addition, every case closure — is recorded here with the
> analyst's identity, timestamp, and IP address. This is your audit trail.
> This is what the examiner reads."**

---

## Minute 4:45–5:00 — Integration & Close

> **"Integration is a single API call. Your core banking system sends us
> a JSON webhook — same format you already use for transaction notifications.
> We've integrated with [NIBSS / your core banking system name] before.
> Implementation timeline: 2 weeks to go live, including staff training.
> 
> The CBN deadline is [insert]. Let's talk about what it takes to get
> your institution on Kori before that date."**

---

## Objection Handling

**"Is Kori CBN-certified?"**
> "The CBN explicitly stated in their March 2026 Guidance Note that they
> do not certify or endorse AML vendors. Compliance is assessed at your
> institution level. Kori provides the technology that helps you demonstrate
> compliance. We can walk through our compliance mapping document which
> maps every feature to the exact CBN requirement."

**"We already have Oracle FLEXCUBE / Temenos / Finacle."**
> "Perfect. We integrate via webhook in under a day. We're not replacing
> your core banking system — we're the intelligence layer sitting on top of it."

**"What about data privacy / CBN data residency?"**
> "All data stays within your chosen region. We can deploy on Nigerian
> infrastructure or within your own VPC. The platform is open-source at
> its core — your team can audit every line of code."

**"What happens when the AI gets it wrong?"**
> "That's exactly why we built explainability first. Every decision has
> a breakdown — your analyst can override, mark as false positive, and the
> system learns your institution's risk appetite over time."

---

## Leave-Behind
Provide: `CASE_STUDY.md`, `CBN_COMPLIANCE_MAPPING.md`, API documentation link