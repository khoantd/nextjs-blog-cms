"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, RefreshCw, Clock } from "lucide-react";

interface StockPriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  marketState: 'open' | 'closed' | 'pre-market' | 'after-hours';
  currency: string;
}

interface CurrentStockPriceProps {
  symbol: string;
  className?: string;
}

const formatCurrency = (price: number, currency: string) => {
    if (currency === 'VND') {
      // For Vietnamese Dong, format without decimal places and add ₫ symbol
      return new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price) + ' ₫';
    } else {
      // For USD and other currencies, use standard format
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(price);
    }
  };

export function CurrentStockPrice({ symbol, className }: CurrentStockPriceProps) {
  const [stockData, setStockData] = useState<StockPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStockPrice = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/stock-price/${symbol}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to fetch: ${response.status}`);
      }

      const data: StockPriceData = await response.json();
      setStockData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching stock price:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stock price');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockPrice();

    // Auto-refresh every minute during market hours
    const interval = setInterval(() => {
      if (stockData?.marketState === 'open') {
        fetchStockPrice();
      }
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [symbol]);

  const getMarketStateColor = (state: string) => {
    switch (state) {
      case 'open':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pre-market':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'after-hours':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMarketStateText = (state: string) => {
    switch (state) {
      case 'open':
        return 'Market Open';
      case 'closed':
        return 'Market Closed';
      case 'pre-market':
        return 'Pre-Market';
      case 'after-hours':
        return 'After Hours';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Card className={`bg-muted/50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading price...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-red-50 border-red-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">Price unavailable</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchStockPrice}
              className="text-xs"
            >
              Retry
            </Button>
          </div>
          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!stockData) {
    return null;
  }

  const isPositive = (stockData.change ?? 0) >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className={`bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-slate-900">
                {stockData.symbol}
              </h3>
              <Badge className={getMarketStateColor(stockData.marketState)}>
                {getMarketStateText(stockData.marketState)}
              </Badge>
            </div>

            {/* Price Information */}
            <div className="space-y-1">
              <div className="flex items-baseline space-x-3">
                <span className="text-3xl font-bold text-slate-900">
                  {formatCurrency(stockData.price, stockData.currency)}
                </span>
                <span className="text-sm text-slate-500">
                  {stockData.currency}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <TrendIcon className={`h-4 w-4 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
                <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? '+' : ''}{stockData.change?.toFixed(2) ?? '0.00'} ({stockData.changePercent?.toFixed(2) ?? '0.00'}%)
                </span>
              </div>
            </div>

            {/* Last Updated */}
            {lastUpdated && (
              <div className="flex items-center space-x-1 text-xs text-slate-500">
                <Clock className="h-3 w-3" />
                <span>
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStockPrice}
            disabled={loading}
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Market Hours Info */}
        {stockData.marketState === 'closed' && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-600">
              Market is currently closed. Price shown is the last closing price.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
