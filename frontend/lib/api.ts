const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchRecentTransactions() {
  const res = await fetch(`${API_URL}/transactions/recent?limit=50`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${API_URL}/alerts?limit=50`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}