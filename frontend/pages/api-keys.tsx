import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';

const API = process.env.NEXT_PUBLIC_API_URL || '';

// ─── ALIGNED with pricing page ─────────────────────────────────────────────
// Free:         1,000 API req/day  — no charge, for testing/integration
// Starter:      5,000 API req/day  — ₦150,000/mo · KES 15,000/mo
// Professional: 10,000 API req/day — ₦450,000/mo · KES 45,000/mo
// Growth:       50,000 API req/day — ₦1,200,000/mo · KES 120,000/mo
// Enterprise:   Unlimited          — Custom pricing
const TIERS = [
  {
    id: 'free',
    name: 'Free',
    badge: 'badge-gray',
    reqDay: '1,000 req/day',
    price: 'Free',
    priceColor: 'var(--text-dim)',
    note: 'Testing & integration only',
  },
  {
    id: 'starter',
    name: 'Starter',
    badge: 'badge-green',
    reqDay: '5,000 req/day',
    price: '₦150,000 / KES 15,000',
    priceColor: 'var(--green)',
  },
  {
    id: 'professional',
    name: 'Pro',
    badge: 'badge-cyan',
    reqDay: '10,000 req/day',
    price: '₦450,000 / KES 45,000',
    priceColor: 'var(--cyan)',
    note: 'Most popular',
  },
  {
    id: 'growth',
    name: 'Growth',
    badge: 'badge-amber',
    reqDay: '50,000 req/day',
    price: '₦1,200,000 / KES 120,000',
    priceColor: 'var(--amber)',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'badge-amber',
    reqDay: 'Unlimited',
    price: 'Custom',
    priceColor: 'var(--amber)',
    note: 'Minimum ₦3,000,000/month',
  },
];

type ApiKey = {
  id: string; key_preview: string; tier: string; requests_count: number;
  daily_limit: number; created_at: string; is_active: boolean;
};

export default function ApiKeysPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadKeys = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API}/api-keys`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setKeys(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadKeys(); }, []);

  const generateKey = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ tier: 'free' }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        showToast('API key generated — copy it now, it won\'t be shown again');
        loadKeys();
      } else { showToast('Failed to generate key', 'error'); }
    } catch { showToast('Network error', 'error'); }
    finally { setGenerating(false); }
  };

  const revokeKey = async (keyId: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API}/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      if (res.ok) { showToast('Key revoked'); setKeys((prev) => prev.filter((k) => k.id !== keyId)); }
      else { showToast('Failed to revoke', 'error'); }
    } catch { showToast('Network error', 'error'); }
  };

  const copyKey = () => {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tierInfo = (tier: string) => TIERS.find((t) => t.id === tier) ?? TIERS[0];

  const usagePct = (key: ApiKey) =>
    key.daily_limit >= 999999 ? 5 : (key.requests_count / key.daily_limit) * 100;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-dim" style={{ marginTop: 4 }}>
            Manage API access for system integration · CBN §5.1.7
          </p>
        </div>
        <button onClick={generateKey} disabled={generating} className="btn btn-primary">
          {generating ? '⌛ Generating…' : '⌘ Generate Free API Key'}
        </button>
      </div>

      {/* New key banner */}
      {newKey && (
        <div style={{ marginBottom: 24, padding: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#6ee7b7', marginBottom: 8, fontWeight: 600 }}>
            ✓ New API Key — Copy now. It will NOT be shown again.
          </div>
          <div className="flex items-center gap-2">
            <code style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, padding: '8px 12px', background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)', color: 'var(--cyan)', wordBreak: 'break-all' }}>
              {newKey}
            </code>
            <button onClick={copyKey} className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>
              {copied ? '✓ Copied' : '⎘ Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Tier cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className="kori-card"
            style={{ padding: 16, cursor: tier.id !== 'free' ? 'pointer' : 'default' }}
            onClick={() => { if (tier.id !== 'free') router.push('/pricing'); }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14, color: '#fff' }}>{tier.name}</span>
              <span className={`badge ${tier.badge}`}>{tier.name.toUpperCase()}</span>
            </div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15, color: tier.priceColor, marginBottom: 4 }}>
              {tier.price}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>
              {tier.reqDay} · {tier.note}
            </div>
            {tier.id !== 'free' && tier.id !== 'enterprise' && (
              <button
                onClick={(e) => { e.stopPropagation(); router.push('/pricing'); }}
                className="btn btn-outline btn-sm"
                style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
              >
                Upgrade → View Plans
              </button>
            )}
            {tier.id === 'enterprise' && (
              <button
                onClick={(e) => { e.stopPropagation(); router.push('/pricing#enterprise'); }}
                className="btn btn-sm"
                style={{ width: '100%', justifyContent: 'center', fontSize: 11, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: 'var(--amber)' }}
              >
                Contact Sales →
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Active keys table */}
      <div className="kori-card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Active Keys</span>
          <span className="text-xs text-dim">{keys.length} key{keys.length !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="kori-table">
            <thead>
              <tr>
                <th>Key Preview</th>
                <th>Tier</th>
                <th>Daily Usage</th>
                <th>Created</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(2)].map((_, i) => (
                  <tr key={i}>{[...Array(6)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: 12 }} /></td>)}</tr>
                ))
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-icon">⌘</div>
                      <div className="empty-text">No API keys yet — generate one above</div>
                    </div>
                  </td>
                </tr>
              ) : (
                keys.map((key) => {
                  const ti = tierInfo(key.tier);
                  const pct = usagePct(key);
                  return (
                    <tr key={key.id}>
                      <td className="mono" style={{ color: 'var(--cyan)' }}>{key.key_preview}…</td>
                      <td><span className={`badge ${ti.badge}`}>{key.tier.toUpperCase()}</span></td>
                      <td style={{ width: 200 }}>
                        <div className="risk-bar-wrap">
                          <div className="risk-bar-track" style={{ flex: 1 }}>
                            <div className="risk-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--amber)' : 'var(--cyan)' }} />
                          </div>
                          <span className="text-xs text-secondary">
                            {key.requests_count}/{key.daily_limit >= 999999 ? '∞' : key.daily_limit.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="text-xs text-dim">{new Date(key.created_at).toLocaleDateString('en-NG')}</td>
                      <td><span className={`badge ${key.is_active ? 'badge-green' : 'badge-gray'}`}>{key.is_active ? 'Active' : 'Revoked'}</span></td>
                      <td>
                        {key.is_active && (
                          <button onClick={() => revokeKey(key.id)} className="btn btn-danger btn-sm">Revoke</button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration snippet */}
      <div className="kori-card">
        <div className="card-header">
          <span className="card-title">Quick Integration</span>
          <span className="text-xs text-dim">Send a transaction via API</span>
        </div>
        <div className="card-body">
          <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, background: 'var(--bg)', borderRadius: 6, padding: 16, border: '1px solid var(--border)', color: 'var(--text-secondary)', overflow: 'auto' }}>
{`curl -X POST ${(process.env.NEXT_PUBLIC_API_URL || 'https://your-ingest.onrender.com').replace('/api', '')}/webhook \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "transaction_id": "TXN_001",
    "user_id": "CUST_001",
    "amount": 250000,
    "timestamp": "2026-04-05T09:15:00Z",
    "phone": "08012345678",
    "ip_address": "197.210.xx.xx",
    "channel": "mobile"
  }'`}
          </pre>
          <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-dim)' }}>
            Need higher limits? <button onClick={() => router.push('/pricing')} style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>View Pricing & Plans →</button>
          </p>
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