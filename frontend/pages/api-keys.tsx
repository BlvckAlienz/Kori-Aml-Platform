import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';

const API = process.env.NEXT_PUBLIC_API_URL;

type ApiKey = {
  id: string;
  key_preview: string;
  tier: string;
  requests_count: number;
  daily_limit: number;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
};

const TIER_LIMITS: Record<string, { limit: string; color: string; badge: string }> = {
  free: { limit: '1,000 req/day', color: 'var(--text-dim)', badge: 'badge-gray' },
  pro: { limit: '10,000 req/day', color: 'var(--cyan)', badge: 'badge-cyan' },
  enterprise: { limit: 'Unlimited', color: 'var(--amber)', badge: 'badge-amber' },
};

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadKeys(); }, []);

  const generateKey = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API}/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ tier: 'free' }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        showToast('API key generated — copy it now, it won\'t be shown again', 'success');
        loadKeys();
      } else {
        showToast('Failed to generate key', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API}/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      if (res.ok) {
        showToast('API key revoked', 'success');
        setKeys(prev => prev.filter(k => k.id !== keyId));
      } else {
        showToast('Failed to revoke', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
            API Keys
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Manage API access for system integration · CBN §5.1.7
          </p>
        </div>
        <button onClick={generateKey} disabled={generating} className="btn btn-primary">
          {generating ? '⌛ Generating…' : '⌘ Generate New Key'}
        </button>
      </div>

      {/* New key banner */}
      {newKey && (
        <div style={{
          marginBottom: 24, padding: 16, background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.4)', borderRadius: 8,
        }}>
          <div style={{ fontSize: 12, color: 'var(--green)', marginBottom: 8, fontWeight: 600 }}>
            ✓ New API Key Generated — Copy it now. It will not be shown again.
          </div>
          <div className="flex items-center gap-2">
            <code style={{
              flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
              padding: '8px 12px', background: 'var(--surface)', borderRadius: 6,
              border: '1px solid var(--border)', color: 'var(--cyan)',
            }}>
              {newKey}
            </code>
            <button onClick={() => copyKey(newKey)} className="btn btn-outline btn-sm">
              {copiedKey ? '✓ Copied' : '⎘ Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Tier Cards */}
      <div className="grid-3 mb-6">
        {Object.entries(TIER_LIMITS).map(([tier, info]) => (
          <div key={tier} className="kori-card" style={{ padding: 20 }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, textTransform: 'capitalize', color: '#fff' }}>
                {tier}
              </span>
              <span className={`badge ${info.badge}`}>{tier.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 22, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: info.color, marginBottom: 8 }}>
              {tier === 'free' ? 'Free' : tier === 'pro' ? '₦500k/mo' : 'Custom'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{info.limit}</div>
            {tier !== 'free' && (
              <button className="btn btn-outline btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
                Upgrade via Paystack
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Keys Table */}
      <div className="kori-card">
        <div className="card-header">
          <span className="card-title">Active Keys</span>
          <span className="text-xs text-dim">{keys.length} keys</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="kori-table">
            <thead>
              <tr>
                <th>Key Preview</th>
                <th>Tier</th>
                <th>Usage</th>
                <th>Created</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
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
                keys.map(key => {
                  const usagePct = key.daily_limit > 0 ? (key.requests_count / key.daily_limit) * 100 : 0;
                  const tierInfo = TIER_LIMITS[key.tier] ?? TIER_LIMITS.free;
                  return (
                    <tr key={key.id}>
                      <td className="mono" style={{ fontSize: 12 }}>{key.key_preview}…</td>
                      <td>
                        <span className={`badge ${tierInfo.badge}`}>{key.tier.toUpperCase()}</span>
                      </td>
                      <td style={{ width: 160 }}>
                        <div className="risk-bar-wrap">
                          <div className="risk-bar-track" style={{ flex: 1 }}>
                            <div
                              className="risk-bar-fill"
                              style={{
                                width: `${Math.min(usagePct, 100)}%`,
                                background: usagePct > 90 ? 'var(--red)' : usagePct > 70 ? 'var(--amber)' : 'var(--cyan)',
                              }}
                            />
                          </div>
                          <span className="text-xs text-dim">{key.requests_count}/{key.daily_limit === 999999 ? '∞' : key.daily_limit.toLocaleString()}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                        {new Date(key.created_at).toLocaleDateString('en-NG')}
                      </td>
                      <td>
                        <span className={`badge ${key.is_active ? 'badge-green' : 'badge-gray'}`}>
                          {key.is_active ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td>
                        {key.is_active && (
                          <button onClick={() => revokeKey(key.id)} className="btn btn-danger btn-sm">
                            Revoke
                          </button>
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

      {/* Integration Snippet */}
      <div className="kori-card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-title">Quick Integration</span>
          <span className="text-xs text-dim">Send a transaction</span>
        </div>
        <div className="card-body" style={{ padding: 16 }}>
          <pre style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            background: 'var(--bg)', borderRadius: 6, padding: 16,
            border: '1px solid var(--border)', color: 'var(--text-dim)',
            overflow: 'auto',
          }}>{`curl -X POST ${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'https://your-ingest.onrender.com'}/webhook \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "transaction_id": "TXN_001",
    "user_id": "CUST_001",
    "amount": 250000,
    "timestamp": "${new Date().toISOString()}",
    "phone": "08012345678",
    "ip_address": "197.210.xx.xx",
    "channel": "mobile"
  }'`}
          </pre>
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