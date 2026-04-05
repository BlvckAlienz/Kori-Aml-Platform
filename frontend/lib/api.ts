const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail?.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ──────────────────────────────────────────────────────────
// Transactions
// ──────────────────────────────────────────────────────────
export const fetchRecentTransactions = (limit = 50) =>
  req<any[]>(`/transactions/recent?limit=${limit}`);

export const fetchTransactionBreakdown = (txId: string) =>
  req<{ breakdown: Array<{ reason: string; contribution: number }> }>(
    `/transaction/${txId}/risk-breakdown`
  );

// ──────────────────────────────────────────────────────────
// Alerts
// ──────────────────────────────────────────────────────────
export const fetchAlerts = (limit = 50, status?: string) => {
  const qs = status ? `?limit=${limit}&status=${status}` : `?limit=${limit}`;
  return req<any[]>(`/alerts${qs}`);
};

export const updateAlertStatus = (alertId: string, status: string) =>
  req(`/alerts/${alertId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const fetchAlertGraph = (alertId: string) =>
  req<{ nodes: any[]; edges: any[] }>(`/alert/${alertId}/graph`);

// ──────────────────────────────────────────────────────────
// Graph
// ──────────────────────────────────────────────────────────
export const fetchEntityNeighbors = (entityId: string) =>
  req<{ nodes: any[]; edges: any[] }>(`/graph/neighbors/${entityId}`);

// ──────────────────────────────────────────────────────────
// Blocklist
// ──────────────────────────────────────────────────────────
export const fetchBlocklist = () => req<any[]>('/blocklist');

export const addToBlocklist = (payload: { type: string; value: string; source: string }) =>
  req('/blocklist', { method: 'POST', body: JSON.stringify(payload) });

export const removeFromBlocklist = (id: string) =>
  req(`/blocklist/${id}`, { method: 'DELETE' });

// ──────────────────────────────────────────────────────────
// Audit Log
// ──────────────────────────────────────────────────────────
export const fetchAuditLog = (limit = 500) => req<any[]>(`/audit?limit=${limit}`);

// ──────────────────────────────────────────────────────────
// API Keys
// ──────────────────────────────────────────────────────────
export const fetchApiKeys = (token: string) =>
  req<any[]>('/api-keys', { headers: { Authorization: `Bearer ${token}` } });

export const createApiKey = (token: string, tier = 'free') =>
  req<{ key: string; id: string }>('/api-keys', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tier }),
  });

export const revokeApiKey = (token: string, keyId: string) =>
  req(`/api-keys/${keyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

// ──────────────────────────────────────────────────────────
// Dashboard Stats (computed)
// ──────────────────────────────────────────────────────────
export async function fetchDashboardStats() {
  try {
    const [alerts, txns] = await Promise.all([
      fetchAlerts(500),
      fetchRecentTransactions(500),
    ]);
    const total = alerts.length;
    const fp = alerts.filter((a: any) => a.status === 'false_positive').length;
    const open = alerts.filter((a: any) => a.status === 'open').length;
    const fp_rate = total > 0 ? parseFloat(((fp / total) * 100).toFixed(1)) : 0;
    const tx_today = txns.length;
    return { total_alerts: total, open_alerts: open, fp_rate, tx_today };
  } catch {
    return { total_alerts: 0, open_alerts: 0, fp_rate: 0, tx_today: 0 };
  }
}