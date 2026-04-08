/**
 * frontend/pages/pricing.tsx
 * Fixes in this version:
 * 1. ALL plan buttons clickable — fallback to mailto if env vars not set yet
 * 2. Enterprise "Contact Sales" reveals email + phone, no mailto friction
 * 3. Tier alignment: Starter / Professional / Growth / Enterprise
 * 4. Higher contrast text throughout
 */
import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// ─── Plan definitions ─────────────────────────────────────────────────────
const NG_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price_ngn: 150_000,
    price_display: '₦150,000',
    period: '/month',
    txLimit: '10,000 tx/month',
    users: '3 users',
    apiLimit: '5,000 API req/day',
    planCode: process.env.NEXT_PUBLIC_PAYSTACK_STARTER_PLAN || '',
    color: '#10b981',
    badge: 'badge-green',
    highlight: false,
    features: [
      'Real-time transaction monitoring',
      'Risk scoring engine',
      'Alert management dashboard',
      'Blocklist management',
      'Audit log (CBN §5.1.6)',
      'Email support',
    ],
    not_included: ['Graph fraud ring detection', 'API access', 'Travel Rule module'],
  },
  {
    id: 'professional',
    name: 'Professional',
    price_ngn: 450_000,
    price_display: '₦450,000',
    period: '/month',
    txLimit: '100,000 tx/month',
    users: '10 users',
    apiLimit: '10,000 API req/day',
    planCode: process.env.NEXT_PUBLIC_PAYSTACK_PRO_PLAN || '',
    color: 'var(--cyan)',
    badge: 'badge-cyan',
    highlight: true,
    features: [
      'Everything in Starter',
      'Graph-based fraud ring detection',
      'Full API access (10,000 req/day)',
      'CBN compliance reports',
      'Travel Rule module (FATF R.16)',
      'Risk breakdown (explainable AI)',
      'Priority support',
    ],
    not_included: ['Custom risk rules', 'Dedicated instance'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price_ngn: 1_200_000,
    price_display: '₦1,200,000',
    period: '/month',
    txLimit: '1,000,000 tx/month',
    users: '25 users',
    apiLimit: '50,000 API req/day',
    planCode: process.env.NEXT_PUBLIC_PAYSTACK_GROWTH_PLAN || '',
    color: 'var(--amber)',
    badge: 'badge-amber',
    highlight: false,
    features: [
      'Everything in Professional',
      'Unlimited API access',
      'Custom risk rules',
      'Bulk blocklist import',
      'Dedicated account manager',
      'CBN evidence package included',
      'SLA: 99.9% uptime guarantee',
    ],
    not_included: [],
  },
];

const KE_PLANS = [
  {
    id: 'starter_ke',
    name: 'Starter',
    price_kes: 15_000,
    price_display: 'KES 15,000',
    period: '/month',
    txLimit: '10,000 tx/month',
    users: '3 users',
    apiLimit: '5,000 API req/day',
    planId: process.env.NEXT_PUBLIC_FLW_STARTER_PLAN_ID || '',
    color: '#10b981',
    badge: 'badge-green',
    highlight: false,
    features: [
      'Real-time transaction monitoring',
      'M-PESA channel intelligence',
      'Safaricom/Airtel/Equitel detection',
      'Risk scoring engine',
      'Alert management dashboard',
      'Blocklist management',
      'Audit log (CBK compliance)',
      'Email support',
    ],
    not_included: ['Graph fraud ring detection', 'API access'],
  },
  {
    id: 'professional_ke',
    name: 'Professional',
    price_kes: 45_000,
    price_display: 'KES 45,000',
    period: '/month',
    txLimit: '100,000 tx/month',
    users: '10 users',
    apiLimit: '10,000 API req/day',
    planId: process.env.NEXT_PUBLIC_FLW_PRO_PLAN_ID || '',
    color: 'var(--cyan)',
    badge: 'badge-cyan',
    highlight: true,
    features: [
      'Everything in Starter',
      'Graph-based fraud ring detection',
      'Full API access (10,000 req/day)',
      'M-PESA single-limit breach detection',
      'Travel Rule module',
      'CBK compliance reports',
      'Priority support',
    ],
    not_included: ['Custom risk rules', 'Dedicated instance'],
  },
  {
    id: 'growth_ke',
    name: 'Growth',
    price_kes: 120_000,
    price_display: 'KES 120,000',
    period: '/month',
    txLimit: '1,000,000 tx/month',
    users: '25 users',
    apiLimit: '50,000 API req/day',
    planId: process.env.NEXT_PUBLIC_FLW_GROWTH_PLAN_ID || '',
    color: 'var(--amber)',
    badge: 'badge-amber',
    highlight: false,
    features: [
      'Everything in Professional',
      'Unlimited API access',
      'Custom risk rules',
      'Equitel & Faiba intelligence',
      'Dedicated account manager',
      'SLA: 99.9% uptime guarantee',
    ],
    not_included: [],
  },
];

