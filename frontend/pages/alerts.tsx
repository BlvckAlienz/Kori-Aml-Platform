import { useEffect, useState } from 'react';
import { fetchAlerts } from '../lib/api';
import type { Alert } from '../lib/types';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts()
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8">Loading alerts...</div>;

  const formatRisk = (score: number | undefined) => {
    if (score === undefined) return '-';
    return `${(score * 100).toFixed(0)}%`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Alerts</h1>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Transaction</th>
              <th className="px-4 py-2 text-left">Risk</th>
              <th className="px-4 py-2 text-left">Description</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {alerts.map(alert => (
              <tr key={alert.id}>
                <td className="px-4 py-2 font-mono text-sm">{alert.transaction_id.slice(0,8)}</td>
                <td className="px-4 py-2">{formatRisk(alert.risk_score)}</td>
                <td className="px-4 py-2">{alert.description}</td>
                <td className="px-4 py-2">{alert.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}