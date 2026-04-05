import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

const API = process.env.NEXT_PUBLIC_API_URL;

type AuditEntry = {
  id: string;
  user_id?: string;
  action_type: string;
  entity_id?: string;
  old_value?: any;
  new_value?: any;
  ip_address?: string;
  created_at: string;
};

const ACTION_BADGE: Record<string, string> = {
  alert_status_change: 'badge-amber',
  blocklist_add: 'badge-red',
  blocklist_remove: 'badge-gray',
  api_key_generated: 'badge-cyan',
  api_key_revoked: 'badge-red',
  user_login: 'badge-green',
  report_export: 'badge-cyan',
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/audit?limit=500`)
      .then(r => r.json())
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = entries.filter(e => !actionFilter || e.action_type === actionFilter);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const exportCSV = () => {
    const rows = [['Timestamp', 'User', 'Action', 'Entity', 'Old Value', 'New Value', 'IP']];
    filtered.forEach(e => rows.push([
      e.created_at,
      e.user_id ?? '—',
      e.action_type,
      e.entity_id ?? '—',
      JSON.stringify(e.old_value ?? ''),
      JSON.stringify(e.new_value ?? ''),
      e.ip_address ?? '—',
    ]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kori-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
            Audit Log
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Immutable record of all platform actions · CBN §5.1.6 — Governance
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="kori-select"
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(0); }}
          >
            <option value="">All actions</option>
            <option value="alert_status_change">Alert Status Change</option>
            <option value="blocklist_add">Blocklist Add</option>
            <option value="blocklist_remove">Blocklist Remove</option>
            <option value="api_key_generated">API Key Generated</option>
            <option value="api_key_revoked">API Key Revoked</option>
            <option value="user_login">User Login</option>
          </select>
          <button onClick={exportCSV} className="btn btn-outline">
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid mb-6" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'Total Events', value: entries.length, cls: 'cyan' },
          { label: 'Alert Actions', value: entries.filter(e => e.action_type === 'alert_status_change').length, cls: 'amber' },
          { label: 'Blocklist Changes', value: entries.filter(e => e.action_type.startsWith('blocklist')).length, cls: 'red' },
          { label: 'API Key Events', value: entries.filter(e => e.action_type.startsWith('api_key')).length, cls: 'green' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="kori-card">
        <div className="card-header">
          <span className="card-title">Activity Log</span>
          <span className="text-xs text-dim">{filtered.length} events</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="kori-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Entity</th>
                <th>User</th>
                <th>Change</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i}>{[...Array(6)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: 12 }} /></td>)}</tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-icon">◎</div>
                      <div className="empty-text">No audit entries found</div>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map(entry => (
                  <tr key={entry.id}>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {new Date(entry.created_at).toLocaleString('en-NG')}
                    </td>
                    <td>
                      <span className={`badge ${ACTION_BADGE[entry.action_type] ?? 'badge-gray'}`}>
                        {entry.action_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {entry.entity_id?.slice(0, 12) ?? '—'}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {entry.user_id?.slice(0, 20) ?? 'system'}
                    </td>
                    <td style={{ fontSize: 11 }}>
                      {entry.old_value && (
                        <span style={{ color: 'var(--red)' }}>
                          {JSON.stringify(entry.old_value)}
                        </span>
                      )}
                      {entry.old_value && entry.new_value && ' → '}
                      {entry.new_value && (
                        <span style={{ color: 'var(--green)' }}>
                          {JSON.stringify(entry.new_value)}
                        </span>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {entry.ip_address ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <span className="text-xs text-dim">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button className="btn btn-outline btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}