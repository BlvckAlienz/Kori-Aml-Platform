# Kori AML Platform — CBN Compliance Mapping
**Baseline Standards for Automated AML/CFT/CPF Solutions (CMD/DIR/PUB/CIR/001006 · March 31, 2026)**

> **Important Note:** The CBN does not certify or endorse AML technology vendors.
> Compliance is assessed at the institution level. This document maps Kori's
> features to the Standard's requirements to help institutions demonstrate
> their own compliance. Kori is an **enabler**, not a substitute for governance.

---

## §5.1.1 — Customer Due Diligence (CDD)

| CBN Requirement | Kori Feature | Evidence |
|----------------|-------------|---------|
| Automated CDD/EDD processes | `users` table stores BVN hash, NIN hash, KYC status | Supabase table schema |
| Risk-based customer profiling | User nodes in Neo4j carry `risk_score` updated on each transaction | Neo4j graph query: `MATCH (u:User) RETURN u.risk_score` |
| Integration with identity verification | Webhook accepts KYC fields; extensible to Dojah/Smile ID APIs | `POST /webhook` payload schema |
| PEP/sanctions screening | Blocklist supports OFAC, UN, EU list imports via CSV | `/blocklist` endpoint + bulk import script |
| Ongoing monitoring of customer behaviour | Every transaction updates the graph; risk propagates to user node | Processor `update_graph()` function |

**Gap & Remediation:** Full KYC document storage and automated PEP screening require integration with a third-party identity provider (e.g., Youverify, Dojah). Timeline: Phase 2 (Q3 2026).

---

## §5.1.2 — Sanctions List Screening

| CBN Requirement | Kori Feature | Evidence |
|----------------|-------------|---------|
| Real-time screening of transactions | Blocklist checked on every ingest event before graph update | `processor/main.py` → `_check_blocklist()` |
| Sanctions list management | `/blocklist` CRUD API with audit trail | `GET/POST/DELETE /blocklist` |
| Multiple list support (OFAC, UN, EU, NFIU) | `source` field on blocklist entries distinguishes list origin | `blocklist.source` column |
| Match alerting | Risk score contributions from blocklist hits trigger alerts at ≥0.8 threshold | `_create_alert()` + Supabase `alerts` table |
| Regular list updates | API endpoint for bulk blocklist import; supports scheduled refresh | `POST /blocklist` bulk capability |

**Audit evidence:** Every blocklist addition logged in `audit_logs` with `action_type='blocklist_add'`, `user_id`, `ip_address`, and timestamp.

---

## §5.1.3 — Transaction Monitoring & Case Management

| CBN Requirement | Kori Feature | Evidence |
|----------------|-------------|---------|
| Real-time transaction monitoring | Redis queue + continuous processor loop; latency <2 seconds | Processor `/health` + processor logs |
| Risk-based transaction scoring | Multi-factor scoring: amount thresholds, blocklist, time-of-day, structuring signals | `calculate_risk()` in `processor/main.py` |
| Explainable risk decisions | Per-transaction `risk_breakdown` JSON stored; displayed in dashboard | `GET /transaction/{id}/risk-breakdown` |
| Alert generation | Alerts auto-created when `risk_score ≥ 0.8` | `alerts` Supabase table |
| Investigation workflow | Alert status transitions: open → investigating → confirmed/false_positive → closed | `PATCH /alerts/{id}/status` |
| False positive management | `false_positive` status + FP rate tracked in Reports page | `/reports` dashboard |
| Graph-based community detection | Neo4j stores entity relationships; fraud rings visible as connected components | `/alert/{id}/graph` endpoint + force graph UI |
| Case assignment & notes | Status update with audit trail (extensible to notes in Phase 2) | `audit_logs` table |
| Performance metrics | STR conversion rate, FP rate, avg investigation time on Reports page | `/reports` page |

---

## §5.1.4 — Regulatory Reporting

