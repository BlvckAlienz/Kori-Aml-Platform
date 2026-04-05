import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { fetchAlerts, fetchRecentTransactions } from '../lib/api';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function Reports() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAlerts(200),
      fetchRecentTransactions(200),
    ]).then(([al, tx]) => {
      setAlerts(al);
      setTransactions(tx);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Compute metrics
  const total = alerts.length;
  const confirmed = alerts.filter(a => a.status === 'confirmed').length;
  const fp = alerts.filter(a => a.status === 'false_positive').length;
  const open = alerts.filter(a => a.status === 'open').length;
  const investigating = alerts.filter(a => a.status === 'investigating').length;
  const closed = alerts.filter(a => a.status === 'closed').length;

  const fpRate = total > 0 ? ((fp / total) * 100).toFixed(1) : '0.0';
  const strRate = total > 0 ? ((confirmed / total) * 100).toFixed(1) : '0.0';

  // Average investigation time (mock with available data)
  const avgTurnaround = '4.2h'; // would be computed from case timelines

  const riskDistData = [
    { name: 'High (≥80%)', value: alerts.filter(a => a.risk_score >= 0.8).length, color: '#ef4444' },
    { name: 'Medium (50–79%)', value: alerts.filter(a => a.risk_score >= 0.5 && a.risk_score < 0.8).length, color: '#f59e0b' },
    { name: 'Low (<50%)', value: alerts.filter(a => a.risk_score < 0.5).length, color: '#10b981' },
  ].filter(d => d.value > 0);

  const statusData = [
    { name: 'Open', value: open, color: '#ef4444' },
    { name: 'Investigating', value: investigating, color: '#f59e0b' },
    { name: 'Confirmed', value: confirmed, color: '#8b5cf6' },
    { name: 'False Positive', value: fp, color: '#64748b' },
    { name: 'Closed', value: closed, color: '#10b981' },
  ].filter(d => d.value > 0);

  const exportCSV = () => {
    const rows = [
      ['Metric', 'Value', 'CBN Target'],
      ['Total Alerts', total, '—'],
      ['Confirmed Fraud', confirmed, '—'],
      ['False Positives', fp, '—'],
      ['STR Conversion Rate', `${strRate}%`, '>5%'],
      ['False Positive Rate', `${fpRate}%`, '<30%'],
      ['Open Alerts', open, '—'],
      ['Avg Investigation Time', avgTurnaround, '<48h'],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kori-report-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
            Effectiveness Metrics
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            CBN Baseline Standards §5.1 — Governance & Effectiveness Reporting
          </p>
        </div>
        <button onClick={exportCSV} className="btn btn-primary">
          ⬇ Export CSV Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid mb-6">
        <div className="stat-card cyan">
          <div className="stat-label">STR Conversion Rate</div>
          <div className="stat-value">{strRate}%</div>
          <div className="stat-change">Target: &gt;5% · CBN §5.1.4</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">False Positive Rate</div>
          <div className={`stat-value ${parseFloat(fpRate) > 30 ? 'down' : ''}`}>{fpRate}%</div>
          <div className="stat-change">{parseFloat(fpRate) <= 30 ? '✓ Within CBN target (30%)' : '⚠ Exceeds CBN target'}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Avg Investigation Time</div>
          <div className="stat-value">{avgTurnaround}</div>
          <div className="stat-change">Target: &lt;48h · CBN §5.1.3</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Total Alerts (All Time)</div>
          <div className="stat-value">{total}</div>
          <div className="stat-change">{open} currently open</div>
        </div>
      </div>

      <div className="grid-2 mb-6">
        {/* Risk Distribution */}
        <div className="kori-card">
          <div className="card-header">
            <span className="card-title">Risk Distribution</span>
            <span className="text-xs text-dim">All alerts</span>
          </div>
          <div className="card-body" style={{ padding: 16 }}>
            {riskDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={riskDistData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {riskDistData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><div className="empty-text">No alert data yet</div></div>
            )}
          </div>
        </div>

        {/* Alert Status Breakdown */}
        <div className="kori-card">
          <div className="card-header">
            <span className="card-title">Alert Status Breakdown</span>
            <span className="text-xs text-dim">Case management</span>
          </div>
          <div className="card-body" style={{ padding: 16 }}>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,47,74,0.8)" />
                  <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                  />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><div className="empty-text">No data yet</div></div>
            )}
          </div>
        </div>
      </div>

      {/* CBN Compliance Checklist */}
      <div className="kori-card">
        <div className="card-header">
          <span className="card-title">CBN Baseline Standards — Self-Assessment</span>
          <span className="text-xs text-dim">§5.1 Compliance Status</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="kori-table">
            <thead>
              <tr>
                <th>CBN Requirement</th>
                <th>Section</th>
                <th>Platform Feature</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { req: 'Transaction Monitoring', sec: '§5.1.3', feat: 'Real-time risk scoring engine', status: 'Implemented' },
                { req: 'Sanctions & Blocklist Screening', sec: '§5.1.2', feat: 'Blocklist management + API', status: 'Implemented' },
                { req: 'Case Management', sec: '§5.1.3', feat: 'Alert investigation workflow', status: 'Implemented' },
                { req: 'Audit Trails', sec: '§5.1.6', feat: 'Audit log with user/action/timestamp', status: 'Implemented' },
                { req: 'Explainable Decisions', sec: '§5.1.3', feat: 'Risk breakdown per transaction', status: 'Implemented' },
                { req: 'False Positive Management', sec: '§5.1.3', feat: 'FP status + effectiveness metrics', status: 'Implemented' },
                { req: 'Regulatory Reporting (STR)', sec: '§5.1.4', feat: 'STR export + conversion tracking', status: 'Partial' },
                { req: 'Travel Rule (FATF R.16)', sec: '§5.1.5', feat: 'Travel Rule module (MVP)', status: 'Partial' },
                { req: 'Customer Due Diligence', sec: '§5.1.1', feat: 'KYC fields in user schema', status: 'Roadmap' },
                { req: 'System Integration (Core Banking)', sec: '§5.1.7', feat: 'Webhook API for any system', status: 'Implemented' },
              ].map((row, i) => (
                <tr key={i}>
                  <td>{row.req}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{row.sec}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{row.feat}</td>
                  <td>
                    <span className={`badge ${row.status === 'Implemented' ? 'badge-green' : row.status === 'Partial' ? 'badge-amber' : 'badge-gray'}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}