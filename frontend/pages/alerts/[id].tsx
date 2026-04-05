import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Layout from '../../components/Layout';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL;

type AlertDetail = {
  id: string;
  transaction_id: string;
  entity_id?: string;
  risk_score: number;
  description: string;
  status: string;
  created_at: string;
};

type RiskBreakdown = { reason: string; contribution: number }[];

type GraphData = {
  nodes: { id: string; label: string; risk_score?: number; properties?: Record<string, any> }[];
  edges: { source: string; target: string; type: string }[];
};

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', cls: 'badge-red' },
  { value: 'investigating', label: 'Investigating', cls: 'badge-amber' },
  { value: 'confirmed', label: 'Confirmed Fraud', cls: 'badge-red' },
  { value: 'false_positive', label: 'False Positive', cls: 'badge-gray' },
  { value: 'closed', label: 'Closed', cls: 'badge-green' },
];

const NODE_COLORS: Record<string, string> = {
  Transaction: '#00d4ff',
  User: '#8b5cf6',
  IP: '#f59e0b',
  SIM: '#10b981',
  Wallet: '#ec4899',
  Merchant: '#6366f1',
};

const NODE_LABELS: Record<string, string> = {
  Transaction: '⇄',
  User: '◉',
  IP: '⊕',
  SIM: '◷',
  Wallet: '◆',
  Merchant: '▤',
};

