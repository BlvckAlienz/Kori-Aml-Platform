/**
 * KORI Compliance Audit Submission API
 * POST /api/submit-audit
 *
 * What happens when someone completes the audit:
 * 1. Saves the lead to Supabase (audit_submissions table)
 * 2. Sends a PDF-style HTML report to the user's email (via Resend)
 * 3. Sends a WhatsApp alert to the KORI team via OpenClaw
 * 4. Triggers the lead enrichment pipeline
 *
 * Place at: frontend/pages/api/submit-audit.ts
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AuditSubmission {
  contact: {
    name: string;
    email: string;
    institution: string;
    licenseType: string;
    title: string;
  };
  score: number;
  grade: string;
  gaps: Array<{
    section: string;
    cbnRef: string;
    issue: string;
    recommendation: string;
    urgency: "critical" | "high" | "medium";
  }>;
  answers: Record<string, number>;
  submittedAt: string;
}

// Lead score → sequence mapping
function getSequence(licenseType: string, score: number): string {
  const VASP_TYPES = ["VASP"];
  const DMB_TYPES = ["DMB"];

  if (VASP_TYPES.includes(licenseType)) return "vasp_pilot";
  if (DMB_TYPES.includes(licenseType)) return "dmb_urgent";
  return "standard_aml";
}

function getLicenseDeadline(licenseType: string): string {
  return licenseType === "DMB" ? "18 months (Q3 2027)" : "24 months (Q1 2028)";
}

function buildEmailHtml(submission: AuditSubmission): string {
  const { contact, score, grade, gaps } = submission;
  const gradeColor = { A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#dc2626", F: "#7f1d1d" }[grade] ?? "#dc2626";
  const criticalGaps = gaps.filter(g => g.urgency === "critical");
  const highGaps = gaps.filter(g => g.urgency === "high");
  const gradeLabel = {
    A: "Substantially Compliant",
    B: "Partially Compliant — Minor Gaps",
    C: "Partially Compliant — Significant Gaps",
    D: "Non-Compliant — Urgent Action Required",
    F: "Non-Compliant — Immediate Intervention Required",
  }[grade] ?? "Score Received";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#0a0f1e;color:#fff;font-family:system-ui,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 24px;">

  <div style="display:flex;align-items:center;gap:12px;margin-bottom:40px;">
    <div style="width:36px;height:36px;background:#00bcd4;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;">K</div>
    <span style="font-size:16px;font-weight:600;">KORI AML Intelligence</span>
  </div>

  <h1 style="font-size:24px;margin-bottom:8px;">Your CBN AML Compliance Report</h1>
  <p style="color:#64748b;margin-bottom:32px;">
    ${contact.institution} · ${contact.licenseType} · ${new Date(submission.submittedAt).toLocaleDateString("en-NG", { dateStyle: "long" })}
  </p>

  <div style="text-align:center;background:#111827;border-radius:16px;padding:32px;margin-bottom:32px;">
    <div style="font-size:72px;font-weight:800;color:${gradeColor};line-height:1;">${score}</div>
    <div style="font-size:14px;color:#64748b;margin-bottom:8px;">out of 100</div>
    <div style="font-size:18px;font-weight:600;color:${gradeColor};">${gradeLabel}</div>
    <div style="margin-top:16px;font-size:13px;color:#64748b;">
      Roadmap submission deadline: <strong style="color:#fff;">~June 8, 2026</strong><br>
      Deployment deadline: <strong style="color:#fff;">${getLicenseDeadline(contact.licenseType)}</strong>
    </div>
  </div>

  ${criticalGaps.length > 0 ? `
  <div style="background:#1a0a0a;border:1px solid #7f1d1d;border-radius:12px;padding:20px;margin-bottom:24px;">
    <h3 style="color:#ef4444;margin:0 0 16px;">${criticalGaps.length} Critical Gap${criticalGaps.length > 1 ? "s" : ""} Require Immediate Attention</h3>
    ${criticalGaps.map(gap => `
    <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #2d1515;">
      <div style="font-size:13px;color:#ef4444;font-weight:600;">CBN ${gap.cbnRef} — ${gap.section}</div>
      <div style="font-size:14px;color:#94a3b8;margin:4px 0;">${gap.issue}</div>
      <div style="font-size:14px;color:#00bcd4;">→ ${gap.recommendation}</div>
    </div>
    `).join("")}
  </div>
  ` : ""}

  ${highGaps.length > 0 ? `
  <div style="background:#111827;border:1px solid #92400e;border-radius:12px;padding:20px;margin-bottom:24px;">
    <h3 style="color:#f59e0b;margin:0 0 16px;">${highGaps.length} High-Priority Gap${highGaps.length > 1 ? "s" : ""}</h3>
    ${highGaps.map(gap => `
    <div style="margin-bottom:12px;">
      <div style="font-size:13px;color:#f59e0b;font-weight:600;">CBN ${gap.cbnRef} — ${gap.section}</div>
      <div style="font-size:14px;color:#94a3b8;margin:4px 0;">${gap.issue}</div>
      <div style="font-size:14px;color:#00bcd4;">→ ${gap.recommendation}</div>
    </div>
    `).join("")}
  </div>
  ` : ""}

  <div style="background:#0e3a4a;border:1px solid #00bcd4;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;">
    <h3 style="margin:0 0 12px;font-size:18px;">Next step: 20-minute KORI Demo</h3>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 20px;">
      We'll walk through exactly how KORI addresses each gap above —
      with a live demo on your institution's transaction type.
    </p>
    <a href="https://calendly.com/kori-seamount/demo?utm_source=audit_report&utm_medium=email&utm_campaign=${encodeURIComponent(contact.institution)}"
       style="display:inline-block;background:#00bcd4;color:#000;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;">
      Book a Demo →
    </a>
  </div>

  <div style="font-size:13px;color:#475569;border-top:1px solid #1e293b;padding-top:20px;">
    KORI is built for Nigerian and Kenyan financial institutions. CBN §5.1 aligned.<br>
    kori.seamount.io · <a href="mailto:hello@kori.seamount.io" style="color:#00bcd4;">hello@kori.seamount.io</a>
  </div>
</div>
</body>
</html>
  `.trim();
}

async function sendEmail(to: string, name: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping email send");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "KORI AML Intelligence <audit@kori.seamount.io>",
      to: [to],
      subject: "Your CBN AML Compliance Report",
      html,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Email send failed:", err);
  }
}

async function notifyTeamWhatsApp(submission: AuditSubmission): Promise<void> {
  // OpenClaw webhook — sends a WhatsApp message to the founder's number
  const webhookUrl = process.env.OPENCLAW_WEBHOOK_URL;
  if (!webhookUrl) return;

  const { contact, score, grade, gaps } = submission;
  const criticalCount = gaps.filter(g => g.urgency === "critical").length;
  const urgencyEmoji = score < 40 ? "🚨" : score < 60 ? "⚠️" : score < 80 ? "📋" : "✅";
  const sequence = getSequence(contact.licenseType, score);

  const message = `${urgencyEmoji} NEW AUDIT LEAD

*${contact.institution}*
${contact.title ? `${contact.title}` : ""}${contact.name ? ` · ${contact.name}` : ""}
License: ${contact.licenseType}
Score: *${score}/100* (Grade ${grade})
${criticalCount > 0 ? `⚠️ ${criticalCount} critical gaps identified\n` : ""}
Email: ${contact.email}
Sequence: ${sequence}

→ Add to OpenClaw: "add ${contact.institution} to ${sequence}"`;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, priority: score < 60 ? "high" : "normal" }),
    });
  } catch (err) {
    console.error("OpenClaw webhook failed:", err);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let submission: AuditSubmission;
  try {
    submission = req.body as AuditSubmission;
    if (!submission.contact?.email || !submission.contact?.institution) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  } catch {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    // 1. Save to Supabase
    const { error: dbError } = await supabase.from("audit_submissions").insert({
      contact_name: submission.contact.name,
      contact_email: submission.contact.email,
      institution: submission.contact.institution,
      license_type: submission.contact.licenseType,
      title: submission.contact.title,
      score: submission.score,
      grade: submission.grade,
      gaps: submission.gaps,
      answers: submission.answers,
      sequence: getSequence(submission.contact.licenseType, submission.score),
      submitted_at: submission.submittedAt,
      outreach_status: "not_contacted",
    });

    if (dbError) console.error("DB insert failed:", dbError);

    // 2. Send email report
    const emailHtml = buildEmailHtml(submission);
    await sendEmail(submission.contact.email, submission.contact.name, emailHtml);

    // 3. Notify team via WhatsApp/OpenClaw
    await notifyTeamWhatsApp(submission);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Audit submission error:", err);
    return res.status(500).json({ error: "Submission failed. Please try again." });
  }
}