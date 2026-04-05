import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

const API = process.env.NEXT_PUBLIC_API_URL;

type BlocklistEntry = {
  id: string;
  type: 'phone' | 'ip' | 'wallet';
  value: string;
  source: string;
  added_at: string;
};

export default function Blocklist() {
  const [entries, setEntries] = useState<BlocklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: 'phone', value: '', source: 'manual' });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/blocklist`);
      if (res.ok) setEntries(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.value.trim()) { showToast('Value is required', 'error'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/blocklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        showToast(`Added ${form.type} to blocklist`, 'success');
        setForm({ type: 'phone', value: '', source: 'manual' });
        load();
      } else {
        const e = await res.json();
        showToast(e.detail ?? 'Failed to add', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this entry from blocklist?')) return;
    try {
      const res = await fetch(`${API}/blocklist/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Entry removed', 'success');
        setEntries(prev => prev.filter(e => e.id !== id));
      } else {
        showToast('Failed to remove', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const filtered = entries.filter(e => {
    const matchVal = !filter || e.value.includes(filter);
    const matchType = !typeFilter || e.type === typeFilter;
    return matchVal && matchType;
  });

  const typeIcon = (type: string) => ({ phone: '◷', ip: '⊕', wallet: '◆' }[type] ?? '·');
  const typeBadge = (type: string) => ({ phone: 'badge-green', ip: 'badge-amber', wallet: 'badge-cyan' }[type] ?? 'badge-gray');

  return (
    <Layout>
      {/* Stats */}
      <div className="stat-grid mb-6" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { label: 'Total Entries', value: entries.length, cls: 'cyan' },
          { label: 'Phone Numbers', value: entries.filter(e => e.type === 'phone').length, cls: 'green' },
          { label: 'IP Addresses', value: entries.filter(e => e.type === 'ip').length, cls: 'amber' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Table */}
        <div className="kori-card">
          <div className="card-header">
            <span className="card-title">Blocklist Entries</span>
            <div className="flex gap-2">
              <input
                className="kori-input"
                style={{ width: 160 }}
                placeholder="Search value…"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
              <select
                className="kori-select"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                <option value="">All types</option>
                <option value="phone">Phone</option>
                <option value="ip">IP</option>
                <option value="wallet">Wallet</option>
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="kori-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Source</th>
                  <th>Added</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j}><div className="skeleton" style={{ height: 12 }} /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <div className="empty-icon">⊘</div>
                        <div className="empty-text">No blocklist entries</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(entry => (
                    <tr key={entry.id}>
                      <td>
                        <span className={`badge ${typeBadge(entry.type)}`}>
                          {typeIcon(entry.type)} {entry.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="mono">{entry.value}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{entry.source}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                        {new Date(entry.added_at).toLocaleDateString('en-NG')}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="btn btn-danger btn-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Form */}
        <div className="kori-card" style={{ alignSelf: 'start' }}>
          <div className="card-header">
            <span className="card-title">Add to Blocklist</span>
          </div>
          <div className="card-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, display: 'block', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Indicator Type
              </label>
              <select
                className="kori-select"
                style={{ width: '100%' }}
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="phone">Phone Number</option>
                <option value="ip">IP Address</option>
                <option value="wallet">Wallet Address</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, display: 'block', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Value
              </label>
              <input
                className="kori-input"
                placeholder={form.type === 'phone' ? '08012345678' : form.type === 'ip' ? '192.168.1.1' : '0x...'}
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, display: 'block', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Source / Intelligence
              </label>
              <input
                className="kori-input"
                placeholder="manual / nfiu / efcc / consortium"
                value={form.source}
                onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              />
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              onClick={handleAdd}
              disabled={submitting}
            >
              {submitting ? 'Adding…' : '⊕ Add to Blocklist'}
            </button>

            <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Entries added here immediately affect risk scoring for new transactions.
              All additions are logged in the Audit Log per CBN §5.1.6 requirements.
            </div>
          </div>
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