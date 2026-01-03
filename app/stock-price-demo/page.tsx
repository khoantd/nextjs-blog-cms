"use client";

import { useState } from "react";
import { CurrentStockPrice } from "@/components/current-stock-price";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, Globe } from "lucide-react";

type Market = 'US' | 'VN';

export default function StockPriceDemoPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [searchSymbol, setSearchSymbol] = useState("");
  const [market, setMarket] = useState<Market>('US');
  const [key, setKey] = useState(0); // Force re-render when symbol changes

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchSymbol.trim()) {
      setSymbol(searchSymbol.toUpperCase().trim());
      setKey(prev => prev + 1); // Force component re-render
    }
  };

  const handleMarketChange = (newMarket: Market) => {
    setMarket(newMarket);
    // Reset symbol to a default from the selected market
    if (newMarket === 'US') {
      setSymbol('AAPL');
      setSearchSymbol('AAPL');
    } else {
      setSymbol('FPT');
      setSearchSymbol('FPT');
    }
    setKey(prev => prev + 1);
  };

  const getPlaceholderText = () => {
    return market === 'US' 
      ? "Enter US stock symbol (e.g., AAPL, GOOGL, TSLA)"
      : "Enter Vietnamese stock symbol (e.g., FPT, VNM, VIC)";
  };

  const popularStocks = [
    { symbol: "AAPL", name: "Apple Inc." },
    { symbol: "GOOGL", name: "Alphabet Inc." },
    { symbol: "MSFT", name: "Microsoft Corporation" },
    { symbol: "TSLA", name: "Tesla, Inc." },
    { symbol: "AMZN", name: "Amazon.com, Inc." },
    { symbol: "META", name: "Meta Platforms, Inc." },
    { symbol: "NVDA", name: "NVIDIA Corporation" },
    { symbol: "SNAP", name: "Snap Inc." },
  ];

  const vietnameseStocks = [
    { symbol: "FPT", name: "FPT Corporation" },
    { symbol: "VNM", name: "Vinamilk" },
    { symbol: "VIC", name: "Vingroup" },
    { symbol: "VRE", name: "Vincom Retail" },
    { symbol: "VCB", name: "Vietcombank" },
    { symbol: "VPB", name: "VPBank" },
    { symbol: "GAS", name: "PetroVietnam Gas" },
    { symbol: "HPG", name: "Hoa Phat Group" },
    { symbol: "MSN", name: "Masan Group" },
    { symbol: "MWG", name: "Mobile World Group" },
    { symbol: "SAB", name: "Sabeco" },
    { symbol: "SSI", name: "Saigon Securities" },
    { symbol: "VHM", name: "Vinhomes" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <TrendingUp className="h-8 w-8" />
          Current Stock Price Demo
        </h1>
        <p className="text-muted-foreground">
          Real-time stock price information with automatic updates
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Stock Symbol
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Market Selection */}
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <label className="text-sm font-medium">Market:</label>
            <Select value={market} onValueChange={handleMarketChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">🇺🇸 US Market</SelectItem>
                <SelectItem value="VN">🇻🇳 Vietnamese Market</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Search Input */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder={getPlaceholderText()}
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Current Stock Price Display */}
      <CurrentStockPrice key={key} symbol={symbol} />

      {/* Popular Stocks - Based on Selected Market */}
      <Card>
        <CardHeader>
          <CardTitle>
            {market === 'US' ? '🇺🇸 Popular US Stocks' : '🇻🇳 Popular Vietnamese Stocks'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            {(market === 'US' ? popularStocks : vietnameseStocks).map((stock) => (
              <Button
                key={stock.symbol}
                variant={stock.symbol === symbol ? "default" : "outline"}
                onClick={() => {
                  setSymbol(stock.symbol);
                  setSearchSymbol(stock.symbol);
                  setKey(prev => prev + 1);
                }}
                className="justify-start"
              >
                <div className="text-left">
                  <div className="font-medium">{stock.symbol}</div>
                  <div className="text-xs opacity-70">{stock.name}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Real-time Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Automatically refreshes every minute during market hours to show the latest prices.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Market Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Shows current market state (open, closed, pre-market, after-hours) with color indicators.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Price Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Displays daily price changes and percentage changes with visual indicators.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