| CBN Requirement | Kori Feature | Evidence |
|----------------|-------------|---------|
| Suspicious Transaction Reports (STR) | Confirmed alerts exportable as CSV with required fields | Reports page → Export CSV |
| STR conversion rate tracking | `confirmed / total alerts` metric displayed | Reports KPI card |
| NFIU goAML compatibility | Export fields match goAML schema (extensible to XML in Phase 2) | CSV export column mapping |
| Threshold reporting | Amount fields support CBN-mandated thresholds (₦500K+) | `risk_scorer` amount rules |
| Timely filing | Investigation turnaround metric; alerts age tracked from `created_at` | Reports page |

**Roadmap:** Native goAML XML export and direct NFIU API submission in Phase 2 (Q4 2026).

---

## §5.1.5 — Travel Rule (FATF Recommendation 16)

| CBN Requirement | Kori Feature | Evidence |
|----------------|-------------|---------|
| Originator information capture | `POST /v1/travel-rule/transfer` collects originator name, account, VASP | API endpoint |
| Beneficiary information capture | Beneficiary name, account, institution stored | `travel_rule_logs` table |
| IVMS101 data schema | Fields aligned to IVMS101 standard; `ivms101_compliant: true` flag | API response |
| Counterparty VASP exchange | MVP: logs to `travel_rule_logs`; TRISA/Notabene integration in roadmap | Phase 2 plan |
| Audit trail | All travel rule submissions logged to audit trail | `audit_logs.action_type='travel_rule_submission'` |

---

## §5.1.6 — Audit and Governance

| CBN Requirement | Kori Feature | Evidence |
|----------------|-------------|---------|
| Complete audit trail | `audit_logs` table: every state change recorded with user, timestamp, IP, before/after | `/audit` page |
| User access logging | Login events captured via Supabase Auth hooks | Supabase Auth logs |
| Change management | All blocklist, alert, and API key changes logged | `audit_logger.py` |
| Model governance | Risk scoring logic version-controlled in Git; change history in commits | GitHub repository |
| Role-based access | Supabase Auth with Row Level Security; admin/analyst roles extensible | Supabase RLS policies |
| Non-repudiation | Every audit record is insert-only (no updates/deletes on audit table) | `audit_logs` RLS: insert only |
| Data retention | Supabase PITR (point-in-time recovery) for audit data | Supabase settings |
| Export for regulator | Audit log CSV export with full event history | `/audit` page → Export CSV |

---

## §5.1.7 — System Integration & Scalability

| CBN Requirement | Kori Feature | Evidence |
|----------------|-------------|---------|
| Core banking integration | REST webhook (`POST /webhook`) accepts ISO-8583 fields in JSON | Ingest service API |
| NIBSS data support | `nibss_session_id` field accepted in transaction payload | Payload schema |
| API-first design | All features exposed via documented REST API | `/swagger` Swagger UI |
| Horizontal scalability | Stateless microservices on Render; Redis queue decouples ingestion from processing | Architecture diagram |
| High availability | Render auto-restart; Redis persistence; Supabase managed HA | Platform SLAs |
| Data throughput | Redis BLPOP queue; tested at 1,000+ tx/min on free tier | Load test results |
| Multi-channel support | `channel` field: POS, mobile, web, USSD, ATM | Transaction payload |

---

## §5.1.8 — Security & Data Protection

| CBN Requirement | Kori Feature | Evidence |
|----------------|-------------|---------|
| Data encryption at rest | Supabase AES-256 encryption; Neo4j AuraDB encryption | Platform documentation |
| Encryption in transit | TLS enforced on all Render/Vercel/Supabase endpoints | HTTPS everywhere |
| API authentication | API key hashed (SHA-256) before storage; keys never stored plain | `hash_key()` in `main.py` |
| Session management | Supabase JWT with configurable expiry | Auth settings |
| CORS restriction | `ALLOWED_ORIGINS` env variable restricts to Vercel domain | `main.py` CORS config |
| PII handling | BVN/NIN stored as hashed values; raw PII never logged | `users` table schema |
| Penetration testing | Roadmap: quarterly pen test with CREST-certified vendor | Phase 2 plan |

