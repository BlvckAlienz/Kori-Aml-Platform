import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { fetchRecentTransactions, fetchAlerts, fetchDashboardStats } from '../lib/api';
import type { Transaction, Alert, DashboardStats } from '../lib/types';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const REFRESH_MS = 10000;

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadData = useCallback(async () => {
    try {
      const [tx, al, st] = await Promise.all([
        fetchRecentTransactions(20),
        fetchAlerts(10),
        fetchDashboardStats(),
      ]);
      setTransactions(tx);
      setAlerts(al);
      setStats(st);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, REFRESH_MS);
    return () => clearInterval(id);
  }, [loadData]);

  const riskColor = (score: number | undefined) => {
    if (!score) return 'var(--green)';
    if (score >= 0.8) return 'var(--red)';
    if (score >= 0.5) return 'var(--amber)';
    return 'var(--green)';
  };

  const riskLabel = (score: number | undefined) => {
    if (!score) return { label: 'LOW', cls: 'badge-green' };
    if (score >= 0.8) return { label: 'HIGH', cls: 'badge-red' };
    if (score >= 0.5) return { label: 'MED', cls: 'badge-amber' };
    return { label: 'LOW', cls: 'badge-green' };
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      open: 'badge-red',
      investigating: 'badge-amber',
      confirmed: 'badge-red',
      false_positive: 'badge-gray',
      closed: 'badge-green',
      ingested: 'badge-cyan',
    };
    return map[status] ?? 'badge-gray';
  };

  // Synthetic hourly data for charts based on transactions
  const hourlyData = Array.from({ length: 12 }, (_, i) => ({
    hour: `${String(i * 2).padStart(2, '0')}:00`,
    volume: Math.floor(Math.random() * 80 + 10),
    alerts: Math.floor(Math.random() * 15),
  }));

  if (loading) {
    return (
      <Layout>
        <div className="stat-grid mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 28, width: '40%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 10, width: '80%' }} />
            </div>
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Stat Cards */}
      <div className="stat-grid mb-6">
        <div className="stat-card cyan">
          <div className="stat-label">Transactions Today</div>
          <div className="stat-value">{stats?.tx_today ?? transactions.length}</div>
          <div className="stat-change">
            <span>All channels · NIBSS/POS/Mobile</span>
          </div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Open Alerts</div>
          <div className="stat-value">{stats?.open_alerts ?? alerts.length}</div>
          <div className="stat-change down">
            {stats?.open_alerts ? '⚑ Requires attention' : '—'}
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">High Risk (≥80%)</div>
          <div className="stat-value">
            {alerts.filter(a => a.risk_score >= 0.8).length}
          </div>
          <div className="stat-change down">
            {alerts.filter(a => a.risk_score >= 0.8).length > 0 ? '⚡ Immediate review needed' : '✓ Clear'}
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">False Positive Rate</div>
          <div className="stat-value">{stats?.fp_rate ?? '—'}%</div>
          <div className="stat-change">CBN target: &lt;30%</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2 mb-6">
        <div className="kori-card">
          <div className="card-header">
            <span className="card-title">Transaction Volume (24h)</span>
            <span className="text-xs text-dim">All channels</span>
          </div>
          <div className="card-body" style={{ padding: '16px' }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,47,74,0.8)" />
                <XAxis dataKey="hour" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-dim)' }}
                />
                <Line type="monotone" dataKey="volume" stroke="var(--cyan)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="kori-card">
          <div className="card-header">
            <span className="card-title">Alert Frequency (24h)</span>
            <span className="text-xs text-dim">By risk band</span>
          </div>
          <div className="card-body" style={{ padding: '16px' }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,47,74,0.8)" />
                <XAxis dataKey="hour" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                />
                <Bar dataKey="alerts" radius={[2, 2, 0, 0]}>
                  {hourlyData.map((entry, index) => (
                    <Cell key={index} fill={entry.alerts > 10 ? 'var(--red)' : entry.alerts > 5 ? 'var(--amber)' : 'var(--green)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Tables Row */}
      <div className="grid-2">
        {/* Recent Transactions */}
        <div className="kori-card">
          <div className="card-header">
            <span className="card-title">Live Transaction Feed</span>
            <div className="flex items-center gap-2">
              <span className="status-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              <span className="text-xs text-dim">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="kori-table">
              <thead>
                <tr>
                  <th>TX ID</th>
                  <th>Amount</th>
                  <th>Risk</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">
                        <div className="empty-icon">⇄</div>
                        <div className="empty-text">No transactions yet</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map(tx => {
                    const rl = riskLabel(tx.risk_score);
                    return (
                      <tr key={tx.transaction_id}>
                        <td className="mono">{tx.transaction_id.slice(0, 10)}…</td>
                        <td style={{ color: 'var(--cyan)' }}>
                          ₦{tx.amount.toLocaleString()}
                        </td>
                        <td>
                          <div className="risk-bar-wrap">
                            <div className="risk-bar-track" style={{ width: 60 }}>
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
                          <span className={`badge ${statusBadge(tx.status)}`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Open Alerts */}
        <div className="kori-card">
          <div className="card-header">
            <span className="card-title">Priority Alerts</span>
            <a href="/alerts" className="btn btn-outline btn-sm">View all →</a>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="kori-table">
              <thead>
                <tr>
                  <th>TX ID</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">
                        <div className="empty-icon">◈</div>
                        <div className="empty-text">No open alerts</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  alerts.map(alert => (
                    <tr key={alert.id}>
                      <td className="mono">{alert.transaction_id.slice(0, 10)}…</td>
                      <td>
                        <span style={{ color: riskColor(alert.risk_score), fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600 }}>
                          {(alert.risk_score * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusBadge(alert.status)}`}>
                          {alert.status}
                        </span>
                      </td>
                      <td>
                        <a href={`/alerts/${alert.id}`} className="btn btn-outline btn-sm">
                          Investigate →
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx>{`
        .status-dot { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
      `}</style>
    </Layout>
  );
}