"use client";

/**
 * KORI CBN Compliance Readiness Score Tool
 * The viral artifact: compliance officers answer 12 questions,
 * get a score mapped to CBN baseline standards, and their email
 * goes straight into the KORI sales pipeline.
 *
 * Place at: frontend/pages/compliance-audit.tsx
 * Or embed anywhere with: <ComplianceAuditTool />
 */

import { useState } from "react";
import Head from "next/head";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  section: string;
  cbnRef: string;
  text: string;
  weight: number;
  options: Option[];
}

interface Option {
  value: number;
  label: string;
  hint?: string;
}

interface AuditResult {
  score: number;
  maxScore: number;
  percentage: number;
  grade: "A" | "B" | "C" | "D" | "F";
  gradeLabel: string;
  gaps: Gap[];
  strengths: string[];
}

interface Gap {
  section: string;
  cbnRef: string;
  issue: string;
  recommendation: string;
  urgency: "critical" | "high" | "medium";
}

// ─── Questions ────────────────────────────────────────────────────────────────

const QUESTIONS: Question[] = [
  {
    id: "q1",
    section: "Transaction Monitoring",
    cbnRef: "§4.1",
    text: "How does your institution currently monitor transactions for suspicious activity?",
    weight: 15,
    options: [
      { value: 0, label: "Manual review only — staff flag suspicious transactions", hint: "Critical gap — CBN mandates automation" },
      { value: 4, label: "Rule-based system (e.g., if amount > threshold, flag)", hint: "Partially compliant — misses complex patterns" },
      { value: 10, label: "Automated system with basic ML/AI scoring" },
      { value: 15, label: "Real-time automated system with behavioral analytics and graph analysis" },
    ],
  },
  {
    id: "q2",
    section: "STR Filing",
    cbnRef: "§5.1.3",
    text: "How long does your institution typically take to file a Suspicious Transaction Report (STR) with the NFIU?",
    weight: 12,
    options: [
      { value: 0, label: "More than 72 hours", hint: "Non-compliant — CBN requires <24 hours" },
      { value: 4, label: "24-72 hours", hint: "At risk — CBN target is <24 hours" },
      { value: 9, label: "12-24 hours" },
      { value: 12, label: "Under 12 hours with automated report generation" },
    ],
  },
  {
    id: "q3",
    section: "Customer Risk Profiling",
    cbnRef: "§4.2",
    text: "How does your institution assign risk ratings to customers?",
    weight: 10,
    options: [
      { value: 0, label: "No formal risk rating system", hint: "Major compliance gap" },
      { value: 4, label: "Manual risk assessment during onboarding only" },
      { value: 7, label: "Automated risk rating at onboarding, reviewed periodically" },
      { value: 10, label: "Dynamic, real-time risk scoring updated with every transaction" },
    ],
  },
  {
    id: "q4",
    section: "Sanctions Screening",
    cbnRef: "§4.4",
    text: "How frequently does your institution screen customers against sanctions lists (OFAC, UN, CBN watchlists)?",
    weight: 10,
    options: [
      { value: 0, label: "At onboarding only", hint: "Significant gap — sanctions lists update daily" },
      { value: 4, label: "Weekly batch screening" },
      { value: 7, label: "Daily automated screening" },
      { value: 10, label: "Real-time screening on every transaction" },
    ],
  },
  {
    id: "q5",
    section: "Fraud Ring Detection",
    cbnRef: "§4.3",
    text: "Can your current system detect connected fraud networks (e.g., multiple accounts sharing one device, IP, or phone number)?",
    weight: 12,
    options: [
      { value: 0, label: "No — accounts are reviewed independently", hint: "Major blind spot for organized fraud" },
      { value: 4, label: "Partial — some manual linking of related accounts" },
      { value: 8, label: "Yes, with relationship mapping tools" },
      { value: 12, label: "Yes, with real-time graph analysis across all customer data" },
    ],
  },
  {
    id: "q6",
    section: "Audit Trail",
    cbnRef: "§5.1.6",
    text: "How does your institution maintain audit trails for AML decisions?",
    weight: 8,
    options: [
      { value: 0, label: "Spreadsheets or email records", hint: "High regulatory risk — not audit-ready" },
      { value: 3, label: "Database logs, manually maintained" },
      { value: 6, label: "Automated logging with limited search capability" },
      { value: 8, label: "Immutable, searchable audit log with CBN-standard fields" },
    ],
  },
  {
    id: "q7",
    section: "Regulatory Reporting",
    cbnRef: "§5.1.4",
    text: "How are compliance effectiveness reports prepared for regulators?",
    weight: 8,
    options: [
      { value: 0, label: "Manual — spreadsheets and documents compiled before audits", hint: "Inefficient and high-risk" },
      { value: 3, label: "Semi-automated with significant manual work" },
      { value: 6, label: "Automated with defined templates" },
      { value: 8, label: "Real-time dashboard with one-click CBN report export" },
    ],
  },
  {
    id: "q8",
    section: "Digital Channel Coverage",
    cbnRef: "§4.1",
    text: "Which transaction channels are covered by your AML monitoring?",
    weight: 8,
    options: [
      { value: 0, label: "Core banking only (excludes mobile, USSD, POS, web)", hint: "Significant coverage gap" },
      { value: 3, label: "Core banking + some digital channels" },
      { value: 6, label: "Most channels monitored, some gaps" },
      { value: 8, label: "All channels: mobile, USSD, POS, web, API, agent network" },
    ],
  },
  {
    id: "q9",
    section: "VASP / Crypto Monitoring",
    cbnRef: "FATF R.16",
    text: "If your institution serves VASPs or processes crypto transactions, how are they monitored?",
    weight: 7,
    options: [
      { value: 0, label: "Not applicable — we don't serve VASPs", hint: "N/A — skip" },
      { value: 0, label: "We serve VASPs but have no specialized monitoring", hint: "Critical — CBN pilot requires this" },
      { value: 4, label: "Basic transaction monitoring applied to crypto" },
      { value: 7, label: "Blockchain analytics + Travel Rule compliance + enhanced monitoring" },
    ],
  },
  {
    id: "q10",
    section: "Staff Training",
    cbnRef: "§6.2",
    text: "How frequently does your institution conduct AML/CFT training for staff?",
    weight: 5,
    options: [
      { value: 0, label: "No formal training programme", hint: "Regulatory requirement" },
      { value: 2, label: "Annual training only" },
      { value: 4, label: "Quarterly training with documented completion" },
      { value: 5, label: "Regular training + real-time alerts for new typologies" },
    ],
  },
  {
    id: "q11",
    section: "CBN Roadmap Readiness",
    cbnRef: "March 2026 Circular",
    text: "Has your institution started preparing the implementation roadmap required by the CBN within 90 days of the March 2026 circular?",
    weight: 5,
    options: [
      { value: 0, label: "We haven't started", hint: "Deadline: approximately June 8, 2026" },
      { value: 2, label: "We're aware of it but not yet started" },
      { value: 3, label: "Early planning stage — no vendor selected" },
      { value: 5, label: "Roadmap drafted, vendor evaluation in progress" },
    ],
  },
  {
    id: "q12",
    section: "False Positive Rate",
    cbnRef: "§5.1.4",
    text: "What is your institution's approximate false positive rate on fraud alerts?",
    weight: 0,
    options: [
      { value: 0, label: "We don't track this metric", hint: "CBN target: <30% false positives" },
      { value: 0, label: ">50% — majority of alerts are false positives" },
      { value: 0, label: "30-50%" },
      { value: 0, label: "<30% — within CBN target" },
    ],
  },
];