export default function AlertDetail() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const graphRef = useRef<any>(null);

  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [breakdown, setBreakdown] = useState<RiskBreakdown>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Fetch all alerts and find the one with this id
      const [alertsRes, graphRes] = await Promise.all([
        fetch(`${API}/alerts?limit=200&status=`),
        fetch(`${API}/alert/${id}/graph`),
      ]);

      if (alertsRes.ok) {
        const all = await alertsRes.json();
        const found = all.find((a: AlertDetail) => a.id === id);
        if (found) {
          setAlert(found);
          // Fetch breakdown
          const brRes = await fetch(`${API}/transaction/${found.transaction_id}/risk-breakdown`);
          if (brRes.ok) {
            const br = await brRes.json();
            setBreakdown(br.breakdown ?? []);
          }
        }
      }

      if (graphRes.ok) {
        const gd = await graphRes.json();
        // Transform for react-force-graph
        setGraphData({
          nodes: (gd.nodes ?? []).map((n: any) => ({
            id: n.id,
            label: n.label,
            risk_score: n.risk_score ?? 0,
            properties: n.properties ?? {},
            name: n.properties?.transaction_id ?? n.properties?.user_id ??
                  n.properties?.ip_address ?? n.properties?.phone_number ??
                  n.properties?.address ?? n.label,
          })),
          links: (gd.edges ?? []).map((e: any) => ({
            source: e.source,
            target: e.target,
            label: e.type,
          })),
        } as any);
      }
    } catch (err) {
      console.error('Alert detail error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateStatus = async (newStatus: string) => {
    if (!id) return;
    setUpdating(true);
    try {
      const res = await fetch(`${API}/alerts/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setAlert(prev => prev ? { ...prev, status: newStatus } : null);
        showToast(`Status updated to "${newStatus}"`, 'success');
      } else {
        showToast('Failed to update status', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const exportGraph = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `alert-graph-${id}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const riskColor = (score: number) => {
    if (score >= 0.8) return 'var(--red)';
    if (score >= 0.5) return 'var(--amber)';
    return 'var(--green)';
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
          Loading alert intelligence…
        </div>
      </Layout>
    );
  }

  if (!alert) {
    return (
      <Layout>
        <div className="empty-state">
          <div className="empty-icon">◈</div>
          <div className="empty-text">Alert not found</div>
        </div>
      </Layout>
    );
  }

  const currentStatus = STATUS_OPTIONS.find(s => s.value === alert.status);

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.back()} className="btn btn-outline btn-sm mb-2">
            ← Back to Alerts
          </button>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 600, color: '#fff' }}>
            Alert Investigation
          </h2>
          <span className="mono text-dim" style={{ fontSize: 12 }}>
            Alert ID: {id}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={exportGraph} className="btn btn-outline btn-sm">
            ⬇ Export Graph PNG
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        {/* Graph Panel */}
        <div className="kori-card">
          <div className="card-header">
            <span className="card-title">Entity Relationship Graph</span>
            <div className="flex items-center gap-3">
              {Object.entries(NODE_COLORS).map(([type, color]) => (
                <span key={type} className="flex items-center gap-1" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
                  {type}
                </span>
              ))}
            </div>
          </div>
          <div style={{ height: 460, background: 'rgba(0,0,0,0.2)', position: 'relative' }}>
            {(graphData as any).nodes?.length > 0 ? (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData as any}
                nodeLabel={(node: any) => `${node.label}: ${node.name}`}
                nodeColor={(node: any) => NODE_COLORS[node.label] ?? '#64748b'}
                nodeRelSize={6}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                  const size = node.label === 'Transaction' ? 8 : 6;
                  const color = NODE_COLORS[node.label] ?? '#64748b';
                  // Glow
                  ctx.shadowBlur = 12;
                  ctx.shadowColor = color;
                  // Node circle
                  ctx.beginPath();
                  ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                  ctx.fillStyle = color + '33';
                  ctx.fill();
                  ctx.strokeStyle = color;
                  ctx.lineWidth = 1.5;
                  ctx.stroke();
                  ctx.shadowBlur = 0;
                  // Label
                  const label = NODE_LABELS[node.label] ?? '·';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = color;
                  ctx.font = `${size + 2}px sans-serif`;
                  ctx.fillText(label, node.x!, node.y!);
                  // Name below
                  if (globalScale > 1.5) {
                    ctx.font = '8px DM Sans';
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.fillText(String(node.name ?? '').slice(0, 12), node.x!, node.y! + size + 6);
                  }
                }}
                linkColor={() => 'rgba(26,47,74,0.8)'}
                linkWidth={1}
                linkDirectionalParticles={2}
                linkDirectionalParticleColor={() => 'var(--cyan)'}
                linkDirectionalParticleSpeed={0.004}
                linkLabel={(link: any) => link.label}
                onNodeClick={(node: any) => setSelectedNode(node)}
                backgroundColor="transparent"
                width={undefined}
                height={460}
              />
            ) : (
              <div className="empty-state">
                <div className="empty-icon">⬡</div>
                <div className="empty-text">Graph data not available yet</div>
              </div>
            )}

            {/* Selected node tooltip */}
            {selectedNode && (
              <div style={{
                position: 'absolute', top: 12, right: 12,
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 8, padding: 12, maxWidth: 200,
                fontSize: 12,
              }}>
                <div style={{ fontWeight: 600, color: NODE_COLORS[selectedNode.label] ?? '#fff', marginBottom: 6 }}>
                  {selectedNode.label}
                </div>
                {Object.entries(selectedNode.properties ?? {}).slice(0, 5).map(([k, v]) => (
                  <div key={k} style={{ color: 'var(--text-dim)', marginBottom: 2 }}>
                    <span style={{ color: 'var(--text)' }}>{k}: </span>
                    <span className="mono">{String(v).slice(0, 20)}</span>
                  </div>
                ))}
                <button onClick={() => setSelectedNode(null)} style={{ marginTop: 8, fontSize: 10, color: 'var(--text-dim)', cursor: 'pointer', background: 'none', border: 'none' }}>
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Alert Summary */}
          <div className="kori-card">
            <div className="card-header">
              <span className="card-title">Alert Summary</span>
              <span className={`badge ${currentStatus?.cls ?? 'badge-gray'}`}>
                {currentStatus?.label ?? alert.status}
              </span>
            </div>
            <div className="card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div className="text-xs text-dim mb-2">Transaction ID</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text)' }}>
                  {alert.transaction_id}
                </div>
              </div>

              <div>
                <div className="text-xs text-dim mb-2">Risk Score</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontFamily: 'Sora, sans-serif',
                    fontSize: 28,
                    fontWeight: 700,
                    color: riskColor(alert.risk_score),
                  }}>
                    {(alert.risk_score * 100).toFixed(0)}%
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="risk-bar-track">
                      <div
                        className="risk-bar-fill"
                        style={{ width: `${alert.risk_score * 100}%`, background: riskColor(alert.risk_score) }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-dim mb-2">Created</div>
                <div style={{ fontSize: 12 }}>
                  {new Date(alert.created_at).toLocaleString('en-NG')}
                </div>
              </div>

              <div>
                <div className="text-xs text-dim mb-2">Description</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                  {alert.description}
                </div>
              </div>
            </div>
          </div>

          {/* Risk Breakdown */}
          <div className="kori-card">
            <div className="card-header">
              <span className="card-title">Risk Breakdown</span>
              <span className="text-xs text-dim">Explainable AI</span>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              {breakdown.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>No breakdown data</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {breakdown.map((item, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{item.reason}</span>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 11,
                          color: item.contribution >= 0.5 ? 'var(--red)' : 'var(--amber)',
                        }}>
                          +{(item.contribution * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="risk-bar-track">
                        <div
                          className="risk-bar-fill"
                          style={{
                            width: `${item.contribution * 100}%`,
                            background: item.contribution >= 0.5 ? 'var(--red)' : 'var(--amber)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                    CBN Baseline §5.1.3 — Transaction Monitoring
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="kori-card">
            <div className="card-header">
              <span className="card-title">Case Actions</span>
            </div>
            <div className="card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STATUS_OPTIONS.filter(s => s.value !== alert.status).map(s => (
                <button
                  key={s.value}
                  onClick={() => updateStatus(s.value)}
                  disabled={updating}
                  className={`btn btn-outline ${s.value === 'false_positive' ? 'btn-outline' : s.value === 'confirmed' ? 'btn-danger' : ''}`}
                  style={{ justifyContent: 'center', opacity: updating ? 0.6 : 1 }}
                >
                  {s.value === 'investigating' && '🔍 '}
                  {s.value === 'confirmed' && '⚡ '}
                  {s.value === 'false_positive' && '✗ '}
                  {s.value === 'closed' && '✓ '}
                  {s.label}
                </button>
              ))}
            </div>
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