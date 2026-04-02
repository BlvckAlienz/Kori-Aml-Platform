import { Alert } from '../lib/types';

interface AlertListProps {
  alerts: Alert[];
  maxRows?: number;
}

export default function AlertList({ alerts, maxRows = 50 }: AlertListProps) {
  const formatRisk = (score: number | undefined) => {
    if (score === undefined) return '-';
    return `${(score * 100).toFixed(0)}%`;
  };

  const displayAlerts = maxRows ? alerts.slice(0, maxRows) : alerts;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tx ID</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {displayAlerts.map((alert) => (
            <tr key={alert.id} className="bg-red-50 hover:bg-red-100">
              <td className="px-4 py-2 text-sm font-mono text-gray-900">
                {alert.transaction_id.slice(0, 8)}...
              </td>
              <td className="px-4 py-2 text-sm font-bold text-red-700">
                {formatRisk(alert.risk_score)}
              </td>
              <td className="px-4 py-2 text-sm text-gray-900">
                {alert.description}
              </td>
              <td className="px-4 py-2 text-sm">
                <span className="capitalize inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-red-200 text-red-800">
                  {alert.status}
                </span>
              </td>
            </tr>
          ))}
          {displayAlerts.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                No alerts found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}