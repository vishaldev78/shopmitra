'use client';

import { useState } from 'react';

interface TrackResult {
  found: boolean;
  status?: string;
  payment_status?: string;
  created_at?: string;
}

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [tracking, setTracking] = useState(false);

  const handleTrack = async () => {
    if (!orderNumber.trim()) return;
    setTracking(true);
    try {
      const res = await fetch(`/api/orders/track?orderNumber=${encodeURIComponent(orderNumber.trim())}`);
      const data = await res.json();
      setResult(data.found ? { found: true, status: data.order.status, payment_status: data.order.payment_status, created_at: data.order.created_at } : { found: false });
    } catch {
      setResult({ found: false });
    } finally {
      setTracking(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-navy-900 mb-2 text-center">Track Your Order</h1>
      <p className="text-navy-500 text-center mb-6">Enter your order number to check status</p>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
            placeholder="e.g., SM-ABC123"
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button onClick={handleTrack} disabled={tracking} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">{tracking ? '...' : 'Track'}</button>
        </div>
        {result && (
          <div className={`mt-4 p-4 rounded-lg ${result.found ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {result.found ? (
              <div>
                <p className="font-medium text-green-700">Status: <span className="capitalize">{result.status}</span></p>
                <p className="text-xs text-green-600 mt-1">Payment: <span className="capitalize">{result.payment_status}</span></p>
                {result.created_at && <p className="text-xs text-green-600 mt-0.5">Placed on {new Date(result.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
              </div>
            ) : (
              <p className="text-sm text-red-600">Order not found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
