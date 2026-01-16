"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, RefreshCw, Clock } from "lucide-react";
import { isVietnameseStock } from "@/lib/currency-utils";

interface StockPriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number | string; // Can be number or string (e.g., "5.23%")
  timestamp?: number;
  marketState?: 'open' | 'closed' | 'pre-market' | 'after-hours';
  currency: string;
}

interface CurrentStockPriceProps {
  symbol: string;
  country?: 'US' | 'VN';
  className?: string;
}

const formatCurrency = (price: number, currency: string) => {
    if (currency === 'VND') {
      // For Vietnamese Dong, multiply by 1000 (API returns price in thousands)
      // Use Vietnamese locale formatting
      // Show up to 2 decimal places, but don't force trailing zeros
      const priceInVND = price * 1000;
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(priceInVND);
    } else {
      // For USD and other currencies, use US locale format
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price);
    }
  };

  const formatChange = (change: number, currency: string) => {
    if (currency === 'VND') {
      // For Vietnamese Dong, multiply by 1000 (API returns change in thousands)
      // Show up to 2 decimal places if they exist
      const changeInVND = change * 1000;
      return new Intl.NumberFormat('vi-VN', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(changeInVND);
    } else {
      // For USD and other currencies, 2 decimal places
      return new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(change);
    }
  };

export function CurrentStockPrice({ symbol, country = 'US', className }: CurrentStockPriceProps) {
  const [stockData, setStockData] = useState<StockPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [actualMarket, setActualMarket] = useState<'US' | 'VN'>(country);

  // Auto-detect Vietnamese stocks if country is not explicitly set or if it's US but symbol is Vietnamese
  useEffect(() => {
    const detectedMarket = isVietnameseStock(symbol) ? 'VN' : (country || 'US');
    setActualMarket(detectedMarket);
  }, [symbol, country]);

  const fetchStockPrice = async (tryMarket: 'US' | 'VN' = actualMarket, isRetry = false) => {
    try {
      if (!isRetry) {
        setError(null);
        setLoading(true);
      }
      
      // Use the Next.js API route which handles server-side authentication and cookie forwarding
      // This is better than calling the backend directly from the client
      const timestamp = Date.now();
      const response = await fetch(`/api/stock-price/${symbol}?country=${tryMarket}&t=${timestamp}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error?.message || errorData.error || `Failed to fetch: ${response.status}`;
        
        // If US market fails with MUTUALFUND error and symbol is Vietnamese, retry with VN
        if (tryMarket === 'US' && 
            !isRetry &&
            (errorMessage.includes('MUTUALFUND') || errorMessage.includes('mutual fund') || errorMessage.includes('INVALID_SYMBOL_TYPE')) &&
            isVietnameseStock(symbol)) {
          console.log(`US market failed for ${symbol}, retrying with VN market...`);
          return await fetchStockPrice('VN', true);
        }
        
        throw new Error(errorMessage);
      }

      const data: any = await response.json();
      
      // Transform the response to match the component's expected format
      // Handle changePercent which might be a string (e.g., "5.23%") or number
      let changePercentValue: number | string;
      if (typeof data.changePercent === 'string') {
        changePercentValue = data.changePercent;
      } else if (typeof data.changePercent === 'number') {
        changePercentValue = data.changePercent;
      } else {
        // Calculate from change and price if not provided
        changePercentValue = data.change && data.price 
          ? ((data.change / data.price) * 100).toFixed(2) + '%'
          : '0.00%';
      }
      
      const stockPriceData: StockPriceData = {
        symbol: data.symbol,
        price: data.price,
        change: data.change ?? 0,
        changePercent: changePercentValue,
        currency: data.currency || (tryMarket === 'VN' ? 'VND' : 'USD'),
        timestamp: data.latestTradingDay ? new Date(data.latestTradingDay).getTime() : Date.now(),
        // marketState is not provided by backend, will be undefined
      };
      
      setStockData(stockPriceData);
      setActualMarket(tryMarket); // Remember which market worked
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stock price';
      
      // If US market fails with MUTUALFUND error and symbol is Vietnamese, retry with VN
      if (tryMarket === 'US' && 
          !isRetry &&
          (errorMessage.includes('MUTUALFUND') || errorMessage.includes('mutual fund') || errorMessage.includes('INVALID_SYMBOL_TYPE')) &&
          isVietnameseStock(symbol)) {
        console.log(`US market failed for ${symbol}, retrying with VN market...`);
        return await fetchStockPrice('VN', true);
      }
      
      console.error('Error fetching stock price:', err);
      setError(errorMessage);
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
  }, [symbol, actualMarket, stockData?.marketState]);

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
      <Card className={`bg-muted/40 ${className}`}>
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
              onClick={() => fetchStockPrice()}
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
              {stockData.marketState && (
                <Badge className={getMarketStateColor(stockData.marketState)}>
                  {getMarketStateText(stockData.marketState)}
                </Badge>
              )}
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
                  {isPositive ? '+' : ''}{formatChange(stockData.change ?? 0, stockData.currency)} (
                  {typeof stockData.changePercent === 'string' 
                    ? stockData.changePercent 
                    : `${stockData.changePercent?.toFixed(2) ?? '0.00'}%`}
                  )
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
            onClick={() => fetchStockPrice()}
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