// ─── Scoring Logic ─────────────────────────────────────────────────────────────

function calculateResult(answers: Record<string, number>): AuditResult {
  const maxScore = QUESTIONS.reduce((sum, q) => sum + q.weight, 0);
  const score = Object.entries(answers).reduce((sum, [qId, optIdx]) => {
    const q = QUESTIONS.find((q) => q.id === qId);
    if (!q) return sum;
    return sum + (q.options[optIdx]?.value ?? 0);
  }, 0);

  const percentage = Math.round((score / maxScore) * 100);

  const grade =
    percentage >= 85 ? "A" :
    percentage >= 70 ? "B" :
    percentage >= 55 ? "C" :
    percentage >= 40 ? "D" : "F";

  const gradeLabel = {
    A: "Substantially Compliant",
    B: "Partially Compliant — Minor Gaps",
    C: "Partially Compliant — Significant Gaps",
    D: "Non-Compliant — Urgent Action Required",
    F: "Non-Compliant — Immediate Intervention Required",
  }[grade];

  const gaps: Gap[] = [];
  const strengths: string[] = [];

  QUESTIONS.forEach((q) => {
    const selectedIdx = answers[q.id] ?? -1;
    if (selectedIdx === -1) return;
    const selectedVal = q.options[selectedIdx]?.value ?? 0;
    const maxVal = q.weight;
    const gapPct = selectedVal / maxVal;

    if (gapPct < 0.5) {
      gaps.push({
        section: q.section,
        cbnRef: q.cbnRef,
        issue: q.options[selectedIdx]?.label ?? "",
        recommendation: getRecommendation(q.id, selectedIdx),
        urgency: gapPct === 0 ? "critical" : selectedVal < maxVal * 0.3 ? "high" : "medium",
      });
    } else if (gapPct >= 0.8) {
      strengths.push(`${q.section} (${q.cbnRef})`);
    }
  });

  gaps.sort((a, b) =>
    a.urgency === "critical" ? -1 : b.urgency === "critical" ? 1 :
    a.urgency === "high" ? -1 : 1
  );

  return { score, maxScore, percentage, grade, gradeLabel, gaps, strengths };
}

