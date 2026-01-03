"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";
import type { StockAnalysisResult, Transaction } from "@/lib/types/stock-analysis";

interface StockChartProps {
  results: StockAnalysisResult;
}

interface ChartData {
  date: string;
  price: number;
  pctChange: number;
  volume: number;
  significant: boolean;
}

export function StockChart({ results }: StockChartProps) {
  // Process transaction data for charting
  const chartData: ChartData[] = results.transactions.map((tx: Transaction) => ({
    date: new Date(tx.date).toLocaleDateString(),
    price: tx.close,
    pctChange: tx.pctChange,
    volume: Math.random() * 1000000 + 500000, // Mock volume data since it's not in the transaction
    significant: tx.pctChange >= results.minPctChange,
  }));

  // Custom tooltip for the charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-sm">Price: ${data.price.toFixed(2)}</p>
          <p className={`text-sm ${data.pctChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Change: {data.pctChange >= 0 ? '+' : ''}{data.pctChange.toFixed(2)}%
          </p>
          <p className="text-sm">Volume: {(data.volume / 1000000).toFixed(2)}M</p>
          {data.significant && (
            <p className="text-xs text-blue-600 font-semibold">Significant Rise</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Price Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stock Price Movement
          </CardTitle>
          <CardDescription>
            Daily closing prices with significant increases highlighted
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#2563eb"
                strokeWidth={2}
                name="Price ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Price Change Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Daily Price Changes
          </CardTitle>
          <CardDescription>
            Percentage changes with threshold line at {results.minPctChange}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Change (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="pctChange"
                fill="#16a34a"
                name="Change (%)"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Trading Volume
          </CardTitle>
          <CardDescription>
            Simulated trading volume data (not available in source data)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Volume (M)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
                name="Volume"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Chart Statistics</CardTitle>
          <CardDescription>
            Summary of price movements and significant changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Price Range</span>
              <span className="text-lg font-semibold">
                ${Math.min(...chartData.map(d => d.price)).toFixed(2)} - ${Math.max(...chartData.map(d => d.price)).toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Avg Daily Change</span>
              <span className="text-lg font-semibold">
                {(chartData.reduce((sum, d) => sum + d.pctChange, 0) / chartData.length).toFixed(2)}%
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Biggest Gain</span>
              <span className="text-lg font-semibold text-green-600">
                +{Math.max(...chartData.map(d => d.pctChange)).toFixed(2)}%
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Biggest Loss</span>
              <span className="text-lg font-semibold text-red-600">
                {Math.min(...chartData.map(d => d.pctChange)).toFixed(2)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