function usePaystackScript() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).PaystackPop) { setLoaded(true); return; }
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v2/inline.js';
    s.onload = () => setLoaded(true);
    document.head.appendChild(s);
  }, []);
  return loaded;
}

function useFlutterwaveScript() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).FlutterwaveCheckout) { setLoaded(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.flutterwave.com/v3.js';
    s.onload = () => setLoaded(true);
    document.head.appendChild(s);
  }, []);
  return loaded;
}

export default function Pricing() {
  const [market, setMarket] = useState<'NG' | 'KE'>('NG');
  const [user, setUser] = useState<any>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [showEnterpriseCTA, setShowEnterpriseCTA] = useState(false);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  const paystackLoaded = usePaystackScript();
  const flutterwaveLoaded = useFlutterwaveScript();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const notifyUpgrade = useCallback(async (tier: string, reference: string, provider: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API}/upgrade-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ tier, reference, provider }),
      });
      if (res.ok) {
        showToast(`✓ Plan upgraded to ${tier}! API key limits updated.`, 'success');
      } else {
        showToast('Payment received but upgrade failed. Email Business@seamount.io', 'error');
      }
    } catch {
      showToast('Network error. Email Business@seamount.io', 'error');
    }
  }, []);

  const handlePaystack = useCallback((plan: typeof NG_PLANS[0]) => {
    if (!user) {
      showToast('Please sign in first to subscribe', 'error');
      return;
    }
    // Fallback if plan codes not yet configured in env vars
    if (!plan.planCode) {
      const subject = encodeURIComponent(`Kori ${plan.name} Plan Subscription (NGN)`);
      const body = encodeURIComponent(
        `I would like to subscribe to the ${plan.name} plan at ${plan.price_display}/month.\n\nEmail: ${user.email}\nInstitution: \nPhone: `
      );
      window.open(`mailto:Business@seamount.io?subject=${subject}&body=${body}`, '_blank');
      showToast('Opening email — our team will set up your subscription within 24h', 'success');
      return;
    }
    if (!paystackLoaded) {
      showToast('Payment system loading, please try again in a moment', 'error');
      return;
    }
    setProcessing(plan.id);
    const handler = (window as any).PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: user.email,
      plan: plan.planCode,
      currency: 'NGN',
      ref: `kori_${plan.id}_${Date.now()}`,
      callback: async (response: any) => {
        setProcessing(null);
        if (response.status === 'success') {
          await notifyUpgrade(plan.id, response.reference, 'paystack');
        } else {
          showToast('Payment not completed.', 'error');
        }
      },
      onClose: () => setProcessing(null),
    });
    handler.openIframe();
  }, [user, paystackLoaded, notifyUpgrade]);

  const handleFlutterwave = useCallback((plan: typeof KE_PLANS[0]) => {
    if (!user) {
      showToast('Please sign in first to subscribe', 'error');
      return;
    }
    if (!plan.planId) {
      const subject = encodeURIComponent(`Kori ${plan.name} Plan Subscription (KES)`);
      const body = encodeURIComponent(
        `I would like to subscribe to the ${plan.name} plan at ${plan.price_display}/month.\n\nEmail: ${user.email}\nInstitution: \nPhone: `
      );
      window.open(`mailto:Business@seamount.io?subject=${subject}&body=${body}`, '_blank');
      showToast('Opening email — our team will set up your subscription within 24h', 'success');
      return;
    }
    if (!flutterwaveLoaded) {
      showToast('Payment system loading, please try again in a moment', 'error');
      return;
    }
    setProcessing(plan.id);
    (window as any).FlutterwaveCheckout({
      public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: `kori_ke_${plan.id}_${Date.now()}`,
      amount: plan.price_kes,
      currency: 'KES',
      payment_plan: plan.planId,
      customer: { email: user.email, name: user.user_metadata?.full_name ?? user.email },
      customizations: {
        title: 'Kori AML Platform',
        description: `${plan.name} Plan — ${plan.txLimit}`,
      },
      callback: async (data: any) => {
        setProcessing(null);
        if (data.status === 'successful') {
          await notifyUpgrade(plan.id.replace('_ke', ''), String(data.transaction_id), 'flutterwave');
        } else {
          showToast('Payment not completed.', 'error');
        }
      },
      onclose: () => setProcessing(null),
    });
  }, [user, flutterwaveLoaded, notifyUpgrade]);

  const plans = market === 'NG' ? NG_PLANS : KE_PLANS;

  return (
    <Layout>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
          Simple, Transparent Pricing
        </h2>
        <p style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 24, maxWidth: 520, margin: '0 auto 24px' }}>
          Purpose-built for CBN and CBK-regulated institutions.
          No hidden fees. Cancel anytime. Annual plans save 2 months.
        </p>

        {/* Market toggle */}
        <div style={{
          display: 'inline-flex', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 8, padding: 4, gap: 4,
        }}>
          {(['NG', 'KE'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMarket(m)}
              style={{
                padding: '8px 24px', borderRadius: 6, border: 'none',
                cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontWeight: 600,
                fontSize: 13, letterSpacing: '0.06em', transition: 'all 0.15s',
                background: market === m ? 'var(--cyan)' : 'transparent',
                color: market === m ? '#000' : '#cbd5e1',
              }}
            >
              {m === 'NG' ? '🇳🇬 Nigeria (NGN)' : '🇰🇪 Kenya (KES)'}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24,
      }}>
        {plans.map((plan) => (
          <div
            key={plan.id}
            onMouseEnter={() => setHoveredPlan(plan.id)}
            onMouseLeave={() => setHoveredPlan(null)}
            style={{
              background: 'var(--card)',
              border: `1px solid ${(hoveredPlan === plan.id || plan.highlight) ? 'var(--cyan)' : 'var(--border)'}`,
              borderRadius: 12, padding: 28, position: 'relative',
              boxShadow: (hoveredPlan === plan.id || plan.highlight) ? '0 0 28px rgba(0,212,255,0.1)' : 'none',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            {plan.highlight && (
              <div style={{
                position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--cyan)', color: '#000', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.1em', padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap',
              }}>
                MOST POPULAR
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 17, color: '#fff' }}>
                {plan.name}
              </span>
              <span className={`badge ${plan.badge}`}>{plan.name.toUpperCase()}</span>
            </div>

            <div style={{ marginBottom: 6 }}>
              <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 28, color: (hoveredPlan === plan.id || plan.highlight) ? 'var(--cyan)' : '#fff' }}>
                {plan.price_display}
              </span>
              <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 4 }}>{plan.period}</span>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>
              {plan.txLimit} · {plan.users} · {plan.apiLimit}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18, marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                Includes
              </div>
              {plan.features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7 }}>
                  <span style={{ color: 'var(--green)', fontSize: 12, marginTop: 2, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
              {plan.not_included.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7, opacity: 0.4 }}>
                  <span style={{ color: '#64748b', fontSize: 12, marginTop: 2, flexShrink: 0 }}>✗</span>
                  <span style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>

            {/* ── SUBSCRIBE BUTTON — always clickable ── */}
            <button
              onClick={() => {
                if (market === 'NG') handlePaystack(plan as any);
                else handleFlutterwave(plan as any);
              }}
              disabled={processing === plan.id}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 8,
                border: (hoveredPlan === plan.id || plan.highlight) ? 'none' : '1px solid var(--border)',
                background: (hoveredPlan === plan.id || plan.highlight) ? 'var(--cyan)' : 'transparent',
                color: (hoveredPlan === plan.id || plan.highlight) ? '#000' : '#cbd5e1',
                fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 13,
                cursor: processing === plan.id ? 'default' : 'pointer',
                opacity: processing === plan.id ? 0.6 : 1,
                transition: 'all 0.15s', letterSpacing: '0.04em',
                pointerEvents: 'auto',   // explicit — never inherit none
              }}
            >
              {processing === plan.id ? '⌛ Opening checkout…' : `Subscribe — ${plan.name}`}
            </button>

            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, color: '#475569' }}>
              {market === 'NG' ? 'Secured by Paystack' : 'Secured by Flutterwave · M-PESA & cards'}
            </div>
          </div>
        ))}
      </div>

      {/* Enterprise */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
            Enterprise — Unlimited Scale
          </div>
          <div style={{ fontSize: 13, color: '#cbd5e1', maxWidth: 520, lineHeight: 1.7 }}>
            Dedicated infrastructure, VPC deployment, white-label options, SLA guarantees,
            CBN evidence package, custom risk models, and dedicated account manager.
            Minimum: {market === 'NG' ? '₦3,000,000/month' : 'KES 400,000/month'}.
          </div>
        </div>

        <div style={{ marginLeft: 32, flexShrink: 0, textAlign: 'center' }}>
          {!showEnterpriseCTA ? (
            <button
              onClick={() => setShowEnterpriseCTA(true)}
              style={{
                padding: '12px 28px', background: 'transparent',
                border: '1px solid var(--amber)', borderRadius: 8,
                color: 'var(--amber)', fontFamily: 'Sora, sans-serif',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              Contact Sales →
            </button>
          ) : (
            <div style={{
              padding: '14px 20px', background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, letterSpacing: '0.06em' }}>REACH OUR SALES TEAM</div>
              <div style={{ marginBottom: 4 }}>
                <a href="mailto:Business@seamount.io" style={{ color: 'var(--cyan)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  Business@seamount.io
                </a>
              </div>
              <div style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 600 }}>+254-751875374</div>
            </div>
          )}
        </div>
      </div>

      {/* Comparison table */}
      <div className="kori-card">
        <div className="card-header">
          <span className="card-title">How We Compare</span>
          <span className="text-xs" style={{ color: '#94a3b8' }}>Global AML vendors vs Kori</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="kori-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Entry Price</th>
                <th>Graph Detection</th>
                <th>CBN/CBK Mapping</th>
                <th>Nigerian Rails</th>
                <th>M-PESA Intelligence</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: 'rgba(0,212,255,0.04)' }}>
                <td style={{ fontWeight: 700, color: 'var(--cyan)' }}>⬡ Kori (Professional)</td>
                <td style={{ color: 'var(--green)', fontWeight: 600 }}>
                  {market === 'NG' ? '₦450K/mo' : 'KES 45K/mo'}
                </td>
                <td><span className="badge badge-green">✓ Included</span></td>
                <td><span className="badge badge-green">✓ Full mapping</span></td>
                <td><span className="badge badge-green">✓ NIBSS, NQR</span></td>
                <td><span className="badge badge-green">✓ Safaricom limits</span></td>
              </tr>
              {[
                { name: 'ComplyAdvantage Starter', ng: '~₦150K/mo', ke: '~KES 15K/mo' },
                { name: 'Sandbar', ng: '~₦750K/mo', ke: '~KES 75K/mo' },
                { name: 'Unit21', ng: '~₦3M+/mo', ke: '~KES 300K+/mo' },
                { name: 'NICE Actimize', ng: '~₦150M+/yr', ke: '~KES 15M+/yr' },
              ].map((row) => (
                <tr key={row.name}>
                  <td style={{ color: '#cbd5e1' }}>{row.name}</td>
                  <td style={{ color: '#94a3b8' }}>{market === 'NG' ? row.ng : row.ke}</td>
                  <td><span className="badge badge-gray">Partial / No</span></td>
                  <td><span className="badge badge-red">✗ No</span></td>
                  <td><span className="badge badge-red">✗ No</span></td>
                  <td><span className="badge badge-red">✗ No</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </Layout>
  );
}