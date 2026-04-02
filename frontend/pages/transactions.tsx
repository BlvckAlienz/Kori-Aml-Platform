import { useEffect, useState } from 'react';
import { fetchRecentTransactions } from '../lib/api';
import type { Transaction } from '../lib/types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentTransactions()
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8">Loading transactions...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Recent Transactions</h1>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">User</th>
              <th className="px-4 py-2 text-left">Amount</th>
              <th className="px-4 py-2 text-left">Time</th>
              <th className="px-4 py-2 text-left">Risk</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.map(tx => (
              <tr key={tx.transaction_id}>
                <td className="px-4 py-2 font-mono text-sm">{tx.transaction_id.slice(0,8)}</td>
                <td className="px-4 py-2">{tx.user_id || '-'}</td>
                <td className="px-4 py-2">₦{tx.amount.toLocaleString()}</td>
                <td className="px-4 py-2 text-sm">{new Date(tx.timestamp).toLocaleString()}</td>
                <td className="px-4 py-2">{(tx.risk_score * 100).toFixed(0)}%</td>
                <td className="px-4 py-2">{tx.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}