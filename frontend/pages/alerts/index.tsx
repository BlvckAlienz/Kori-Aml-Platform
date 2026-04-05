import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { fetchAlerts } from '../../lib/api';
import type { Alert } from '../../lib/types';

export default function AlertsListPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const load = () => {
    setLoading(true);
    fetchAlerts(500)
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const riskColor = (score: number) => {
    if (score >= 0.8) return 'var(--red)';
    if (score >= 0.5) return 'var(--amber)';
    return 'var(--green)';
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      open: 'badge-red', investigating: 'badge-amber', confirmed: 'badge-red',
      false_positive: 'badge-gray', closed: 'badge-green',
    };
    return map[status] ?? 'badge-gray';
  };

  const filtered = statusFilter
    ? alerts.filter((a) => a.status === statusFilter)
    : alerts;

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const counts = {
    open: alerts.filter((a) => a.status === 'open').length,
    investigating: alerts.filter((a) => a.status === 'investigating').length,
    confirmed: alerts.filter((a) => a.status === 'confirmed').length,
    false_positive: alerts.filter((a) => a.status === 'false_positive').length,
  };

  return (
    <Layout>
      {/* Stats */}
      <div className="stat-grid mb-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card red">
          <div className="stat-label">Open</div>
          <div className="stat-value">{counts.open}</div>
          <div className="stat-change down">Requires action</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Investigating</div>
          <div className="stat-value">{counts.investigating}</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-label">Confirmed Fraud</div>
          <div className="stat-value">{counts.confirmed}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">False Positives</div>
          <div className="stat-value">{counts.false_positive}</div>
        </div>
      </div>

      <div className="kori-card">
        <div className="card-header">
          <span className="card-title">All Alerts</span>
          <div className="flex gap-2 items-center">
            <select
              className="kori-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="confirmed">Confirmed Fraud</option>
              <option value="false_positive">False Positive</option>
              <option value="closed">Closed</option>
            </select>
            <button className="btn btn-outline btn-sm" onClick={load}>↻ Refresh</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="kori-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Entity</th>
                <th>Risk Score</th>
                <th>Description</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 12 }} /></td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-icon">◈</div>
                      <div className="empty-text">No alerts found</div>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((alert) => (
                  <tr
                    key={alert.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/alerts/${alert.id}`)}
                  >
                    <td>
                      <span className="mono" style={{ color: 'var(--cyan)' }}>
                        {alert.transaction_id.slice(0, 12)}…
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {alert.entity_id?.slice(0, 12) ?? '—'}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 14, fontWeight: 700,
                            color: riskColor(alert.risk_score),
                          }}
                        >
                          {(alert.risk_score * 100).toFixed(0)}%
                        </span>
                        <div className="risk-bar-track" style={{ width: 48 }}>
                          <div
                            className="risk-bar-fill"
                            style={{
                              width: `${alert.risk_score * 100}%`,
                              background: riskColor(alert.risk_score),
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        color: 'var(--text-secondary)', fontSize: 12,
                        maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {alert.description}
                    </td>
                    <td>
                      <span className={`badge ${statusBadge(alert.status)}`}>{alert.status}</span>
                    </td>
                    <td className="text-xs text-dim">
                      {new Date(alert.created_at).toLocaleString('en-NG')}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/alerts/${alert.id}`);
                        }}
                      >
                        Investigate →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div
            className="flex items-center justify-between"
            style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}
          >
            <span className="text-xs text-dim">
              {filtered.length} alerts · Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                className="btn btn-outline btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <button
                className="btn btn-outline btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        Click any alert row to open the investigation view with entity graph and risk breakdown
      </p>
    </Layout>
  );
}