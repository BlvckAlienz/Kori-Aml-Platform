import { useEffect, useState } from 'react';
import { fetchRecentTransactions, fetchAlerts } from '../lib/api';
import type { Transaction, Alert } from '../lib/types';
import Link from 'next/link';

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadData = async () => {
    try {
      const [tx, al] = await Promise.all([
        fetchRecentTransactions(),
        fetchAlerts()
      ]);
      setTransactions(tx);
      setAlerts(al);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const formatRisk = (score: number | undefined) => {
    if (score === undefined) return '-';
    return `${(score * 100).toFixed(0)}%`;
  };

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">AML Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last refresh: {lastRefresh.toLocaleTimeString()}
          <button onClick={loadData} className="ml-2 px-2 py-1 bg-blue-500 text-white rounded">↻</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded shadow">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Recent Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th><th>Amount</th><th>Risk</th><th>Status</th></tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.transaction_id}>
                    <td className="px-4 py-2 text-sm font-mono">{tx.transaction_id.slice(0,8)}</td>
                    <td className="px-4 py-2 text-sm">₦{tx.amount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm">{formatRisk(tx.risk_score)}</td>
                    <td className="px-4 py-2 text-sm">{tx.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Alerts */}
        <div className="bg-white rounded shadow">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Open Alerts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tx ID</th><th>Risk</th><th>Description</th></tr>
              </thead>
              <tbody>
                {alerts.map(alert => (
                  <Link key={alert.id} href={`/alerts/${alert.id}`}>
                    <tr className="bg-red-50 cursor-pointer hover:bg-red-100">
                      <td className="px-4 py-2 text-sm font-mono">{alert.transaction_id.slice(0,8)}</td>
                      <td className="px-4 py-2 text-sm font-bold text-red-600">{formatRisk(alert.risk_score)}</td>
                      <td className="px-4 py-2 text-sm">{alert.description}</td>
                    </tr>
                  </Link>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}