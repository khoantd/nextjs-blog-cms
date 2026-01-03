"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Upload, Loader2, AlertCircle, TrendingDown, DollarSign } from "lucide-react";
import type { StockAnalysis, StockAnalysisResult } from "@/lib/types/stock-analysis";
import { formatPrice } from "@/lib/currency-utils";

interface ApiResponse<T> {
  data: T;
  error?: string;
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => {
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  return res.json();
});

export function StockAnalysisList() {
  const { data, error, isLoading } = useSWR<ApiResponse<{ stockAnalyses: StockAnalysis[] }>>(
    "/api/stock-analyses",
    fetcher,
    {
      refreshInterval: 5000,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
    }
  );

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "analyzing":
        return "bg-blue-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const parseAnalysisResults = (resultsJson: string | null): StockAnalysisResult | null => {
    if (!resultsJson) return null;
    try {
      return JSON.parse(resultsJson);
    } catch {
      return null;
    }
  };

  const formatPriceWithNull = (price: number | null, symbol: string): string => {
    if (price === null) return "N/A";
    return formatPrice(price, symbol);
  };


  const formatPriceChange = (change: number | null, changePercent: number | null): { text: string; color: string } => {
    if (change === null || changePercent === null) {
      return { text: "N/A", color: "text-muted-foreground" };
    }
    
    const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
    const color = change >= 0 ? "text-green-600" : "text-red-600";
    
    return { text: changeText, color };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load stock analyses</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  const analyses = data?.data?.stockAnalyses || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Analyses</h1>
          <p className="text-muted-foreground">
            Analyze stock price data to identify significant daily changes
          </p>
        </div>
        <Link href="/stock-analysis/create">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            New Analysis
          </Button>
        </Link>
      </div>

      {analyses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No stock analyses yet</p>
            <Link href="/stock-analysis/create">
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Create Your First Analysis
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {analyses.map((analysis) => {
            const results = parseAnalysisResults(analysis.analysisResults);
            return (
              <Link key={analysis.id} href={`/stock-analysis/${analysis.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl">{analysis.symbol}</CardTitle>
                        {analysis.name && (
                          <CardDescription>{analysis.name}</CardDescription>
                        )}
                      </div>
                      <Badge className={getStatusColor(analysis.status)}>
                        {analysis.status || "draft"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Price Information */}
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Latest Price</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg">
                            {formatPriceWithNull(analysis.latestPrice, analysis.symbol)}
                          </div>
                          <div className={`text-sm flex items-center justify-end space-x-1 ${formatPriceChange(analysis.priceChange, analysis.priceChangePercent).color}`}>
                            {analysis.priceChange !== null && analysis.priceChange >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : analysis.priceChange !== null ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : null}
                            <span>
                              {formatPriceChange(analysis.priceChange, analysis.priceChangePercent).text}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Analysis Results */}
                      {results && (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Days:</span>
                            <span className="font-medium">{results.totalDays}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Transactions Found:</span>
                            <span className="font-medium text-green-600">
                              {results.transactionsFound}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Threshold:</span>
                            <span className="font-medium">≥ {results.minPctChange}%</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between pt-2 border-t text-sm">
                        <span className="text-muted-foreground">Created:</span>
                        <span className="font-medium">
                          {new Date(analysis.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
