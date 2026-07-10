import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { fetchRecentTransactions } from '../lib/api';
import type { Transaction } from '../lib/types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchRecentTransactions(200)
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const riskColor = (score: number | undefined) => {
    if (!score) return 'var(--green)';
    if (score >= 0.8) return 'var(--red)';
    if (score >= 0.5) return 'var(--amber)';
    return 'var(--green)';
  };

  const riskLabel = (score: number | undefined) => {
    if (!score || score < 0.01) return { label: 'LOW', cls: 'badge-green' };
    if (score >= 0.8) return { label: 'HIGH', cls: 'badge-red' };
    if (score >= 0.5) return { label: 'MED', cls: 'badge-amber' };
    return { label: 'LOW', cls: 'badge-green' };
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      open: 'badge-red', investigating: 'badge-amber', confirmed: 'badge-red',
      false_positive: 'badge-gray', closed: 'badge-green', ingested: 'badge-cyan',
    };
    return map[status] ?? 'badge-gray';
  };

  const filtered = transactions.filter((tx) => {
    const matchSearch =
      !filter ||
      tx.transaction_id.toLowerCase().includes(filter.toLowerCase()) ||
      (tx.user_id ?? '').toLowerCase().includes(filter.toLowerCase());
    const matchRisk =
      !riskFilter ||
      (riskFilter === 'high' && (tx.risk_score ?? 0) >= 0.8) ||
      (riskFilter === 'medium' && (tx.risk_score ?? 0) >= 0.5 && (tx.risk_score ?? 0) < 0.8) ||
      (riskFilter === 'low' && (tx.risk_score ?? 0) < 0.5);
    return matchSearch && matchRisk;
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <Layout>
      {/* Stats bar */}
      <div className="stat-grid mb-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card cyan">
          <div className="stat-label">Total Transactions</div>
          <div className="stat-value">{transactions.length}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">High Risk</div>
          <div className="stat-value">{transactions.filter(t => (t.risk_score ?? 0) >= 0.8).length}</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Medium Risk</div>
          <div className="stat-value">{transactions.filter(t => (t.risk_score ?? 0) >= 0.5 && (t.risk_score ?? 0) < 0.8).length}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Low Risk / Clear</div>
          <div className="stat-value">{transactions.filter(t => (t.risk_score ?? 0) < 0.5).length}</div>
        </div>
      </div>

      <div className="kori-card">
        <div className="card-header">
          <span className="card-title">All Transactions</span>
          <div className="flex gap-2 items-center">
            <input
              className="kori-input"
              style={{ width: 200 }}
              placeholder="Search TX ID or user…"
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(0); }}
            />
            <select
              className="kori-select"
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value); setPage(0); }}
            >
              <option value="">All risk levels</option>
              <option value="high">High (≥80%)</option>
              <option value="medium">Medium (50–79%)</option>
              <option value="low">Low (&lt;50%)</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="kori-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>User ID</th>
                <th>Amount</th>
                <th>Timestamp</th>
                <th>Risk</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 12 }} /></td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-icon">⇄</div>
                      <div className="empty-text">No transactions found</div>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((tx) => {
                  const rl = riskLabel(tx.risk_score);
                  return (
                    <tr key={tx.transaction_id}>
                      <td>
                        <span className="mono" style={{ color: 'var(--cyan)' }}>
                          {tx.transaction_id}
                        </span>
                      </td>
                      <td style={{ color: '#fff' }}>{tx.user_id ?? '—'}</td>
                      <td>
                        <span style={{ color: '#fff', fontWeight: 600 }}>
                          {tx.market === 'KE' ? 'KSh ' : '₦ '}
                          {tx.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="text-secondary text-sm">
                        {new Date(tx.timestamp).toLocaleString('en-NG')}
                      </td>
                      <td>
                        <div className="risk-bar-wrap" style={{ minWidth: 120 }}>
                          <div className="risk-bar-track">
                            <div
                              className="risk-bar-fill"
                              style={{
                                width: `${(tx.risk_score ?? 0) * 100}%`,
                                background: riskColor(tx.risk_score),
                              }}
                            />
                          </div>
                          <span className={`badge ${rl.cls}`}>{rl.label}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${statusBadge(tx.status)}`}>{tx.status}</span>
                      </td>
                    </tr>
                  );
                })
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
              {filtered.length} results · Page {page + 1} of {totalPages}
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
    </Layout>
  );
}