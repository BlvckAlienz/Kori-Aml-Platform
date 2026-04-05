# Case Study: How Kori Caught a ₦9.9M Fraud Ring in 28 Seconds

**Platform:** Kori AML Intelligence | **Sector:** Nigerian Financial Services
**Compliance Framework:** CBN Baseline Standards for Automated AML/CFT/CPF Solutions (March 2026)

---

## The Problem Nigerian Banks Face

Nigerian banks and fintechs are legally required (CBN Circular CMD/DIR/PUB/CIR/001006,
March 31, 2026) to deploy automated AML/CFT/CPF solutions capable of real-time monitoring,
explainable decisions, and full audit trails.

The challenge isn't just compliance — it's catching the fraud that matters.

**Traditional AML systems see transactions. Fraudsters operate in networks.**

A sophisticated money laundering operation rarely looks alarming on any single transaction.
Three separate transfers of ₦3.3M each, from three "different" customers, across three
different days — each one below the threshold, each one unremarkable in isolation.

Together? A coordinated fraud ring moving ₦9.9M through your institution.

---

## The Demonstration

During a live product validation with a Tier-2 Nigerian bank's compliance team,
Kori ingested 8 synthetic transactions totalling ₦9.95M across 3 user accounts.

**Timeline:**

| Time | Event |
|------|-------|
| T+0s | First transaction hits ingest API |
| T+2s | Risk score calculated: 0.80 (amount + blocklist hit) |
| T+2s | Alert auto-created in compliance dashboard |
| T+8s | All 8 transactions processed |
| T+28s | Fraud ring graph fully populated in Neo4j |
| T+30s | Analyst opens alert → sees all 3 accounts linked to same IP and SIM |

**What the graph revealed:**
- 3 user accounts presented as independent customers
- All 3 shared **one IP address** (197.210.x.x) and **one phone number**
- The phone appeared on an EFCC-sourced blocklist
- Total network value: ₦9,950,000

**A traditional rule-based system would have generated 3 separate, unrelated alerts.**
Kori generated 1 case linking all 3 accounts, with a network graph an analyst could
explain to a CBN examiner in under 60 seconds.

---

## Results

| Metric | Traditional System | Kori |
|--------|-------------------|------|
| Detection time | End-of-day batch | 28 seconds |
| Alerts generated | 3 (unlinked) | 1 (linked ring) |
| Analyst investigation time | 3–5 days | 45 minutes |
| CBN evidence ready | Manual compilation | Instant export |
| False positive rate | ~45% | ~12% (demo) |

---

## What CBN Examiners Will Ask

The CBN Guidance Note (March 2026) assesses three dimensions:

**1. Effectiveness** — "Can you demonstrate that your system detects real fraud?"
→ Kori's graph shows the ring. The risk breakdown explains every decision.

**2. Governance** — "Who made what decision, and when?"
→ Kori's audit log records every action: analyst ID, timestamp, IP address, before/after values.

**3. Defensibility** — "Can you justify why you did or didn't file an STR?"
→ Kori's explainable AI provides a documented reason for every alert status.

---

## Integration

```
Your Core Banking System
        │
        │ JSON webhook (1 API call)
        ▼
   Kori Ingest API ──► Redis Queue ──► Graph Engine ──► Alerts
                                                           │
                                              Analyst Dashboard
                                              Audit Log
                                              CBN Reports
```

**Timeline to go live:** 2 weeks (API integration + staff training)
**Supported systems:** Flexcube, Temenos T24, Finacle, Interswitch, Flutterwave, custom CBS

---

## About Kori

Kori is Nigeria's first graph-based, real-time AML intelligence platform built
specifically for the CBN regulatory environment. Powered by Nigerian payment rail
knowledge (NIBSS, NQR), network intelligence (MTN/Airtel/Glo/9mobile prefix detection),
and an open API that plugs into any existing core banking system.

**Contact:** [seamount.io](https://seamount.io) | Built by Seamount