function getRecommendation(questionId: string, optionIdx: number): string {
  const recs: Record<string, string[]> = {
    q1: [
      "Deploy real-time automated transaction monitoring. KORI's graph engine monitors all channels simultaneously.",
      "Upgrade from rule-based to AI-powered monitoring. Graph ML catches patterns rules miss.",
      "Add behavioral analytics and entity relationship analysis to your existing system.",
      "Your monitoring is strong. Consider consortium blocklist sharing.",
    ],
    q2: [
      "Implement automated STR generation to meet CBN's <24 hour requirement. KORI generates STRs automatically.",
      "Reduce filing time with automated case management and pre-populated STR templates.",
      "Automate the final steps of STR submission to hit the <12 hour target.",
      "Excellent. Consider automated NFIU submission integration.",
    ],
    q3: [
      "Implement dynamic customer risk profiling linked to transaction behavior.",
      "Upgrade to continuous risk assessment — static onboarding scores miss evolving behavior.",
      "Add real-time transaction-triggered risk score updates.",
      "Strong risk profiling. Consider cross-institutional consortium scores.",
    ],
    q4: [
      "Implement real-time sanctions screening on every transaction. Lists update daily.",
      "Move from weekly to daily screening immediately.",
      "Add real-time screening to close the gap between list updates and screening.",
      "Real-time screening is the gold standard. Maintain this.",
    ],
    q5: [
      "Deploy graph-based relationship analysis — the single highest-impact change for fraud ring detection.",
      "Automate entity linking across accounts, devices, phones, and IPs.",
      "Add graph ML for community detection across your entity network.",
      "Excellent capability. Consider consortium graph sharing.",
    ],
    q6: [
      "Implement immutable audit logging. Spreadsheets are not audit-ready.",
      "Upgrade to automated, searchable logs with CBN-standard fields.",
      "Add immutability guarantees and structured query capability.",
      "Gold standard audit trail. Maintain and document your process.",
    ],
    q7: [
      "Deploy automated reporting with one-click CBN report export.",
      "Reduce manual work with automated report templates.",
      "Add real-time effectiveness metrics aligned to CBN §5.1 standards.",
      "Excellent reporting capability.",
    ],
    q8: [
      "Extend monitoring to all digital channels immediately — critical gap.",
      "Add USSD, mobile, and agent network channels to monitoring.",
      "Close remaining coverage gaps — prioritize highest-volume uncovered channels.",
      "Full channel coverage — strong baseline.",
    ],
    q9: [
      "N/A for this institution.",
      "Deploy crypto-specific monitoring and Travel Rule compliance immediately — CBN pilot requires this.",
      "Add blockchain analytics for wallet risk scoring and Travel Rule data exchange.",
      "Strong VASP compliance posture.",
    ],
    q10: [
      "Establish a formal AML training programme immediately.",
      "Increase training frequency and add new typology alerts.",
      "Good training cadence. Add real-time typology alerts from intelligence feeds.",
      "Excellent training programme.",
    ],
    q11: [
      "Start your CBN roadmap immediately. The 90-day deadline is approaching.",
      "Accelerate planning — KORI can be deployed in weeks, not months.",
      "Evaluate vendors now — KORI offers the fastest path to compliance.",
      "Good progress. KORI can accelerate your timeline.",
    ],
    q12: [
      "Implement false positive tracking as a priority.",
      "Use ML-based risk scoring to reduce false positives significantly.",
      "Graph-based contextual scoring reduces false positives below the CBN 30% target.",
      "Excellent false positive rate — maintain with continuous calibration.",
    ],
  };
  return recs[questionId]?.[optionIdx] ?? "Review this area against CBN baseline standards.";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComplianceAuditPage() {
  const [step, setStep] = useState<"intro" | "questions" | "contact" | "result">("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [contactInfo, setContactInfo] = useState({
    name: "", email: "", institution: "", licenseType: "", title: ""
  });
  const [result, setResult] = useState<AuditResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = QUESTIONS[currentQ];
  const progress = Math.round((currentQ / QUESTIONS.length) * 100);

  function handleAnswer(optionIdx: number) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIdx }));
  }

  function handleNext() {
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ((q) => q + 1);
    } else {
      const r = calculateResult(answers);
      setResult(r);
      setStep("contact");
    }
  }

  function handleBack() {
    if (currentQ > 0) setCurrentQ((q) => q - 1);
  }

  async function handleSubmit() {
    if (!result) return;
    setSubmitting(true);
    try {
      await fetch("/api/submit-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: contactInfo,
          score: result.percentage,
          grade: result.grade,
          gaps: result.gaps,
          answers,
          submittedAt: new Date().toISOString(),
        }),
      });
      setSubmitted(true);
      setStep("result");
    } catch (err) {
      console.error("Submission error:", err);
      setStep("result");
    } finally {
      setSubmitting(false);
    }
  }

  const gradeColor = {
    A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#dc2626", F: "#7f1d1d"
  }[result?.grade ?? "F"];

  // ─── Intro Screen ────────────────────────────────────────────────────────────
  if (step === "intro") {
    return (
      <>
        <Head>
          <title>Free CBN AML Compliance Audit — KORI</title>
          <meta name="description" content="Get your institution's CBN AML compliance score in 5 minutes. Free audit mapped to CBN Baseline Standards §4-6. Download your report." />
        </Head>
        <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 24px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
              <div style={{ width: 40, height: 40, background: "#00bcd4", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 20 }}>K</span>
              </div>
              <span style={{ fontSize: 18, fontWeight: 600 }}>KORI AML Intelligence</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748b", border: "1px solid #1e293b", padding: "4px 12px", borderRadius: 20 }}>NGKE CBN · CBK Aligned</span>
            </div>

            <div style={{ background: "#00bcd4", color: "#000", fontSize: 12, fontWeight: 700, letterSpacing: 2, padding: "8px 16px", borderRadius: 4, display: "inline-block", marginBottom: 24 }}>
              FREE COMPLIANCE AUDIT
            </div>

            <h1 style={{ fontSize: 42, fontWeight: 700, lineHeight: 1.15, marginBottom: 20 }}>
              Is your institution ready for the CBN AML deadline?
            </h1>

            <p style={{ fontSize: 18, color: "#94a3b8", lineHeight: 1.7, marginBottom: 32 }}>
              The CBN's March 2026 circular requires every regulated institution to submit
              an implementation roadmap within <strong style={{ color: "#fff" }}>90 days</strong>.
              Answer 12 questions and get your compliance score mapped to the exact CBN
              baseline standards — free, in 5 minutes.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 40 }}>
              {[
                { label: "Questions", value: "12" },
                { label: "Time to complete", value: "~5 mins" },
                { label: "CBN sections covered", value: "§4.1 – §6.2" },
                { label: "Institutions scored", value: "100% free" },
              ].map((item) => (
                <div key={item.label} style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: "20px 24px" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#00bcd4" }}>{item.value}</div>
                  <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>{item.label}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep("questions")}
              style={{
                background: "#00bcd4", color: "#000", border: "none", borderRadius: 8,
                padding: "16px 40px", fontSize: 18, fontWeight: 700, cursor: "pointer",
                width: "100%", marginBottom: 16
              }}
            >
              Start Free Audit →
            </button>
            <p style={{ textAlign: "center", color: "#475569", fontSize: 14 }}>
              No credit card required. You'll receive a PDF report by email.
            </p>
          </div>
        </div>
      </>
    );
  }

  // ─── Questions Screen ─────────────────────────────────────────────────────────
  if (step === "questions") {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px" }}>
          {/* Progress */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: "#64748b" }}>Question {currentQ + 1} of {QUESTIONS.length}</span>
              <span style={{ fontSize: 14, color: "#00bcd4" }}>{progress}% complete</span>
            </div>
            <div style={{ height: 4, background: "#1e293b", borderRadius: 2 }}>
              <div style={{ height: 4, background: "#00bcd4", width: `${progress}%`, borderRadius: 2, transition: "width 0.3s" }} />
            </div>
          </div>

          {/* Question */}
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "#00bcd4", fontWeight: 600 }}>
              {currentQuestion.section} — CBN {currentQuestion.cbnRef}
            </span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 32, lineHeight: 1.4 }}>
            {currentQuestion.text}
          </h2>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
            {currentQuestion.options.map((opt, idx) => {
              const selected = answers[currentQuestion.id] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  style={{
                    background: selected ? "#0e3a4a" : "#111827",
                    border: `2px solid ${selected ? "#00bcd4" : "#1e293b"}`,
                    borderRadius: 10, padding: "16px 20px", textAlign: "left",
                    cursor: "pointer", color: "#fff", transition: "all 0.15s"
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: selected ? 600 : 400 }}>{opt.label}</div>
                  {opt.hint && (
                    <div style={{ fontSize: 12, color: selected ? "#00bcd4" : "#ef4444", marginTop: 4 }}>
                      ⚠ {opt.hint}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", gap: 12 }}>
            {currentQ > 0 && (
              <button onClick={handleBack} style={{
                background: "transparent", border: "1px solid #1e293b", color: "#64748b",
                borderRadius: 8, padding: "12px 24px", cursor: "pointer", fontSize: 15
              }}>
                ← Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={answers[currentQuestion.id] === undefined}
              style={{
                flex: 1, background: answers[currentQuestion.id] !== undefined ? "#00bcd4" : "#1e293b",
                color: answers[currentQuestion.id] !== undefined ? "#000" : "#475569",
                border: "none", borderRadius: 8, padding: "12px 24px",
                cursor: answers[currentQuestion.id] !== undefined ? "pointer" : "not-allowed",
                fontSize: 15, fontWeight: 600
              }}
            >
              {currentQ < QUESTIONS.length - 1 ? "Next →" : "Calculate My Score →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Contact Screen ───────────────────────────────────────────────────────────
  if (step === "contact" && result) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "60px 24px" }}>
          {/* Score preview */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 72, fontWeight: 800, color: gradeColor, lineHeight: 1 }}>
              {result.percentage}
            </div>
            <div style={{ fontSize: 18, color: "#94a3b8", marginBottom: 8 }}>out of 100</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: gradeColor }}>{result.gradeLabel}</div>
            {result.gaps.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 14, color: "#94a3b8" }}>
                {result.gaps.filter(g => g.urgency === "critical").length} critical gaps identified
              </div>
            )}
          </div>

          <h2 style={{ fontSize: 24, marginBottom: 8 }}>Get your full report</h2>
          <p style={{ color: "#64748b", marginBottom: 32, fontSize: 15 }}>
            We'll email your detailed report with gap analysis, CBN section mapping,
            and specific remediation steps.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { key: "name", label: "Your name", type: "text", placeholder: "First and last name" },
              { key: "title", label: "Your title", type: "text", placeholder: "e.g. Chief Compliance Officer" },
              { key: "institution", label: "Institution name", type: "text", placeholder: "e.g. Flutterwave, GTBank" },
              { key: "licenseType", label: "License type", type: "select", options: ["DMB", "PSP", "MMO", "VASP", "MFB", "FC", "PMB", "Other"] },
              { key: "email", label: "Work email", type: "email", placeholder: "compliance@yourbank.com" },
            ].map((field) => (
              <div key={field.key}>
                <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>{field.label}</label>
                {field.type === "select" ? (
                  <select
                    value={contactInfo[field.key as keyof typeof contactInfo]}
                    onChange={(e) => setContactInfo((p) => ({ ...p, [field.key]: e.target.value }))}
                    style={{ width: "100%", background: "#111827", border: "1px solid #1e293b", color: "#fff", borderRadius: 8, padding: "12px 16px", fontSize: 15 }}
                  >
                    <option value="">Select license type</option>
                    {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={contactInfo[field.key as keyof typeof contactInfo]}
                    onChange={(e) => setContactInfo((p) => ({ ...p, [field.key]: e.target.value }))}
                    style={{ width: "100%", background: "#111827", border: "1px solid #1e293b", color: "#fff", borderRadius: 8, padding: "12px 16px", fontSize: 15, boxSizing: "border-box" }}
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!contactInfo.name || !contactInfo.email || !contactInfo.institution || submitting}
            style={{
              width: "100%", marginTop: 24, padding: "16px", background: "#00bcd4",
              color: "#000", border: "none", borderRadius: 8, fontSize: 17,
              fontWeight: 700, cursor: "pointer"
            }}
          >
            {submitting ? "Sending..." : "Get My Full Compliance Report →"}
          </button>
          <p style={{ textAlign: "center", color: "#475569", fontSize: 13, marginTop: 12 }}>
            No spam. Just your compliance report and a follow-up from our team.
          </p>
        </div>
      </div>
    );
  }

  // ─── Results Screen ───────────────────────────────────────────────────────────
  if (step === "result" && result) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 80, fontWeight: 800, color: gradeColor }}>{result.percentage}</div>
            <div style={{ fontSize: 16, color: "#64748b" }}>CBN Compliance Score</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: gradeColor, marginTop: 8 }}>{result.gradeLabel}</div>
          </div>

          {/* Gaps */}
          {result.gaps.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <h3 style={{ fontSize: 18, marginBottom: 20, color: "#ef4444" }}>
                🚨 Compliance Gaps Identified ({result.gaps.length})
              </h3>
              {result.gaps.map((gap, i) => (
                <div key={i} style={{ background: "#111827", border: `1px solid ${gap.urgency === "critical" ? "#7f1d1d" : gap.urgency === "high" ? "#92400e" : "#1e293b"}`, borderRadius: 10, padding: 20, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontWeight: 600 }}>{gap.section}</span>
                    <span style={{ fontSize: 12, color: gap.urgency === "critical" ? "#ef4444" : gap.urgency === "high" ? "#f59e0b" : "#94a3b8", background: "#0a0f1e", padding: "2px 10px", borderRadius: 10 }}>
                      {gap.urgency.toUpperCase()} · CBN {gap.cbnRef}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 8 }}>Current: {gap.issue}</div>
                  <div style={{ fontSize: 14, color: "#00bcd4" }}>→ {gap.recommendation}</div>
                </div>
              ))}
            </div>
          )}

          {/* Strengths */}
          {result.strengths.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <h3 style={{ fontSize: 18, marginBottom: 16, color: "#16a34a" }}>✅ Compliance Strengths</h3>
              {result.strengths.map((s, i) => (
                <div key={i} style={{ background: "#0a1a14", border: "1px solid #14532d", borderRadius: 8, padding: "12px 16px", marginBottom: 8, fontSize: 14 }}>
                  {s}
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div style={{ background: "#0e3a4a", border: "1px solid #00bcd4", borderRadius: 16, padding: 32, textAlign: "center" }}>
            <h3 style={{ fontSize: 22, marginBottom: 12 }}>See KORI close these gaps in 20 minutes</h3>
            <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: 15 }}>
              KORI is built specifically for {contactInfo.licenseType || "Nigerian"} institutions.
              We'll show you exactly how to address each gap flagged above.
            </p>
            <a
              href="https://calendly.com/kori-seamount/demo"
              style={{ display: "inline-block", background: "#00bcd4", color: "#000", padding: "14px 36px", borderRadius: 8, fontWeight: 700, fontSize: 16, textDecoration: "none" }}
            >
              Book a 20-minute Demo →
            </a>
          </div>

          <div style={{ marginTop: 24, textAlign: "center" }}>
            <button onClick={() => window.print()} style={{ background: "transparent", border: "1px solid #1e293b", color: "#64748b", borderRadius: 8, padding: "10px 24px", cursor: "pointer" }}>
              Download PDF Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}