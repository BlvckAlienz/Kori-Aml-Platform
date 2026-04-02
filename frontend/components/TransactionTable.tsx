import { Transaction } from '../lib/types';

interface TransactionTableProps {
  transactions: Transaction[];
  maxRows?: number;
}

export default function TransactionTable({ transactions, maxRows = 50 }: TransactionTableProps) {
  const formatRisk = (score: number | undefined) => {
    if (score === undefined) return '-';
    return `${(score * 100).toFixed(0)}%`;
  };

  const displayTransactions = maxRows ? transactions.slice(0, maxRows) : transactions;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {displayTransactions.map((tx) => (
            <tr key={tx.transaction_id} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm font-mono text-gray-900">
                {tx.transaction_id.slice(0, 8)}...
              </td>
              <td className="px-4 py-2 text-sm text-gray-900">
                ₦{tx.amount.toLocaleString()}
              </td>
              <td className="px-4 py-2 text-sm">
                <span
                  className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                    tx.risk_score && tx.risk_score >= 0.7
                      ? 'bg-red-100 text-red-800'
                      : tx.risk_score && tx.risk_score >= 0.3
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {formatRisk(tx.risk_score)}
                </span>
              </td>
              <td className="px-4 py-2 text-sm text-gray-900">
                <span className="capitalize">{tx.status}</span>
              </td>
            </tr>
          ))}
          {displayTransactions.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                No transactions found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}