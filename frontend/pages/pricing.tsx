/**
 * frontend/pages/pricing.tsx
 *
 * Complete pricing page for Kori AML Platform.
 * - Nigeria: Paystack inline checkout
 * - Kenya: Flutterwave inline checkout
 * - After successful payment → calls POST /upgrade-plan → upgrades API key tier
 *
 * Env vars needed in Vercel:
 *   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxx
 *   NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_xxx
 *   NEXT_PUBLIC_PAYSTACK_STARTER_PLAN=PLN_xxx
 *   NEXT_PUBLIC_PAYSTACK_PRO_PLAN=PLN_xxx
 *   NEXT_PUBLIC_PAYSTACK_GROWTH_PLAN=PLN_xxx
 *   NEXT_PUBLIC_FLW_STARTER_PLAN_ID=12345
 *   NEXT_PUBLIC_FLW_PRO_PLAN_ID=12346
 *   NEXT_PUBLIC_FLW_GROWTH_PLAN_ID=12347
 */
import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// ─── Plan definitions ─────────────────────────────────────────────────────────

const NG_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price_ngn: 150_000,
    price_display: '₦150,000',
    period: '/month',
    txLimit: '10,000 tx/month',
    users: '3 users',
    planCode: process.env.NEXT_PUBLIC_PAYSTACK_STARTER_PLAN || '',
    color: 'var(--text-dim)',
    badge: 'badge-gray',
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
    planId: process.env.NEXT_PUBLIC_FLW_STARTER_PLAN_ID || '',
    color: 'var(--text-dim)',
    badge: 'badge-gray',
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

// ─── Paystack inline loader ───────────────────────────────────────────────────

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

// ─── Flutterwave inline loader ────────────────────────────────────────────────

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

// ─── Main component ───────────────────────────────────────────────────────────