---

## §5.1.9 — User Interface & Customisation

| CBN Requirement | Kori Feature | Evidence |
|----------------|-------------|---------|
| Analyst investigation interface | Alert detail page with graph, risk breakdown, action buttons | `/alerts/{id}` page |
| Customisable alert thresholds | `RISK_THRESHOLD` environment variable; adjustable per deployment | `processor/.env` |
| Filtering and search | Table filters on transactions and alerts by risk level, status, date | Dashboard data tables |
| Exportable reports | CSV export on Reports and Audit pages | Export buttons |
| Role-based UI | Auth-gated pages; admin-only audit access | `_app.tsx` + Supabase RLS |
| Mobile responsive | Sidebar collapses on mobile; tables scroll horizontally | Layout.tsx responsive CSS |

---

## §5.1.10 — Vendor/Third-Party Risk Management

| CBN Requirement | Kori Feature | Evidence |
|----------------|-------------|---------|
| Documented dependencies | All libraries in `requirements.txt` and `package.json` with pinned versions | Repository files |
| Open-source components | Core: FastAPI, Next.js, Neo4j, Redis, Supabase — all established projects | Dependency list |
| Data sovereignty | Supabase region selectable (EU/US/Asia); can self-host | Supabase settings |
| Vendor exit plan | Neo4j → Memgraph (Cypher-compatible); Supabase → PostgreSQL; Render → any Docker host | Migration guide |
| SLA transparency | Platform SLAs: Render 99.9%, Supabase 99.9%, Upstash 99.99% | Vendor SLA documents |

---

## §5.1.11 — Fraud Monitoring and Detection

| CBN Requirement | Kori Feature | Evidence |
|----------------|-------------|---------|
| Real-time fraud detection | Sub-2-second pipeline from ingest to alert | System timing logs |
| Graph-based fraud ring detection | Neo4j community detection; shared IP/SIM/wallet connections | Fraud ring demo script |
| Nigerian payment rail awareness | NIBSS session ID support; Nigerian network prefix inference | `_infer_network()` in processor |
| Behavioural analytics | Off-hours detection, round-number structuring rules | `calculate_risk()` rules |
| Consortium intelligence | Blocklist shareable via API across institutions | `/blocklist` POST endpoint |
| AI/ML readiness | Rule engine → GNN upgrade path; labeled data pipeline designed | `train_gnn.py` stub |
| False positive optimisation | FP rate tracked; threshold adjustable per institution risk appetite | `RISK_THRESHOLD` env var |

---

## Summary Assessment

| Standard Section | Implementation Status | Priority for Phase 2 |
|-----------------|----------------------|---------------------|
| §5.1.1 CDD | 🟡 Partial | PEP screening, full KYC docs |
| §5.1.2 Sanctions Screening | 🟢 Implemented | Automated list refresh |
| §5.1.3 Transaction Monitoring | 🟢 Implemented | GNN model activation |
| §5.1.4 Regulatory Reporting | 🟡 Partial | goAML XML, NFIU direct API |
| §5.1.5 Travel Rule | 🟡 MVP | TRISA/Notabene integration |
| §5.1.6 Audit & Governance | 🟢 Implemented | Immutable append-only store |
| §5.1.7 Integration & Scalability | 🟢 Implemented | ISO-8583 native parser |
| §5.1.8 Security | 🟢 Implemented | Annual pen test |
| §5.1.9 UI & Customisation | 🟢 Implemented | White-labelling |
| §5.1.10 Vendor Risk | 🟢 Implemented | — |
| §5.1.11 Fraud Detection | 🟢 Implemented | GNN activation |

**Overall: 9/11 sections implemented or partially implemented at MVP.**

---

*Document version: 1.0 | Kori AML Platform | Seamount.io*
*CBN Circular: CMD/DIR/PUB/CIR/001006 dated March 31, 2026*