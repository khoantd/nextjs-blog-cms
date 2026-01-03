"use client";

import { useState } from "react";
import { CurrentStockPrice } from "@/components/current-stock-price";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp } from "lucide-react";

export default function StockPriceDemoPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [searchSymbol, setSearchSymbol] = useState("");
  const [key, setKey] = useState(0); // Force re-render when symbol changes

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchSymbol.trim()) {
      setSymbol(searchSymbol.toUpperCase().trim());
      setKey(prev => prev + 1); // Force component re-render
    }
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
          <CardTitle>Search Stock Symbol</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Enter stock symbol (e.g., AAPL, GOOGL, TSLA)"
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

      {/* Popular Stocks */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Stocks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            {popularStocks.map((stock) => (
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