export default function Pricing() {
  const [market, setMarket] = useState<'NG' | 'KE'>('NG');
  const [user, setUser] = useState<any>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const paystackLoaded = usePaystackScript();
  const flutterwaveLoaded = useFlutterwaveScript();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  /**
   * After successful payment, tell the backend to upgrade this user's tier.
   * Backend verifies the payment ref with Paystack/Flutterwave before upgrading.
   */
  const notifyUpgrade = useCallback(async (
    tier: string,
    reference: string,
    provider: 'paystack' | 'flutterwave'
  ) => {
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
        showToast(`✓ Plan upgraded to ${tier}! Your API key limits have been updated.`, 'success');
      } else {
        showToast('Payment received but upgrade failed. Contact support@kori.seamount.io', 'error');
      }
    } catch {
      showToast('Network error during upgrade. Contact support.', 'error');
    }
  }, []);

  // ─── Paystack checkout ──────────────────────────────────────────────────────

  const handlePaystack = useCallback((plan: typeof NG_PLANS[0]) => {
    if (!user) { showToast('Please log in to subscribe', 'error'); return; }
    if (!paystackLoaded) { showToast('Payment system loading, try again in a moment', 'error'); return; }
    if (!plan.planCode) { showToast('Plan code not configured. Contact admin.', 'error'); return; }

    setProcessing(plan.id);

    const handler = (window as any).PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: user.email,
      plan: plan.planCode,
      currency: 'NGN',
      ref: `kori_${plan.id}_${Date.now()}`,
      metadata: {
        custom_fields: [
          { display_name: 'Product', variable_name: 'product', value: 'Kori AML' },
          { display_name: 'Tier', variable_name: 'tier', value: plan.id },
        ],
      },
      callback: async (response: any) => {
        setProcessing(null);
        if (response.status === 'success') {
          await notifyUpgrade(plan.id, response.reference, 'paystack');
        } else {
          showToast('Payment was not completed.', 'error');
        }
      },
      onClose: () => {
        setProcessing(null);
      },
    });
    handler.openIframe();
  }, [user, paystackLoaded, notifyUpgrade]);

  // ─── Flutterwave checkout ───────────────────────────────────────────────────

  const handleFlutterwave = useCallback((plan: typeof KE_PLANS[0]) => {
    if (!user) { showToast('Please log in to subscribe', 'error'); return; }
    if (!flutterwaveLoaded) { showToast('Payment system loading, try again', 'error'); return; }
    if (!plan.planId) { showToast('Plan ID not configured. Contact admin.', 'error'); return; }

    setProcessing(plan.id);

    (window as any).FlutterwaveCheckout({
      public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: `kori_ke_${plan.id}_${Date.now()}`,
      amount: plan.price_kes,
      currency: 'KES',
      payment_plan: plan.planId,
      customer: {
        email: user.email,
        name: user.user_metadata?.full_name ?? user.email,
      },
      customizations: {
        title: 'Kori AML Platform',
        description: `${plan.name} Plan — ${plan.txLimit}`,
        logo: 'https://kori-aml-platform.vercel.app/logo.png',
      },
      callback: async (data: any) => {
        setProcessing(null);
        if (data.status === 'successful') {
          await notifyUpgrade(plan.id.replace('_ke', ''), String(data.transaction_id), 'flutterwave');
        } else {
          showToast('Payment was not completed.', 'error');
        }
      },
      onclose: () => {
        setProcessing(null);
      },
    });
  }, [user, flutterwaveLoaded, notifyUpgrade]);

  const plans = market === 'NG' ? NG_PLANS : KE_PLANS;

  return (
    <Layout>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
          Simple, Transparent Pricing
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 28, maxWidth: 560, margin: '0 auto 28px' }}>
          Purpose-built for CBN and CBK-regulated institutions. No hidden fees.
          Cancel anytime. Annual plans save 2 months.
        </p>

        {/* Market toggle */}
        <div style={{
          display: 'inline-flex',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 4,
          gap: 4,
        }}>
          {(['NG', 'KE'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMarket(m)}
              style={{
                padding: '8px 24px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Sora, sans-serif',
                fontWeight: 600,
                fontSize: 13,
                letterSpacing: '0.06em',
                background: market === m ? 'var(--cyan)' : 'transparent',
                color: market === m ? '#000' : 'var(--text-dim)',
                transition: 'all 0.2s',
              }}
            >
              {m === 'NG' ? '🇳🇬 Nigeria (NGN)' : '🇰🇪 Kenya (KES)'}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20,
        maxWidth: 1100,
        margin: '0 auto 48px',
      }}>
        {plans.map((plan) => (
          <div
            key={plan.id}
            style={{
              background: 'var(--card)',
              border: `1px solid ${plan.highlight ? 'var(--cyan)' : 'var(--border)'}`,
              borderRadius: 12,
              padding: 28,
              position: 'relative',
              boxShadow: plan.highlight ? '0 0 24px rgba(0,212,255,0.1)' : 'none',
            }}
          >
            {plan.highlight && (
              <div style={{
                position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                background: 'var(--cyan)', color: '#000',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap',
              }}>
                MOST POPULAR
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <span style={{
                  fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 16, color: '#fff',
                }}>{plan.name}</span>
                <span className={`badge ${plan.badge}`}>{plan.name.toUpperCase()}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span style={{
                  fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 32,
                  color: plan.highlight ? 'var(--cyan)' : '#fff',
                }}>
                  {plan.price_display}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{plan.period}</span>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {plan.txLimit} · {plan.users}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                Includes
              </div>
              {plan.features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: 'var(--green)', fontSize: 12, marginTop: 1, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
              {plan.not_included.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, opacity: 0.4 }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 1, flexShrink: 0 }}>✗</span>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                if (market === 'NG') handlePaystack(plan as any);
                else handleFlutterwave(plan as any);
              }}
              disabled={processing === plan.id}
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 8,
                border: plan.highlight ? 'none' : '1px solid var(--border)',
                background: plan.highlight ? 'var(--cyan)' : 'transparent',
                color: plan.highlight ? '#000' : 'var(--text-dim)',
                fontFamily: 'Sora, sans-serif',
                fontWeight: 600,
                fontSize: 13,
                cursor: processing === plan.id ? 'default' : 'pointer',
                opacity: processing === plan.id ? 0.6 : 1,
                transition: 'all 0.2s',
                letterSpacing: '0.04em',
              }}
            >
              {processing === plan.id
                ? '⌛ Opening checkout…'
                : `Subscribe — ${plan.name}`}
            </button>

            {market === 'NG' && (
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 10, color: 'var(--text-muted)' }}>
                Powered by Paystack · Secured payment
              </div>
            )}
            {market === 'KE' && (
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 10, color: 'var(--text-muted)' }}>
                Powered by Flutterwave · M-PESA & cards accepted
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Enterprise contact */}
      <div style={{
        maxWidth: 1100,
        margin: '0 auto 32px',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
            Enterprise — Unlimited Scale
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', maxWidth: 500 }}>
            Dedicated infrastructure, VPC deployment, white-label options, SLA guarantees,
            CBN evidence package, custom risk models, and dedicated account manager.
            Minimum: {market === 'NG' ? '₦3,000,000/month' : 'KES 400,000/month'}.
          </div>
        </div>
        <a
          href="mailto:Business@seamount.io?subject=Kori Enterprise Inquiry"
          style={{
            padding: '12px 28px',
            background: 'transparent',
            border: '1px solid var(--amber)',
            borderRadius: 8,
            color: 'var(--amber)',
            fontFamily: 'Sora, sans-serif',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            marginLeft: 32,
            flexShrink: 0,
          }}
        >
          Contact Sales →
        </a>
      </div>

      {/* Comparison vs global alternatives */}
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="kori-card">
          <div className="card-header">
            <span className="card-title">How We Compare</span>
            <span className="text-xs text-dim">Global AML vendors vs Kori</span>
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
                <tr style={{ background: 'rgba(0,212,255,0.05)' }}>
                  <td style={{ fontWeight: 600, color: 'var(--cyan)' }}>⬡ Kori (Professional)</td>
                  <td style={{ color: 'var(--green)' }}>
                    {market === 'NG' ? '₦450K/mo' : 'KES 45K/mo'}
                  </td>
                  <td><span className="badge badge-green">✓ Included</span></td>
                  <td><span className="badge badge-green">✓ Full mapping</span></td>
                  <td><span className="badge badge-green">✓ NIBSS, NQR</span></td>
                  <td><span className="badge badge-green">✓ Safaricom limits</span></td>
                </tr>
                <tr>
                  <td>ComplyAdvantage Starter</td>
                  <td>~₦150K/mo ($100)</td>
                  <td><span className="badge badge-red">✗ No</span></td>
                  <td><span className="badge badge-red">✗ No</span></td>
                  <td><span className="badge badge-red">✗ No</span></td>
                  <td><span className="badge badge-red">✗ No</span></td>
                </tr>
                <tr>
                  <td>Sandbar</td>
                  <td>~₦750K/mo ($500)</td>
                  <td><span className="badge badge-amber">Partial</span></td>
                  <td><span className="badge badge-red">✗ No</span></td>
                  <td><span className="badge badge-red">✗ No</span></td>
                  <td><span className="badge badge-red">✗ No</span></td>
                </tr>
                <tr>
                  <td>Unit21</td>
                  <td>~₦3M+/mo ($2,000+)</td>
                  <td><span className="badge badge-green">✓ Yes</span></td>
                  <td><span className="badge badge-red">✗ No</span></td>
                  <td><span className="badge badge-red">✗ No</span></td>
                  <td><span className="badge badge-red">✗ No</span></td>
                </tr>
                <tr>
                  <td>NICE Actimize</td>
                  <td>~₦150M+/year</td>
                  <td><span className="badge badge-green">✓ Yes</span></td>
                  <td><span className="badge badge-red">✗ No</span></td>
                  <td><span className="badge badge-red">✗ No</span></td>
                  <td><span className="badge badge-red">✗ No</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </Layout>
  );
}