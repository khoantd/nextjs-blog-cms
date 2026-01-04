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
import { TrendingUp, BarChart3, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StockAnalysisResult, Transaction } from "@/lib/types/stock-analysis";
import { formatPrice, getCurrencyCode } from "@/lib/currency-utils";
import { useState } from "react";

interface StockChartProps {
  results: StockAnalysisResult;
  symbol?: string;
}

interface ChartData {
  date: string;
  price: number;
  pctChange: number;
  volume: number;
  significant: boolean;
  sma20?: number;
  sma50?: number;
}

type TimeRange = 'day' | 'week' | 'month' | 'year' | 'all';

export function StockChart({ results, symbol }: StockChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('month'); // Start with 'month' for better initial view
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear()); // Default to current year

  // Filter data based on time range
  const filterDataByTimeRange = (transactions: Transaction[], range: TimeRange, year?: number): Transaction[] => {
    if (transactions.length === 0) return transactions;
    
    // Sort transactions by date to ensure proper order
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // If 'all' is selected, return all transactions
    if (range === 'all') return sortedTransactions;
    
    // If 'year' is selected with a specific year, filter by that year
    if (range === 'year' && year) {
      return sortedTransactions.filter(tx => {
        const txYear = new Date(tx.date).getFullYear();
        return txYear === year;
      });
    }
    
    let dataPointsToShow: number;
    
    switch (range) {
      case 'day':
        dataPointsToShow = Math.min(1, sortedTransactions.length);
        break;
      case 'week':
        dataPointsToShow = Math.min(7, sortedTransactions.length);
        break;
      case 'month':
        dataPointsToShow = Math.min(30, sortedTransactions.length);
        break;
      case 'year':
        dataPointsToShow = Math.min(365, sortedTransactions.length);
        break;
      default:
        dataPointsToShow = sortedTransactions.length;
    }
    
    // Return the last N data points
    return sortedTransactions.slice(-dataPointsToShow);
  };

  // Get available years from the data
  const getAvailableYears = (transactions: Transaction[]): number[] => {
    const years = new Set<number>();
    transactions.forEach(tx => {
      years.add(new Date(tx.date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending (most recent first)
  };

  // Calculate Simple Moving Average (SMA)
  const calculateSMA = (data: number[], period: number): number[] => {
    const sma: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(0); // Return 0 instead of NaN for early periods
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        const avg = sum / period;
        sma.push(isNaN(avg) || !isFinite(avg) ? 0 : avg);
      }
    }
    return sma;
  };

  // Return early if no transactions data
  if (!results?.transactions || results.transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stock Chart
          </CardTitle>
          <CardDescription>
            Price movement and significant increases
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No transaction data available for charting
          </p>
        </CardContent>
      </Card>
    );
  }

  // Process transaction data for charting
  const filteredTransactions = filterDataByTimeRange(results.transactions, timeRange, timeRange === 'year' ? selectedYear : undefined);
  const availableYears = getAvailableYears(results.transactions);
  
  // Debug information
  console.log('=== Chart Debug Info ===');
  console.log('Total transactions:', results.transactions.length);
  console.log('Selected time range:', timeRange);
  console.log('Filtered transactions:', filteredTransactions.length);
  if (filteredTransactions.length > 0) {
    console.log('Date range:', filteredTransactions[0].date, 'to', filteredTransactions[filteredTransactions.length - 1].date);
  }
  console.log('========================');
  
  const prices = filteredTransactions.map((tx: Transaction) => tx.close);
  const sma20Values = calculateSMA(prices, 20);
  const sma50Values = calculateSMA(prices, 50);

  // Check if we have enough data for SMA50
  const hasEnoughDataForSMA50 = filteredTransactions.length >= 50;
  const hasEnoughDataForSMA20 = filteredTransactions.length >= 20;

  const chartData: ChartData[] = filteredTransactions.map((tx: Transaction, index: number) => ({
    date: new Date(tx.date).toLocaleDateString(),
    price: tx.close,
    pctChange: tx.pctChange,
    volume: Math.random() * 1000000 + 500000, // Mock volume data since it's not in the transaction
    significant: tx.pctChange >= (results?.minPctChange || 4),
    sma20: sma20Values[index] > 0 ? sma20Values[index] : undefined,
    sma50: sma50Values[index] > 0 ? sma50Values[index] : undefined,
  }));

  // Custom tooltip for the charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-sm">Price: {formatPrice(data.price, symbol || 'USD')}</p>
          {data.sma20 && !isNaN(data.sma20) && data.sma20 > 0 && (
            <p className="text-sm text-blue-600">SMA20: {formatPrice(data.sma20, symbol || 'USD')}</p>
          )}
          {data.sma50 && !isNaN(data.sma50) && data.sma50 > 0 && (
            <p className="text-sm text-orange-600">SMA50: {formatPrice(data.sma50, symbol || 'USD')}</p>
          )}
          <p className={`text-sm ${data.pctChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Change: {data.pctChange >= 0 ? '+' : ''}{(data.pctChange ?? 0).toFixed(2)}%
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
            Daily closing prices{timeRange === 'year' && availableYears.length > 0 ? ` for ${selectedYear}` : ''} with {hasEnoughDataForSMA20 ? '20-day' : ''}{hasEnoughDataForSMA20 && hasEnoughDataForSMA50 ? ' and ' : ''}{hasEnoughDataForSMA50 ? '50-day' : ''} Simple Moving Averages
            {!hasEnoughDataForSMA20 && !hasEnoughDataForSMA50 && ' (Insufficient data for SMA calculation)'}
          </CardDescription>
          <div className="text-xs text-muted-foreground mt-1">
            Data points: {filteredTransactions.length} {hasEnoughDataForSMA20 ? '(SMA20 available)' : ''} {hasEnoughDataForSMA50 ? '(SMA50 available)' : ''}
          </div>
          {/* Time Range Selector */}
          <div className="flex flex-col gap-3 mt-3">
            <div className="flex gap-1">
              <Button
                variant={timeRange === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('all')}
              >
                All
              </Button>
              <Button
                variant={timeRange === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('day')}
              >
                Day
              </Button>
              <Button
                variant={timeRange === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('week')}
              >
                Week
              </Button>
              <Button
                variant={timeRange === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('month')}
              >
                Month
              </Button>
              <Button
                variant={timeRange === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('year')}
              >
                Year
              </Button>
            </div>
            
            {/* Year Selector - Only show when Year is selected */}
            {timeRange === 'year' && availableYears.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Select Year:</span>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Choose year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  ({filteredTransactions.length} data points)
                </span>
              </div>
            )}
          </div>
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
                name={`Price (${getCurrencyCode(symbol || 'USD')})`}
              />
              {hasEnoughDataForSMA20 && (
                <Line
                  type="monotone"
                  dataKey="sma20"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  name="SMA20"
                  connectNulls={false}
                />
              )}
              {hasEnoughDataForSMA50 && (
                <Line
                  type="monotone"
                  dataKey="sma50"
                  stroke="#f97316"
                  strokeWidth={1.5}
                  strokeDasharray="8 4"
                  dot={false}
                  name="SMA50"
                  connectNulls={false}
                />
              )}
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
            Percentage changes with threshold line at {results?.minPctChange || 4}%
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
            Summary of price movements for {timeRange}{timeRange === 'year' && availableYears.length > 0 ? ` ${selectedYear}` : ''} view ({filteredTransactions.length} data points)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Price Range</span>
              <span className="text-lg font-semibold">
                {formatPrice(Math.min(...chartData.map(d => d.price)), symbol || 'USD')} - {formatPrice(Math.max(...chartData.map(d => d.price)), symbol || 'USD')}
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Avg Daily Change</span>
              <span className="text-lg font-semibold">
                {(chartData.reduce((sum, d) => sum + (d.pctChange ?? 0), 0) / chartData.length).toFixed(2)}%
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Biggest Gain</span>
              <span className="text-lg font-semibold text-green-600">
                +{Math.max(...chartData.map(d => d.pctChange ?? 0)).toFixed(2)}%
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Biggest Loss</span>
              <span className="text-lg font-semibold text-red-600">
                {Math.min(...chartData.map(d => d.pctChange ?? 0)).toFixed(2)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
