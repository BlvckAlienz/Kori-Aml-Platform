/**
 * frontend/pages/index.tsx
 * Kori AML — Public Landing Page
 * Serves institutional clients, regulators, and VASPs
 * No auth required. CTAs: Book Demo + Sign Up
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';

const STATS = [
  { value: '<2s', label: 'Detection latency' },
  { value: '80%', label: 'Alert threshold' },
  { value: '11/11', label: 'CBN §5.1 sections' },
  { value: '2', label: 'Markets: NG + KE' },
];

const FEATURES = [
  {
    icon: '⬡',
    title: 'Graph-Based Fraud Ring Detection',
    body: 'Neo4j knowledge graph connects every transaction, device, SIM, wallet, and merchant in real time. See rings that flat data will never show you.',
    badge: 'Core Engine',
  },
  {
    icon: '◈',
    title: 'Real-Time Alert Intelligence',
    body: 'Sub-2-second pipeline from transaction to alert. Multi-factor risk scoring with explainable breakdowns every compliance officer can defend.',
    badge: 'CBN §5.1.3',
  },
  {
    icon: '◎',
    title: 'Immutable Audit Trail',
    body: 'Every action — alert status change, blocklist entry, API key creation — logged with analyst identity, timestamp and IP. Ready for the examiner.',
    badge: 'CBN §5.1.6',
  },
  {
    icon: '⊘',
    title: 'Consortium Blocklist Intelligence',
    body: 'One institution\'s confirmed fraudster becomes every institution\'s warning. Share hashed phone numbers, IPs, and wallets across the network.',
    badge: 'Unique',
  },
  {
    icon: '▦',
    title: 'Regulator-Ready Reporting',
    body: 'STR conversion rate, false positive rate, investigation turnaround time. Export audit evidence in one click. Your CBN submission package, built in.',
    badge: 'CBN §5.1.4',
  },
  {
    icon: '⇄',
    title: 'API-First Integration',
    body: 'One webhook call connects to any core banking system — Flexcube, T24, Finacle, or custom CBS. Live in 2 weeks, not 6 months.',
    badge: 'CBN §5.1.7',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Transaction arrives',
    body: 'Your core banking system sends a JSON webhook. Amount, account, phone, IP, channel. One API call.',
  },
  {
    step: '02',
    title: 'Graph engine processes',
    body: 'Kori scores the risk, checks the blocklist, updates the knowledge graph with new entity connections.',
  },
  {
    step: '03',
    title: 'Alert surfaces instantly',
    body: 'If risk ≥ threshold, an alert appears on the compliance dashboard with full explanation in under 2 seconds.',
  },
  {
    step: '04',
    title: 'Analyst investigates',
    body: 'Click the alert. See the entity graph — all connected accounts, devices, phones, wallets. Mark. Close. Export for CBN.',
  },
];

const COMPLIANCE = [
  { section: '§5.1.1', name: 'Customer Due Diligence', status: 'partial' },
  { section: '§5.1.2', name: 'Sanctions Screening', status: 'full' },
  { section: '§5.1.3', name: 'Transaction Monitoring', status: 'full' },
  { section: '§5.1.4', name: 'Regulatory Reporting', status: 'partial' },
  { section: '§5.1.5', name: 'Travel Rule (FATF R.16)', status: 'partial' },
  { section: '§5.1.6', name: 'Audit & Governance', status: 'full' },
  { section: '§5.1.7', name: 'System Integration', status: 'full' },
  { section: '§5.1.8', name: 'Security & Data Protection', status: 'full' },
  { section: '§5.1.9', name: 'User Interface', status: 'full' },
  { section: '§5.1.10', name: 'Vendor Risk Management', status: 'full' },
  { section: '§5.1.11', name: 'Fraud Detection', status: 'full' },
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [demoEmail, setDemoEmail] = useState('');
  const [demoInstitution, setDemoInstitution] = useState('');
  const [demoRole, setDemoRole] = useState('');
  const [demoType, setDemoType] = useState('');
  const [demoDesc, setDemoDesc] = useState('');
  const [demoSent, setDemoSent] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleDemoRequest = async () => {
    if (!demoEmail || !demoEmail.includes('@')) {
      return;
    }
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await sb.from('demo_requests').insert({
        institution:      demoInstitution || 'Not provided',
        email:            demoEmail,
        role:             demoRole || null,
        institution_type: demoType || null,
        description:      demoDesc || null,
      });
    } catch (e) {
      console.error('Demo request error:', e);
    }
    setDemoSent(true);
  };

  return (
    <>
      <Head>
        <title>Kori — AML Intelligence for Nigerian & Kenyan Financial Institutions</title>
        <meta name="description" content="Graph-based, real-time AML/CFT/CPF platform purpose-built for CBN and CBK-regulated institutions. Detect fraud rings in under 2 seconds." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <div className="land-root">
        {/* ── NAV ──────────────────────────────────────────────── */}
        <nav className={`land-nav ${scrolled ? 'scrolled' : ''}`}>
          <div className="nav-inner">
            <div className="nav-brand">
              <span className="nav-hex">⬡</span>
              <span className="nav-name">KORI</span>
            </div>
            <div className="nav-links">
              <a href="#features">Features</a>
              <a href="#compliance">Compliance</a>
              <a href="#how">How it works</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="nav-cta">
              <Link href="/login" className="btn-ghost">Sign in</Link>
              <a href="#demo" className="btn-cta-nav">Book a Demo</a>
            </div>
          </div>
        </nav>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-eyebrow">
              <span className="eyebrow-dot" />
              CBN Baseline Standards for Automated AML/CFT/CPF Solutions · March 2026
            </div>
            <h1 className="hero-h1">
              The Intelligence Layer
              <br />
              <span className="hero-accent">Nigerian & Kenyan</span>
              <br />
              Finance Deserves
            </h1>
            <p className="hero-sub">
              Graph-based, real-time AML platform that catches fraud rings traditional systems miss —
              built for CBN and CBK-regulated banks, fintechs, and VASPs.
              From transaction to alert in under 2 seconds.
            </p>
            <div className="hero-actions">
              <a href="#demo" className="btn-hero-primary">Book a Live Demo →</a>
              <Link href="/login" className="btn-hero-ghost">Access Platform</Link>
            </div>
            <div className="hero-note">
              No credit card required for demo · Implementation in 2 weeks
            </div>

            {/* Stats bar */}
            <div className="hero-stats">
              {STATS.map((s) => (
                <div key={s.label} className="hero-stat">
                  <div className="hero-stat-value">{s.value}</div>
                  <div className="hero-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Background graph grid decoration */}
          <div className="hero-grid" aria-hidden />
          <div className="hero-glow" aria-hidden />
        </section>

        {/* ── MARQUEE PROOF ────────────────────────────────────── */}
        <div className="marquee-band">
          <div className="marquee-inner">
            {[
              '🇳🇬 CBN Baseline Standards Compliant',
              '🇰🇪 CBK AML Guidelines Aligned',
              '⬡ Graph-Based Community Detection',
              '⚡ Sub-2-Second Detection',
              '◎ Immutable Audit Trails',
              '🔒 AES-256 Data Encryption',
              '⊘ NIBSS & M-PESA Rail Aware',
              '▦ STR & FATF Rec.16 Ready',
              '🇳🇬 CBN Baseline Standards Compliant',
              '🇰🇪 CBK AML Guidelines Aligned',
              '⬡ Graph-Based Community Detection',
              '⚡ Sub-2-Second Detection',
              '◎ Immutable Audit Trails',
            ].map((item, i) => (
              <span key={i} className="marquee-item">{item}</span>
            ))}
          </div>
        </div>

        {/* ── THE PROBLEM ──────────────────────────────────────── */}
        <section className="section problem-section">
          <div className="section-inner">
            <div className="problem-layout">
              <div className="problem-left">
                <div className="section-eyebrow">The Problem</div>
                <h2 className="section-h2">
                  Traditional AML sees transactions.
                  <br />
                  <span className="text-accent">Fraudsters operate in networks.</span>
                </h2>
                <p className="section-body">
                  Individually unremarkable transfers, from 'different' customers, across different days. Each one below the threshold.
                </p>
                <p className="section-body" style={{ marginTop: 16 }}>
                  Together? A coordinated network moving significant funds through your institution.
                  Your current system generates three unlinked alerts and calls it a day.
                </p>
              </div>
              <div className="problem-right">
                <div className="problem-stat-card red">
                  <div className="ps-value">45%</div>
                  <div className="ps-label">Avg false positive rate on rule-based systems</div>
                </div>
                <div className="problem-stat-card amber">
                  <div className="ps-value">3–5 days</div>
                  <div className="ps-label">Typical manual fraud ring investigation time</div>
                </div>
                <div className="problem-stat-card cyan">
                  <div className="ps-value">30 sec</div>
                  <div className="ps-label">Time for Kori to detect & surface a fraud ring</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────────── */}
        <section className="section" id="features">
          <div className="section-inner">
            <div className="section-eyebrow">Platform Capabilities</div>
            <h2 className="section-h2">
              Every tool your compliance team needs.
              <br />
              Nothing they don't.
            </h2>
            <div className="features-grid">
              {FEATURES.map((f) => (
                <div key={f.title} className="feature-card">
                  <div className="feature-icon">{f.icon}</div>
                  <div className="feature-badge">{f.badge}</div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-body">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────── */}
        <section className="section alt-section" id="how">
          <div className="section-inner">
            <div className="section-eyebrow">How It Works</div>
            <h2 className="section-h2">
              From transaction to evidence
              <br />
              in four steps.
            </h2>
            <div className="how-grid">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step.step} className="how-card">
                  <div className="how-step">{step.step}</div>
                  {i < HOW_IT_WORKS.length - 1 && <div className="how-connector" />}
                  <h3 className="how-title">{step.title}</h3>
                  <p className="how-body">{step.body}</p>
                </div>
              ))}
            </div>

            {/* Integration code snippet */}
            <div className="integration-box">
              <div className="int-label">Integration — One webhook call. Any core banking system.</div>
              <pre className="int-code">{`POST https://ingest.kori.seamount.io/webhook
Content-Type: application/json

{
  "transaction_id": "TXN_2026040500001",
  "user_id": "CUST_00123",
  "amount": 750000,
  "timestamp": "2026-04-05T09:15:00Z",
  "phone": "08099887766",
  "channel": "mobile",
  "nibss_session_id": "NSS202604050001"
}

// Response: { "status": "accepted", "risk_score": 0.80, "alert_created": true }`}</pre>
            </div>
          </div>
        </section>

        {/* ── CBN COMPLIANCE ───────────────────────────────────── */}
        <section className="section" id="compliance">
          <div className="section-inner">
            <div className="section-eyebrow">Regulatory Alignment</div>
            <h2 className="section-h2">
              Built against the CBN Baseline Standards.
              <br />
              Section by section.
            </h2>
            <p className="section-body" style={{ maxWidth: 600, marginBottom: 40 }}>
              The CBN does not certify vendors. Compliance is assessed at the institution level.
              Kori maps every feature to the exact requirement so your team can demonstrate
              effective, governed, and defensible AML/CFT/CPF controls.
            </p>
            <div className="compliance-grid">
              {COMPLIANCE.map((c) => (
                <div key={c.section} className="compliance-row">
                  <span className="comp-section">{c.section}</span>
                  <span className="comp-name">{c.name}</span>
                  <span className={`comp-badge ${c.status === 'full' ? 'badge-full' : 'badge-partial'}`}>
                    {c.status === 'full' ? '✓ Implemented' : '⟳ In Progress'}
                  </span>
                </div>
              ))}
            </div>
            <div className="comp-note">
              CMD/DIR/PUB/CIR/001006 · March 31, 2026 · Central Bank of Nigeria
            </div>
          </div>
        </section>

        {/* ── PRICING PREVIEW ──────────────────────────────────── */}
        <section className="section alt-section" id="pricing">
          <div className="section-inner">
            <div className="section-eyebrow">Pricing</div>
            <h2 className="section-h2">
              6× cheaper than the global alternatives.
              <br />
              Built for African institutions.
            </h2>
            <div className="pricing-preview-grid">
              {[
                { name: 'Starter', ng: '₦150,000', ke: 'KES 15,000', period: '/month', features: '10,000 tx · 3 users · Core monitoring', highlight: false },
                { name: 'Professional', ng: '₦450,000', ke: 'KES 45,000', period: '/month', features: '100,000 tx · 10 users · Graph detection + API + Travel Rule', highlight: true },
                { name: 'Growth', ng: '₦1,200,000', ke: 'KES 120,000', period: '/month', features: '1M tx · 25 users · Custom rules · Dedicated account manager', highlight: false },
              ].map((plan) => (
                <div key={plan.name} className={`pricing-preview-card ${plan.highlight ? 'highlight' : ''}`}>
                  {plan.highlight && <div className="pricing-popular">MOST POPULAR</div>}
                  <div className="pp-name">{plan.name}</div>
                  <div className="pp-price">
                    <span className="pp-ngn">{plan.ng}</span>
                    <span className="pp-sep"> · </span>
                    <span className="pp-kes">{plan.ke}</span>
                    <span className="pp-period">{plan.period}</span>
                  </div>
                  <div className="pp-features">{plan.features}</div>
                  <Link href="/login" className={`pp-btn ${plan.highlight ? 'pp-btn-primary' : 'pp-btn-ghost'}`}>
                    Get started →
                  </Link>
                </div>
              ))}
            </div>
            <p className="comp-note" style={{ marginTop: 24 }}>
              Enterprise plans available from ₦3,000,000/month · Custom SLA · VPC deployment ·
              <a href="#demo" style={{ color: 'var(--cyan)', marginLeft: 4 }}>Contact sales →</a>
            </p>
          </div>
        </section>

        {/* ── DEMO REQUEST ─────────────────────────────────────── */}
        <section className="section demo-section" id="demo">
          <div className="section-inner">
            <div className="demo-box">
              <div className="demo-left">
                <div className="section-eyebrow" style={{ color: 'var(--cyan)' }}>Live Demo</div>
                <h2 className="demo-h2">
                  See Kori detect a coordinated
                  <br />
                  fraud ring in under 30 seconds.
                </h2>
                <p className="demo-body">
                  We'll walk your compliance team through a live scenario:
                  ingest transactions, watch alerts fire, click into the graph,
                  and export your CBN evidence package. 30 minutes. No fluff.
                </p>
                <ul className="demo-list">
                  <li>Real-time transaction ingestion demo</li>
                  <li>Fraud ring graph visualization</li>
                  <li>Explainable AI risk breakdown</li>
                  <li>CBN compliance evidence walkthrough</li>
                  <li>Integration architecture Q&A</li>
                </ul>
              </div>
              <div className="demo-right">
                {demoSent ? (
                  <div className="demo-success">
                    <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                      Demo request received
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                      Our team will contact you at <strong>{demoEmail}</strong> within 24 hours
                      to schedule your session.
                    </div>
                  </div>
                ) : (
                  <div className="demo-form">
                    <div className="demo-form-title">Request a Demo</div>
                    <div className="demo-form-sub">For banks, fintechs, VASPs, and regulators</div>
                    <input
                      className="demo-input"
                      placeholder="Institution name"
                      type="text"
                      value={demoInstitution}
                      onChange={(e) => setDemoInstitution(e.target.value)}
                    />
                    <input
                      className="demo-input"
                      placeholder="Your work email"
                      type="email"
                      value={demoEmail}
                      onChange={(e) => setDemoEmail(e.target.value)}
                    />
                    <input
                      className="demo-input"
                      placeholder="Your role (e.g., CMLCO, Head of Compliance)"
                      type="text"
                      value={demoRole}
                      onChange={(e) => setDemoRole(e.target.value)}
                    />
                    <select
                      className="demo-input demo-select"
                      value={demoType}
                      onChange={(e) => setDemoType(e.target.value)}
                    >
                      <option value="">Institution type</option>
                      <option>Commercial Bank</option>
                      <option>Fintech / Payment Provider</option>
                      <option>VASP / Crypto Exchange</option>
                      <option>Microfinance Bank</option>
                      <option>Mobile Money Operator</option>
                      <option>Regulator / Government</option>
                      <option>Others</option>
                    </select>
                    <textarea
                      className="demo-input"
                      placeholder="Brief description of your compliance requirements or challenges…"
                      value={demoDesc}
                      onChange={(e) => setDemoDesc(e.target.value)}
                      rows={3}
                      style={{ resize: 'vertical', minHeight: 80 }}
                    />
                    <button className="demo-submit" onClick={handleDemoRequest}>
                      Request Live Demo →
                    </button>
                    <div style={{ textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      Or contact us directly:&nbsp;
                      <a href="mailto:Business@seamount.io" style={{ color: '#00d4ff' }}>Business@seamount.io</a>
                      &nbsp;·&nbsp;+254-751875374
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────── */}
        <footer className="land-footer">
          <div className="footer-inner">
            <div className="footer-brand">
              <span className="nav-hex">⬡</span>
              <span className="nav-name">KORI</span>
              <span className="footer-tagline">AML Intelligence Platform</span>
            </div>
            <div className="footer-links">
              <a href="#features">Features</a>
              <a href="#compliance">Compliance</a>
              <a href="#pricing">Pricing</a>
              <Link href="/login">Dashboard Login</Link>
              <a href="/legal/privacy-policy.html"  target="_blank" rel="noopener">Privacy Policy</a>
              <a href="/legal/terms-of-service.html" target="_blank" rel="noopener">Terms of Service</a>
            </div>
            <div className="footer-legal">
              © 2026 Kori · A Seamount.io Product · Built for CBN CMD/DIR/PUB/CIR/001006 (March 2026)
              <br />
              Kori is a technology enabler. Compliance is assessed at the institution level.
              The CBN does not certify or endorse AML vendors.
            </div>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          background: #070d1a;
          color: #e2e8f0;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 16px;
          -webkit-font-smoothing: antialiased;
        }

        :root {
          --cyan: #00d4ff;
          --cyan-dim: rgba(0,212,255,0.15);
          --cyan-glow: rgba(0,212,255,0.3);
          --amber: #f59e0b;
          --red: #ef4444;
          --green: #10b981;
          --border: #1a2f4a;
          --surface: #0d1525;
          --card: #111d30;
          --text: #e2e8f0;
          --text-dim: #94a3b8;
          --text-muted: #475569;
        }
      `}</style>

      <style jsx>{`
        .land-root { min-height: 100vh; background: #070d1a; }

        /* ── NAV ── */
        .land-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          padding: 0 40px;
          transition: background 0.3s, border-color 0.3s;
          border-bottom: 1px solid transparent;
        }
        .land-nav.scrolled {
          background: rgba(7,13,26,0.95);
          border-color: #1a2f4a;
          backdrop-filter: blur(12px);
        }
        .nav-inner {
          max-width: 1200px; margin: 0 auto;
          display: flex; align-items: center; gap: 40px; height: 72px;
        }
        .nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .nav-hex { font-size: 26px; color: #00d4ff; filter: drop-shadow(0 0 8px rgba(0,212,255,0.4)); }
        .nav-name { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 20px; letter-spacing: 0.12em; color: #fff; }
        .nav-links { display: flex; gap: 32px; margin-left: auto; }
        .nav-links a { color: #94a3b8; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.15s; }
        .nav-links a:hover { color: #e2e8f0; }
        .nav-cta { display: flex; align-items: center; gap: 12px; }
        .btn-ghost { color: #94a3b8; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.15s; }
        .btn-ghost:hover { color: #fff; }
        .btn-cta-nav {
          background: #00d4ff; color: #000; text-decoration: none;
          padding: 8px 20px; border-radius: 6px; font-size: 14px; font-weight: 600;
          font-family: 'Sora', sans-serif; letter-spacing: 0.04em;
          transition: all 0.15s;
        }
        .btn-cta-nav:hover { background: #33ddff; box-shadow: 0 0 20px rgba(0,212,255,0.4); }

        /* ── HERO ── */
        .hero {
          min-height: 100vh; display: flex; align-items: center;
          position: relative; overflow: hidden;
          padding: 120px 40px 80px;
        }
        .hero-inner { max-width: 1200px; margin: 0 auto; position: relative; z-index: 2; }

        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 12px; letter-spacing: 0.1em; color: #00d4ff;
          text-transform: uppercase; margin-bottom: 28px;
          border: 1px solid rgba(0,212,255,0.3);
          background: rgba(0,212,255,0.06);
          padding: 6px 14px; border-radius: 20px;
        }
        .eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #00d4ff; box-shadow: 0 0 6px #00d4ff;
          animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        .hero-h1 {
          font-family: 'Sora', sans-serif;
          font-size: clamp(42px, 6vw, 76px);
          font-weight: 800;
          line-height: 1.08;
          color: #fff;
          letter-spacing: -0.02em;
          margin-bottom: 28px;
        }
        .hero-accent { color: #00d4ff; }

        .hero-sub {
          font-size: 18px; line-height: 1.7;
          color: #94a3b8; max-width: 620px; margin-bottom: 40px;
        }
        .hero-actions { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
        .btn-hero-primary {
          background: #00d4ff; color: #000; text-decoration: none;
          padding: 16px 32px; border-radius: 8px;
          font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700;
          letter-spacing: 0.04em; transition: all 0.2s;
        }
        .btn-hero-primary:hover { background: #33ddff; box-shadow: 0 0 32px rgba(0,212,255,0.4); transform: translateY(-1px); }
        .btn-hero-ghost {
          color: #e2e8f0; text-decoration: none;
          padding: 16px 32px; border-radius: 8px;
          border: 1px solid #1a2f4a; font-size: 16px; font-weight: 500;
          transition: all 0.15s;
        }
        .btn-hero-ghost:hover { border-color: #00d4ff; color: #00d4ff; }
        .hero-note { font-size: 13px; color: #475569; margin-bottom: 60px; }

        .hero-stats {
          display: flex; gap: 48px; flex-wrap: wrap;
          border-top: 1px solid #1a2f4a; padding-top: 40px;
        }
        .hero-stat-value {
          font-family: 'Sora', sans-serif; font-size: 32px;
          font-weight: 700; color: #00d4ff; margin-bottom: 4px;
        }
        .hero-stat-label { font-size: 13px; color: #64748b; letter-spacing: 0.04em; }

        /* Grid decoration */
        .hero-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 0%, black 40%, transparent 100%);
        }
        .hero-glow {
          position: absolute; top: -200px; left: 50%;
          transform: translateX(-50%);
          width: 800px; height: 800px;
          background: radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 60%);
          pointer-events: none;
        }

        /* ── MARQUEE ── */
        .marquee-band {
          background: #0d1525; border-top: 1px solid #1a2f4a; border-bottom: 1px solid #1a2f4a;
          padding: 14px 0; overflow: hidden;
        }
        .marquee-inner {
          display: flex; gap: 48px; white-space: nowrap;
          animation: marquee 30s linear infinite;
        }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-item { font-size: 13px; color: #64748b; letter-spacing: 0.06em; flex-shrink: 0; }

        /* ── SECTIONS ── */
        .section { padding: 100px 40px; }
        .alt-section { background: #0a1120; }
        .section-inner { max-width: 1200px; margin: 0 auto; }
        .section-eyebrow {
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          color: #00d4ff; margin-bottom: 20px; font-weight: 600;
        }
        .section-h2 {
          font-family: 'Sora', sans-serif;
          font-size: clamp(28px, 4vw, 48px);
          font-weight: 700; line-height: 1.15;
          color: #fff; margin-bottom: 24px;
          letter-spacing: -0.01em;
        }
        .section-body { font-size: 16px; color: #94a3b8; line-height: 1.7; }
        .text-accent { color: #00d4ff; }

        /* ── PROBLEM ── */
        .problem-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
        .problem-right { display: flex; flex-direction: column; gap: 16px; }
        .problem-stat-card {
          padding: 24px; border-radius: 10px; border: 1px solid;
        }
        .problem-stat-card.red { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.25); }
        .problem-stat-card.amber { background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.25); }
        .problem-stat-card.cyan { background: rgba(0,212,255,0.08); border-color: rgba(0,212,255,0.25); }
        .ps-value {
          font-family: 'Sora', sans-serif; font-size: 36px; font-weight: 700; margin-bottom: 6px;
        }
        .problem-stat-card.red .ps-value { color: #ef4444; }
        .problem-stat-card.amber .ps-value { color: #f59e0b; }
        .problem-stat-card.cyan .ps-value { color: #00d4ff; }
        .ps-label { font-size: 14px; color: #94a3b8; line-height: 1.5; }

        /* ── FEATURES ── */
        .features-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 24px; margin-top: 60px;
        }
        .feature-card {
          background: #111d30; border: 1px solid #1a2f4a;
          border-radius: 10px; padding: 28px;
          transition: border-color 0.2s, transform 0.2s;
        }
        .feature-card:hover { border-color: rgba(0,212,255,0.4); transform: translateY(-2px); }
        .feature-icon { font-size: 28px; color: #00d4ff; margin-bottom: 12px; }
        .feature-badge {
          display: inline-block; font-size: 10px; letter-spacing: 0.1em;
          text-transform: uppercase; color: #00d4ff;
          background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.25);
          padding: 2px 8px; border-radius: 4px; margin-bottom: 14px;
        }
        .feature-title {
          font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 600;
          color: #fff; margin-bottom: 10px; line-height: 1.3;
        }
        .feature-body { font-size: 14px; color: #94a3b8; line-height: 1.7; }

        /* ── HOW ── */
        .how-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 0; margin: 60px 0; position: relative; }
        .how-card { padding: 0 32px 0 0; position: relative; }
        .how-step {
          font-family: 'JetBrains Mono', monospace;
          font-size: 40px; font-weight: 500;
          color: rgba(0,212,255,0.2); margin-bottom: 16px; line-height: 1;
        }
        .how-connector {
          position: absolute; top: 22px; right: 0;
          width: 100%; height: 1px;
          background: linear-gradient(90deg, #1a2f4a 0%, transparent 100%);
        }
        .how-title { font-family: 'Sora',sans-serif; font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 10px; }
        .how-body { font-size: 14px; color: #94a3b8; line-height: 1.7; }

        .integration-box {
          background: #0a1120; border: 1px solid #1a2f4a; border-radius: 10px;
          overflow: hidden; margin-top: 48px;
        }
        .int-label {
          padding: 12px 20px; border-bottom: 1px solid #1a2f4a;
          font-size: 12px; letter-spacing: 0.06em; color: #64748b;
        }
        .int-code {
          padding: 24px; font-family: 'JetBrains Mono', monospace;
          font-size: 13px; color: #94a3b8; line-height: 1.8;
          overflow-x: auto; white-space: pre;
        }

        /* ── COMPLIANCE ── */
        .compliance-grid { display: flex; flex-direction: column; gap: 0; border: 1px solid #1a2f4a; border-radius: 10px; overflow: hidden; }
        .compliance-row {
          display: flex; align-items: center; gap: 24px;
          padding: 14px 20px; border-bottom: 1px solid #1a2f4a;
          transition: background 0.15s;
        }
        .compliance-row:last-child { border-bottom: none; }
        .compliance-row:hover { background: rgba(255,255,255,0.02); }
        .comp-section {
          font-family: 'JetBrains Mono', monospace; font-size: 12px;
          color: #00d4ff; min-width: 70px;
        }
        .comp-name { flex: 1; font-size: 14px; color: #e2e8f0; }
        .comp-badge {
          font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 4px;
          letter-spacing: 0.06em;
        }
        .badge-full { background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
        .badge-partial { background: rgba(245,158,11,0.12); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
        .comp-note { font-size: 12px; color: #475569; margin-top: 16px; letter-spacing: 0.04em; }

        /* ── PRICING PREVIEW ── */
        .pricing-preview-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-top: 48px; }
        .pricing-preview-card {
          background: #111d30; border: 1px solid #1a2f4a;
          border-radius: 10px; padding: 28px; position: relative;
          transition: border-color 0.2s;
        }
        .pricing-preview-card.highlight { border-color: #00d4ff; box-shadow: 0 0 32px rgba(0,212,255,0.08); }
        .pricing-popular {
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          background: #00d4ff; color: #000;
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
          padding: 3px 14px; border-radius: 20px; white-space: nowrap;
        }
        .pp-name { font-family: 'Sora',sans-serif; font-weight: 600; font-size: 16px; color: #fff; margin-bottom: 12px; }
        .pp-price { margin-bottom: 14px; }
        .pp-ngn { font-family: 'Sora',sans-serif; font-size: 22px; font-weight: 700; color: #00d4ff; }
        .pp-sep { color: #475569; }
        .pp-kes { font-size: 16px; color: #94a3b8; }
        .pp-period { font-size: 14px; color: #64748b; margin-left: 4px; }
        .pp-features { font-size: 13px; color: #94a3b8; line-height: 1.6; margin-bottom: 20px; }
        .pp-btn {
          display: block; text-align: center; padding: 10px 20px;
          border-radius: 6px; font-size: 14px; font-weight: 600;
          text-decoration: none; transition: all 0.15s;
          font-family: 'Sora', sans-serif;
        }
        .pp-btn-primary { background: #00d4ff; color: #000; }
        .pp-btn-primary:hover { background: #33ddff; }
        .pp-btn-ghost { background: transparent; color: #94a3b8; border: 1px solid #1a2f4a; }
        .pp-btn-ghost:hover { border-color: #00d4ff; color: #00d4ff; }

        /* ── DEMO ── */
        .demo-section { background: #070d1a; }
        .demo-box {
          display: grid; grid-template-columns: 1fr 1fr; gap: 80px;
          align-items: start;
          background: #0d1525; border: 1px solid #1a2f4a;
          border-radius: 16px; padding: 60px;
        }
        .demo-h2 {
          font-family: 'Sora',sans-serif; font-size: 36px; font-weight: 700;
          color: #fff; line-height: 1.2; margin-bottom: 20px;
        }
        .demo-body { font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 28px; }
        .demo-list { padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
        .demo-list li { font-size: 14px; color: #94a3b8; display: flex; align-items: center; gap: 10px; }
        .demo-list li::before { content: '✓'; color: #10b981; font-weight: 700; }
        .demo-form { display: flex; flex-direction: column; gap: 12px; }
        .demo-form-title { font-family: 'Sora',sans-serif; font-size: 20px; font-weight: 600; color: #fff; margin-bottom: 4px; }
        .demo-form-sub { font-size: 13px; color: #64748b; margin-bottom: 8px; }
        .demo-input {
          background: #070d1a; border: 1px solid #1a2f4a;
          border-radius: 8px; padding: 12px 16px;
          font-size: 14px; color: #e2e8f0; font-family: 'DM Sans', sans-serif;
          outline: none; transition: border-color 0.15s; width: 100%;
        }
        .demo-input:focus { border-color: #00d4ff; }
        .demo-input::placeholder { color: #475569; }
        .demo-select { cursor: pointer; appearance: none; }
        .demo-submit {
          background: #00d4ff; color: #000; border: none;
          padding: 14px 24px; border-radius: 8px;
          font-family: 'Sora',sans-serif; font-weight: 700; font-size: 15px;
          cursor: pointer; transition: all 0.15s; letter-spacing: 0.04em;
        }
        .demo-submit:hover { background: #33ddff; box-shadow: 0 0 24px rgba(0,212,255,0.3); }
        .demo-privacy { font-size: 11px; color: #475569; text-align: center; }
        .demo-success {
          text-align: center; padding: 40px 20px;
          color: #10b981; background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.3); border-radius: 10px;
        }

        /* ── FOOTER ── */
        .land-footer { background: #0a1120; border-top: 1px solid #1a2f4a; padding: 60px 40px; }
        .footer-inner { max-width: 1200px; margin: 0 auto; }
        .footer-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
        .footer-tagline { font-size: 13px; color: #475569; margin-left: 8px; }
        .footer-links { display: flex; gap: 32px; flex-wrap: wrap; margin-bottom: 32px; }
        .footer-links a { color: #64748b; text-decoration: none; font-size: 14px; transition: color 0.15s; }
        .footer-links a:hover { color: #e2e8f0; }
        .footer-legal { font-size: 12px; color: #334155; line-height: 1.8; }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .problem-layout, .demo-box { grid-template-columns: 1fr; gap: 40px; }
          .features-grid, .pricing-preview-grid { grid-template-columns: 1fr 1fr; }
          .how-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
          .demo-box { padding: 32px; }
          .nav-links { display: none; }
        }
        @media (max-width: 600px) {
          .features-grid, .pricing-preview-grid, .how-grid { grid-template-columns: 1fr; }
          .hero { padding: 100px 20px 60px; }
          .section { padding: 60px 20px; }
          .hero-stats { gap: 28px; }
        }
      `}</style>
    </>
  );
}