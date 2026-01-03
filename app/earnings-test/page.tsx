'use client';

import { useState } from 'react';

export default function EarningsTestPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const fetchEarnings = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/earnings/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: [symbol] }),
      });
      
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  const analyzeEarnings = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/earnings/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: [symbol] }),
      });
      
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  };

  const getEarningsHistory = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/earnings/${symbol}`);
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Earnings Data Test</h1>
      
      <div className="mb-6">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Stock Symbol (e.g., AAPL)"
          className="px-4 py-2 border rounded mr-2"
        />
        
        <button
          onClick={fetchEarnings}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded mr-2 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Fetch Earnings'}
        </button>
        
        <button
          onClick={analyzeEarnings}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded mr-2 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Analyze Earnings'}
        </button>
        
        <button
          onClick={getEarningsHistory}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Get History'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {results && (
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Results:</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
