"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Upload, Loader2, AlertCircle, TrendingDown, DollarSign, Star } from "lucide-react";
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
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<{ stockAnalyses: StockAnalysis[] }>>(
    "/api/stock-analyses",
    fetcher,
    {
      refreshInterval: 5000,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
    }
  );

  // Handle favorite toggle
  const handleToggleFavorite = async (e: React.MouseEvent, analysisId: number, currentFavorite: boolean) => {
    e.preventDefault(); // Prevent navigation to detail page
    e.stopPropagation();
    
    // Validate analysisId
    if (!analysisId || isNaN(analysisId) || analysisId <= 0) {
      console.error('Invalid analysis ID:', analysisId);
      throw new Error('Invalid analysis ID');
    }
    
    try {
      const response = await fetch(`/api/stock-analyses/${analysisId}/favorite`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        let errorData;
        try {
          const responseText = await response.text();
          if (responseText) {
            errorData = JSON.parse(responseText);
          } else {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
        } catch (parseError) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText || 'Unknown error'}` };
        }
        console.error('API Error Response:', errorData);
        throw new Error(errorData.error || `Failed to update favorite status (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Update the local cache by mutating the data
        mutate((currentData) => {
          if (!currentData?.data?.stockAnalyses) return currentData;
          
          return {
            ...currentData,
            data: {
              stockAnalyses: currentData.data.stockAnalyses.map(analysis =>
                analysis.id === analysisId
                  ? { ...analysis, favorite: result.data.favorite }
                  : analysis
              )
            }
          };
        }, false);
        
        console.log(`Stock analysis ${result.data.favorite ? 'favorited' : 'unfavorited'} successfully`);
      } else {
        throw new Error('Failed to update favorite status');
      }
    } catch (err) {
      console.error('Error updating favorite status:', err);
      // You could show a toast notification here if you have one
    }
  };

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
    if (change === null || changePercent === null || change === undefined || changePercent === undefined) {
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

  // Filter and sort analyses
  const filteredAndSortedAnalyses = analyses
    .filter(analysis => !showFavoritesOnly || analysis.favorite)
    .sort((a, b) => {
      // Sort by favorite status first (favorites first), then by creation date
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const favoriteCount = analyses.filter(analysis => analysis.favorite).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Analyses</h1>
          <p className="text-muted-foreground">
            Analyze stock price data to identify significant daily changes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className="flex items-center gap-2"
          >
            <Star className={`h-4 w-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
            {showFavoritesOnly ? "Show All" : `Favorites (${favoriteCount})`}
          </Button>
          <Link href="/stock-analysis/create">
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              New Analysis
            </Button>
          </Link>
        </div>
      </div>

      {showFavoritesOnly && favoriteCount === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Star className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No favorite stock analyses yet</p>
            <p className="text-sm text-muted-foreground">
              Click the star icon on any analysis to add it to your favorites
            </p>
          </CardContent>
        </Card>
      )}

      {filteredAndSortedAnalyses.length === 0 && !showFavoritesOnly ? (
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
          {filteredAndSortedAnalyses.map((analysis) => {
            const results = parseAnalysisResults(analysis.analysisResults);
            return (
              <Link key={analysis.id} href={`/stock-analysis/${analysis.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-2xl">{analysis.symbol}</CardTitle>
                        {analysis.name && (
                          <CardDescription>{analysis.name}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(analysis.status)}>
                          {analysis.status || "draft"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async (e) => {
                            console.log('handleToggleFavorite called with analysis.id:', analysis.id);
                            try {
                              await handleToggleFavorite(e, analysis.id, analysis.favorite);
                            } catch (error) {
                              console.error('Error toggling favorite:', error);
                              // You could show a toast notification here
                            }
                          }}
                          className={`shrink-0 ${analysis.favorite ? "text-yellow-600 border-yellow-300 hover:bg-yellow-50" : ""}`}
                        >
                          <Star className={`h-4 w-4 ${analysis.favorite ? "fill-current" : ""}`} />
                        </Button>
                      </div>
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

                      {/* AI Price Recommendations */}
                      {(analysis.buyPrice || analysis.sellPrice) && (
                        <div className="grid grid-cols-2 gap-2">
                          {analysis.buyPrice && (
                            <div className="flex flex-col items-center p-2 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center space-x-1 text-green-600 mb-1">
                                <TrendingUp className="h-3 w-3" />
                                <span className="text-xs font-medium">Buy Target</span>
                              </div>
                              <div className="font-semibold text-green-700">
                                {formatPrice(analysis.buyPrice, analysis.symbol)}
                              </div>
                              {analysis.latestPrice && (
                                <div className="text-xs text-green-600 mt-1">
                                  {((analysis.buyPrice - analysis.latestPrice) / analysis.latestPrice * 100).toFixed(1)}%
                                </div>
                              )}
                            </div>
                          )}
                          {analysis.sellPrice && (
                            <div className="flex flex-col items-center p-2 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-center space-x-1 text-red-600 mb-1">
                                <TrendingDown className="h-3 w-3" />
                                <span className="text-xs font-medium">Sell Target</span>
                              </div>
                              <div className="font-semibold text-red-700">
                                {formatPrice(analysis.sellPrice, analysis.symbol)}
                              </div>
                              {analysis.latestPrice && (
                                <div className="text-xs text-red-600 mt-1">
                                  {((analysis.sellPrice - analysis.latestPrice) / analysis.latestPrice * 100).toFixed(1)}%
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

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
