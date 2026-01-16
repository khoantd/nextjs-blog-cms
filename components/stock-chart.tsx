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
  ReferenceLine,
} from "recharts";
import { TrendingUp, BarChart3, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StockAnalysisResult, Transaction } from "@/lib/types/stock-analysis";
import { formatPrice, getCurrencyCode } from "@/lib/currency-utils";
import { useState, useEffect } from "react";

interface StockChartProps {
  results: StockAnalysisResult | null;
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
  const [selectedYear, setSelectedYear] = useState<number | null>(null); // Will be set based on available data

  // Get available years from the data
  const getAvailableYears = (transactions: Transaction[]): number[] => {
    const years = new Set<number>();
    transactions.forEach(tx => {
      years.add(new Date(tx.date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending (most recent first)
  };

  // Initialize selectedYear when results are first available
  useEffect(() => {
    if (results?.transactions && results.transactions.length > 0 && selectedYear === null) {
      const availableYears = getAvailableYears(results.transactions);
      if (availableYears.length > 0) {
        // Set to most recent year in the data
        setSelectedYear(availableYears[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  // Debug: Log props on mount and when they change
  useEffect(() => {
    console.log('=== StockChart Component Debug ===');
    console.log('Props received:', { results, symbol });
    console.log('Results type:', typeof results);
    console.log('Results is null?', results === null);
    if (results) {
      console.log('Results structure:', {
        hasTransactions: 'transactions' in results,
        transactionsType: typeof results.transactions,
        transactionsIsArray: Array.isArray(results.transactions),
        transactionsLength: results.transactions?.length || 0,
      });
      if (results.transactions && results.transactions.length > 0) {
        console.log('First transaction:', results.transactions[0]);
      }
    }
    console.log('==================================');
  }, [results, symbol]);

  // Filter data based on time range
  const filterDataByTimeRange = (transactions: Transaction[], range: TimeRange, year?: number | null): Transaction[] => {
    if (transactions.length === 0) return transactions;
    
    // Sort transactions by date to ensure proper order
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // If 'all' is selected, return all transactions
    if (range === 'all') return sortedTransactions;
    
    // If 'year' is selected with a specific year, filter by that year
    if (range === 'year' && year) {
      const yearFiltered = sortedTransactions.filter(tx => {
        const txYear = new Date(tx.date).getFullYear();
        return txYear === year;
      });
      
      // Fallback: if no data for selected year, return last 365 days
      if (yearFiltered.length === 0) {
        console.warn(`No data found for year ${year}, falling back to last 365 days`);
        return sortedTransactions.slice(-365);
      }
      
      return yearFiltered;
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
        // If no year selected, show last 365 days
        dataPointsToShow = Math.min(365, sortedTransactions.length);
        break;
      default:
        dataPointsToShow = sortedTransactions.length;
    }
    
    // Return the last N data points
    return sortedTransactions.slice(-dataPointsToShow);
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

  // Return early if no results or no transactions data
  if (!results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stock Chart
          </CardTitle>
          <CardDescription className="text-slate-700 font-medium">
            Daily price movements and trends
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No analysis data available for charting
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!results.transactions || results.transactions.length === 0) {
    console.warn('[StockChart] No transactions found in results:', {
      hasResults: !!results,
      hasTransactions: !!results?.transactions,
      transactionsLength: results?.transactions?.length || 0,
      resultsKeys: results ? Object.keys(results) : [],
    });
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stock Chart
          </CardTitle>
          <CardDescription className="text-slate-700 font-medium">
            Daily price movements and trends
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No transaction data available for charting
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {results?.transactionsFound || 0} transactions found, but none available for display
          </p>
        </CardContent>
      </Card>
    );
  }

  // Process transaction data for charting
  const filteredTransactions = filterDataByTimeRange(results.transactions, timeRange, timeRange === 'year' ? selectedYear : undefined);
  const availableYears = getAvailableYears(results.transactions);
  
  // Ensure selectedYear is valid when year view is active
  useEffect(() => {
    if (timeRange === 'year' && results?.transactions && results.transactions.length > 0) {
      const availableYears = getAvailableYears(results.transactions);
      if (availableYears.length > 0 && (!selectedYear || !availableYears.includes(selectedYear))) {
        setSelectedYear(availableYears[0]); // Set to most recent year if current selection is invalid
      }
    }
  }, [timeRange, results, selectedYear]);
  
  // Debug information
  console.log('=== Chart Debug Info ===');
  console.log('Results object:', results);
  console.log('Total transactions:', results.transactions.length);
  console.log('Selected time range:', timeRange);
  console.log('Filtered transactions:', filteredTransactions.length);
  if (filteredTransactions.length > 0) {
    console.log('First transaction:', filteredTransactions[0]);
    console.log('Last transaction:', filteredTransactions[filteredTransactions.length - 1]);
    console.log('Date range:', filteredTransactions[0].date, 'to', filteredTransactions[filteredTransactions.length - 1].date);
  } else {
    console.warn('No filtered transactions available for charting');
  }
  console.log('========================');
  
  // Validate that we have valid transaction data
  if (filteredTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stock Chart
          </CardTitle>
          <CardDescription className="text-slate-700 font-medium">
            Daily price movements and trends
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No data available for the selected time range ({timeRange})
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const prices = filteredTransactions.map((tx: Transaction) => {
    const price = typeof tx.close === 'number' && !isNaN(tx.close) ? tx.close : 0;
    return price;
  }).filter(price => price > 0);
  
  if (prices.length === 0) {
    console.error('No valid price data found in transactions');
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stock Chart
          </CardTitle>
          <CardDescription className="text-slate-700 font-medium">
            Daily price movements and trends
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Invalid price data in transactions
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const sma20Values = calculateSMA(prices, 20);
  const sma50Values = calculateSMA(prices, 50);

  // Check if we have enough data for SMA50
  const hasEnoughDataForSMA50 = filteredTransactions.length >= 50;
  const hasEnoughDataForSMA20 = filteredTransactions.length >= 20;

  const chartData: ChartData[] = filteredTransactions.map((tx: Transaction, index: number) => {
    const price = typeof tx.close === 'number' && !isNaN(tx.close) && tx.close > 0 ? tx.close : 0;
    // Check for pctChange in multiple possible fields
    let pctChange: number | null = null;
    if (typeof tx.pctChange === 'number' && !isNaN(tx.pctChange)) {
      pctChange = tx.pctChange;
    } else if ('pct_change' in tx && typeof (tx as any).pct_change === 'number' && !isNaN((tx as any).pct_change)) {
      pctChange = (tx as any).pct_change;
    }
    
    // pctChange should already be in percentage format (e.g., 5.0 for 5%)
    // The migration script and backend calculate it as: ((current - previous) / previous) * 100
    // So we don't need to multiply by 100 here
    // Use 0 only if we truly have no value (null/undefined), not if the value is actually 0%
    const finalPctChange = pctChange !== null && pctChange !== undefined ? pctChange : 0;
    
    const dateStr = tx.date ? new Date(tx.date).toLocaleDateString() : 'Invalid Date';
    
    // Only include SMA values if we have valid price data
    const sma20 = price > 0 && sma20Values[index] > 0 && !isNaN(sma20Values[index]) ? sma20Values[index] : undefined;
    const sma50 = price > 0 && sma50Values[index] > 0 && !isNaN(sma50Values[index]) ? sma50Values[index] : undefined;
    
    return {
      date: dateStr,
      price: price,
      pctChange: finalPctChange,
      volume: Math.random() * 1000000 + 500000, // Mock volume data since it's not in the transaction
      significant: finalPctChange >= (results?.minPctChange || 4),
      sma20: sma20,
      sma50: sma50,
    };
  }).filter(data => data.price > 0); // Filter out invalid data points
  
  // Debug: Log transaction structure to understand data format
  if (filteredTransactions.length > 0) {
    console.log('=== Transaction Data Structure Debug ===');
    console.log('First transaction keys:', Object.keys(filteredTransactions[0]));
    console.log('First transaction sample:', filteredTransactions[0]);
    const samplePctChanges = filteredTransactions.slice(0, 10).map(tx => {
      const pctChange = typeof tx.pctChange === 'number' && !isNaN(tx.pctChange) 
        ? tx.pctChange 
        : ('pct_change' in tx && typeof (tx as any).pct_change === 'number' && !isNaN((tx as any).pct_change))
        ? (tx as any).pct_change
        : null;
      return {
        date: tx.date,
        pctChange: pctChange,
        close: tx.close,
        isNull: pctChange === null,
        isUndefined: pctChange === undefined,
        absoluteValue: pctChange !== null && pctChange !== undefined ? Math.abs(pctChange) : null
      };
    });
    console.log('PctChange values in first 10 transactions:', samplePctChanges);
    console.log('Chart data pctChange range:', {
      min: Math.min(...chartData.map(d => d.pctChange).filter(v => !isNaN(v) && isFinite(v))),
      max: Math.max(...chartData.map(d => d.pctChange).filter(v => !isNaN(v) && isFinite(v))),
      nonZeroCount: chartData.filter(d => d.pctChange !== 0).length
    });
    console.log('========================================');
  }
  
  // Final validation - ensure we have chart data
  if (chartData.length === 0) {
    console.error('No valid chart data after processing');
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stock Chart
          </CardTitle>
          <CardDescription className="text-slate-700 font-medium">
            Daily price movements and trends
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No valid price data available for charting
          </p>
        </CardContent>
      </Card>
    );
  }
  
  console.log('Chart data prepared:', chartData.length, 'valid data points');
  if (chartData.length > 0) {
    console.log('Sample chart data point:', chartData[0]);
    console.log('Price range:', Math.min(...chartData.map(d => d.price)), 'to', Math.max(...chartData.map(d => d.price)));
  }

  // Custom tooltip for the charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border-2 border-slate-400 rounded-lg p-3 shadow-xl">
          <p className="font-semibold text-slate-900">{label}</p>
          <p className="text-sm text-slate-700 font-medium">Price: {formatPrice(data.price, symbol || 'USD')}</p>
          {data.sma20 && !isNaN(data.sma20) && data.sma20 > 0 && (
            <p className="text-sm text-blue-700 font-medium">SMA20: {formatPrice(data.sma20, symbol || 'USD')}</p>
          )}
          {data.sma50 && !isNaN(data.sma50) && data.sma50 > 0 && (
            <p className="text-sm text-orange-700 font-medium">SMA50: {formatPrice(data.sma50, symbol || 'USD')}</p>
          )}
          <p className={`text-sm font-medium ${data.pctChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            Change: {data.pctChange >= 0 ? '+' : ''}{(data.pctChange ?? 0).toFixed(2)}%
          </p>
          <p className="text-sm text-slate-700">Volume: {(data.volume / 1000000).toFixed(2)}M</p>
          {data.significant && (
            <p className="text-xs text-blue-700 font-semibold">Significant Rise</p>
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
          <CardDescription className="text-slate-700 font-medium">
            Daily closing prices{timeRange === 'year' && availableYears.length > 0 ? ` for ${selectedYear}` : ''} with {hasEnoughDataForSMA20 ? '20-day' : ''}{hasEnoughDataForSMA20 && hasEnoughDataForSMA50 ? ' and ' : ''}{hasEnoughDataForSMA50 ? '50-day' : ''} Simple Moving Averages
            {!hasEnoughDataForSMA20 && !hasEnoughDataForSMA50 && ' (Insufficient data for SMA calculation)'}
          </CardDescription>
          <div className="text-xs font-medium text-slate-600 mt-1">
            Data points: {filteredTransactions.length} {hasEnoughDataForSMA20 ? '(SMA20 available)' : ''} {hasEnoughDataForSMA50 ? '(SMA50 available)' : ''}
          </div>
          {/* Time Range Selector */}
          <div className="flex flex-col gap-3 mt-3">
            <div className="flex gap-1">
              <Button
                variant={timeRange === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('all')}
                className={timeRange === 'all' ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700' : 'border-slate-400 text-slate-700 hover:bg-slate-100 hover:border-slate-500'}
              >
                All
              </Button>
              <Button
                variant={timeRange === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('day')}
                className={timeRange === 'day' ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700' : 'border-slate-400 text-slate-700 hover:bg-slate-100 hover:border-slate-500'}
              >
                Day
              </Button>
              <Button
                variant={timeRange === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('week')}
                className={timeRange === 'week' ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700' : 'border-slate-400 text-slate-700 hover:bg-slate-100 hover:border-slate-500'}
              >
                Week
              </Button>
              <Button
                variant={timeRange === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('month')}
                className={timeRange === 'month' ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700' : 'border-slate-400 text-slate-700 hover:bg-slate-100 hover:border-slate-500'}
              >
                Month
              </Button>
              <Button
                variant={timeRange === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setTimeRange('year');
                  // When switching to year view, ensure selectedYear is set to a valid year
                  if (results?.transactions && results.transactions.length > 0) {
                    const availableYears = getAvailableYears(results.transactions);
                    if (availableYears.length > 0 && (!selectedYear || !availableYears.includes(selectedYear))) {
                      setSelectedYear(availableYears[0]); // Set to most recent year
                    }
                  }
                }}
                className={timeRange === 'year' ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700' : 'border-slate-400 text-slate-700 hover:bg-slate-100 hover:border-slate-500'}
              >
                Year
              </Button>
            </div>
            
            {/* Year Selector - Only show when Year is selected */}
            {timeRange === 'year' && availableYears.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Select Year:</span>
                <Select value={selectedYear?.toString() || ''} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="w-32 border-slate-400 text-slate-900">
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
                <span className="text-xs font-medium text-slate-600">
                  ({filteredTransactions.length} data points)
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400} key={`price-chart-${chartData.length}-${timeRange}`}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="opacity-50" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                interval="preserveStartEnd"
                stroke="#64748b"
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                domain={['dataMin - 1', 'dataMax + 1']}
                stroke="#64748b"
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
          <CardDescription className="text-slate-700 font-medium">
            Percentage changes with threshold line at {results?.minPctChange || 4}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            // Calculate Y-axis domain based on actual data
            const pctChangeValues = chartData.map(d => d.pctChange ?? 0).filter(v => !isNaN(v) && isFinite(v));
            const minChange = pctChangeValues.length > 0 ? Math.min(...pctChangeValues) : 0;
            const maxChange = pctChangeValues.length > 0 ? Math.max(...pctChangeValues) : 10;
            
            // Handle case where all values are 0 or very small
            const allZero = pctChangeValues.length > 0 && Math.abs(maxChange) < 0.01 && Math.abs(minChange) < 0.01;
            const hasVariation = Math.abs(maxChange - minChange) > 0.01;
            
            // Set appropriate Y-axis domain
            let yAxisDomain: [number, number];
            if (allZero || !hasVariation) {
              // If all values are near zero, show a reasonable range around 0
              yAxisDomain = [-5, 5];
            } else {
              // Normal case: set domain with padding
              const padding = Math.max(1, (maxChange - minChange) * 0.1);
              yAxisDomain = [
                Math.min(0, minChange - padding),
                maxChange + padding
              ];
            }
            
            // Debug logging
            console.log('=== Daily Price Change Chart Debug ===');
            console.log('Chart data points:', chartData.length);
            console.log('PctChange values range:', { min: minChange, max: maxChange });
            console.log('All zero?', allZero, 'Has variation?', hasVariation);
            console.log('Y-axis domain:', yAxisDomain);
            console.log('Sample pctChange values:', chartData.slice(0, 10).map(d => ({ date: d.date, pctChange: d.pctChange })));
            console.log('Raw transaction data sample:', results?.transactions?.slice(0, 3));
            console.log('=======================================');
            
            // Show warning if all values are zero
            if (allZero) {
              return (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-800 mb-2">
                      ⚠️ Warning: All percentage change values are 0.00%
                    </p>
                    <p className="text-xs text-yellow-700">
                      This suggests the data may not have proper pctChange calculations. 
                      Check the backend analysis to ensure percentage changes are being calculated correctly.
                    </p>
                  </div>
                  <ResponsiveContainer width="100%" height={300} key={`change-chart-${chartData.length}-${timeRange}`}>
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="opacity-50" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                        interval="preserveStartEnd"
                        stroke="#64748b"
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                        label={{ value: 'Change (%)', angle: -90, position: 'insideLeft', fill: '#475569', fontWeight: 600 }}
                        stroke="#64748b"
                        domain={yAxisDomain}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="pctChange"
                        fill="#94a3b8"
                        name="Change (%)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            }
            
            return (
              <ResponsiveContainer width="100%" height={300} key={`change-chart-${chartData.length}-${timeRange}`}>
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="opacity-50" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                    interval="preserveStartEnd"
                    stroke="#64748b"
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                    label={{ value: 'Change (%)', angle: -90, position: 'insideLeft', fill: '#475569', fontWeight: 600 }}
                    stroke="#64748b"
                    domain={yAxisDomain}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="pctChange"
                    fill="#16a34a"
                    name="Change (%)"
                    radius={[4, 4, 0, 0]}
                  />
                  {/* Threshold reference line */}
                  {results?.minPctChange && results.minPctChange > 0 && (
                    <ReferenceLine
                      y={results.minPctChange}
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{ value: `${results.minPctChange}% threshold`, position: "top", fill: "#ef4444", fontSize: 12 }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </CardContent>
      </Card>

      {/* Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Trading Volume
          </CardTitle>
          <CardDescription className="text-slate-700 font-medium">
            Simulated trading volume data (not available in source data)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250} key={`volume-chart-${chartData.length}-${timeRange}`}>
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="opacity-50" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                interval="preserveStartEnd"
                stroke="#64748b"
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                label={{ value: 'Volume (M)', angle: -90, position: 'insideLeft', fill: '#475569', fontWeight: 600 }}
                stroke="#64748b"
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
          <CardDescription className="text-slate-700 font-medium">
            Summary of price movements for {timeRange}{timeRange === 'year' && availableYears.length > 0 ? ` ${selectedYear}` : ''} view ({filteredTransactions.length} data points)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-semibold text-slate-700">Price Range</span>
              <span className="text-lg font-bold text-slate-900">
                {formatPrice(Math.min(...chartData.map(d => d.price)), symbol || 'USD')} - {formatPrice(Math.max(...chartData.map(d => d.price)), symbol || 'USD')}
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-semibold text-slate-700">Avg Daily Change</span>
              <span className="text-lg font-bold text-slate-900">
                {(chartData.reduce((sum, d) => sum + (d.pctChange ?? 0), 0) / chartData.length).toFixed(2)}%
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-semibold text-slate-700">Biggest Gain</span>
              <span className="text-lg font-bold text-green-700">
                +{Math.max(...chartData.map(d => d.pctChange ?? 0)).toFixed(2)}%
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-semibold text-slate-700">Biggest Loss</span>
              <span className="text-lg font-bold text-red-700">
                {Math.min(...chartData.map(d => d.pctChange ?? 0)).toFixed(2)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
