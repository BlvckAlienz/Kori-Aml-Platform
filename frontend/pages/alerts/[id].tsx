import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export default function AlertDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [alert, setAlert] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [riskBreakdown, setRiskBreakdown] = useState([]);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    // Fetch alert details
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts?limit=100`).then(res => res.json()).then(data => {
      const found = data.find(a => a.id === id);
      setAlert(found);
      if (found) {
        // Fetch risk breakdown for that transaction
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/transaction/${found.transaction_id}/risk-breakdown`)
          .then(res => res.json())
          .then(data => setRiskBreakdown(data.breakdown || []));
      }
    });
    // Fetch graph
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/alert/${id}/graph`)
      .then(res => res.json())
      .then(setGraphData)
      .catch(console.error);
  }, [id]);

  const updateStatus = async (newStatus) => {
    setUpdating(true);
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    setAlert({ ...alert, status: newStatus });
    setUpdating(false);
  };

  if (!alert) return <Layout><div className="p-8">Loading alert...</div></Layout>;

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph visualization */}
        <div className="lg:col-span-2 bg-white rounded shadow p-4">
          <h2 className="text-xl font-bold mb-2">Entity Graph</h2>
          <div className="h-96">
            <ForceGraph2D
              graphData={graphData}
              nodeLabel="label"
              nodeColor={node => (node.risk_score > 0.7 ? '#ef4444' : '#3b82f6')}
              linkLabel="type"
              width={800}
              height={400}
            />
          </div>
        </div>

        {/* Alert details & actions */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-bold mb-2">Alert Details</h2>
          <p><strong>Transaction ID:</strong> {alert.transaction_id}</p>
          <p><strong>Risk Score:</strong> {(alert.risk_score * 100).toFixed(0)}%</p>
          <p><strong>Status:</strong> 
            <span className={`ml-2 px-2 py-1 rounded text-sm ${
              alert.status === 'open' ? 'bg-red-100 text-red-800' :
              alert.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {alert.status}
            </span>
          </p>
          <div className="mt-4">
            <h3 className="font-semibold">Risk Breakdown</h3>
            <ul className="list-disc pl-5 mt-1">
              {riskBreakdown.map((item, idx) => (
                <li key={idx}>{item.reason}: +{item.contribution * 100}%</li>
              ))}
              {riskBreakdown.length === 0 && <li>No breakdown data</li>}
            </ul>
          </div>
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => updateStatus('investigating')}
              disabled={updating}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Mark Investigating
            </button>
            <button
              onClick={() => updateStatus('false_positive')}
              disabled={updating}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              False Positive
            </button>
            <button
              onClick={() => updateStatus('confirmed')}
              disabled={updating}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Confirm Fraud
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}