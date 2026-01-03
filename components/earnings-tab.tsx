'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Brain, Calendar, DollarSign, AlertCircle } from "lucide-react";

interface EarningsData {
  id: number;
  symbol: string;
  company?: string;
  earningsDate: string;
  reportType: string;
  expectedEPS?: number;
  actualEPS?: number;
  surprise?: number;
  revenue?: number;
  expectedRevenue?: number;
  aiAnalysis?: {
    summary: string;
    sentiment: string;
    keyPoints: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface EarningsTabProps {
  symbol: string;
}

export function EarningsTab({ symbol }: EarningsTabProps) {
  const [earnings, setEarnings] = useState<EarningsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchEarnings();
  }, [symbol]);

  const fetchEarnings = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/earnings/${symbol}`);
      const data = await response.json();
      
      if (data.success) {
        setEarnings(data.data);
      } else {
        setError(data.message || 'Failed to fetch earnings data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch earnings');
    } finally {
      setLoading(false);
    }
  };

  const analyzeEarnings = async () => {
    setAnalyzing(true);
    
    try {
      const response = await fetch('/api/earnings/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: [symbol] }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh earnings data after analysis
        await fetchEarnings();
      } else {
        setError(data.message || 'Failed to analyze earnings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze earnings');
    } finally {
      setAnalyzing(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'negative':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSurpriseIcon = (surprise?: number) => {
    if (!surprise) return null;
    if (surprise > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (surprise < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading earnings data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (earnings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No earnings data available for {symbol}</p>
            <Button onClick={fetchEarnings} className="mt-4">
              Fetch Earnings Data
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Earnings History</h3>
        <Button 
          onClick={analyzeEarnings}
          disabled={analyzing}
          variant="outline"
          size="sm"
        >
          {analyzing ? 'Analyzing...' : 'Analyze with AI'}
        </Button>
      </div>

      <div className="grid gap-4">
        {earnings.map((earning) => (
          <Card key={earning.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {earning.company || earning.symbol}
                    {getSurpriseIcon(earning.surprise)}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(earning.earningsDate).toLocaleDateString()}
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {earning.reportType}
                    </span>
                  </CardDescription>
                </div>
                {earning.aiAnalysis && (
                  <Badge className={getSentimentColor(earning.aiAnalysis.sentiment)}>
                    {earning.aiAnalysis.sentiment}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Financial Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Expected EPS:</span>
                  <div className="font-medium">
                    {earning.expectedEPS ? `$${earning.expectedEPS.toFixed(2)}` : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Actual EPS:</span>
                  <div className="font-medium">
                    {earning.actualEPS ? `$${earning.actualEPS.toFixed(2)}` : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Surprise:</span>
                  <div className={`font-medium flex items-center gap-1 ${
                    earning.surprise && earning.surprise > 0 ? 'text-green-600' : 
                    earning.surprise && earning.surprise < 0 ? 'text-red-600' : ''
                  }`}>
                    {earning.surprise ? `${(earning.surprise * 100).toFixed(2)}%` : 'N/A'}
                    {getSurpriseIcon(earning.surprise)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Revenue:</span>
                  <div className="font-medium">
                    {earning.revenue ? `$${(earning.revenue / 1000000).toFixed(0)}M` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* AI Analysis */}
              {earning.aiAnalysis && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4" />
                    <span className="font-medium text-sm">AI Analysis</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {earning.aiAnalysis.summary}
                  </p>
                  {earning.aiAnalysis.keyPoints.length > 0 && (
                    <ul className="text-sm space-y-1">
                      {earning.aiAnalysis.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
