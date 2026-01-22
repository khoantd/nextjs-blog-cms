"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { TrendingUp, Upload, Loader2, AlertCircle, TrendingDown, DollarSign, Star, BarChart3, Calendar } from "lucide-react";
import type { StockAnalysis, StockAnalysisResult } from "@/lib/types/stock-analysis";
import { formatPrice } from "@/lib/currency-utils";
import { getStockAnalyses } from "@/lib/stock-api";
import type { PaginatedResponse } from "@/lib/utils";

export function StockAnalysisList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12); // 12 items per page (4 columns x 3 rows)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Create SWR key that includes pagination parameters
  const swrKey = `stock-analyses?page=${currentPage}&limit=${pageSize}`;
  
  const fetcher = async () => {
    try {
      const response = await getStockAnalyses(currentPage, pageSize);
      return response;
    } catch (error) {
      throw new Error('Failed to fetch');
    }
  };

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<StockAnalysis>>(
    swrKey,
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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const newFavoriteStatus = !currentFavorite;
      
      const response = await fetch(`${baseUrl}/api/stock-analyses/${analysisId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: newFavoriteStatus }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error?.message || errorData.error || 'Failed to update favorite');
      }
      
      // Refresh the list to get updated favorite status
      mutate();
    } catch (err) {
      console.error('Error updating favorite status:', err);
      // You could show a toast notification here if you have one
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const analyses = data?.data || [];
  const pagination = data?.pagination;

  // Filter analyses (client-side filtering for favorites)
  // Note: For large datasets, consider moving favorites filter to server-side
  const filteredAnalyses = analyses.filter((analysis: StockAnalysis) => 
    !showFavoritesOnly || analysis.favorite
  );

  // Sort analyses (client-side sorting)
  const sortedAnalyses = [...filteredAnalyses].sort((a: StockAnalysis, b: StockAnalysis) => {
    // Sort by favorite status first (favorites first), then by creation date
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Calculate favorite count from current page data
  // Note: For accurate total favorite count, we'd need a separate API endpoint
  const favoriteCount = analyses.filter((analysis: StockAnalysis) => analysis.favorite).length;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Stock Analyses
          </h1>
          <p className="text-muted-foreground text-lg">
            Analyze stock price data to identify significant daily changes and patterns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            onClick={() => {
              setShowFavoritesOnly(!showFavoritesOnly);
              setCurrentPage(1); // Reset to first page when toggling filter
            }}
            className="flex items-center gap-2 transition-all duration-200 hover:scale-105"
          >
            <Star className={`h-4 w-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
            {showFavoritesOnly ? "Show All" : `Favorites (${favoriteCount})`}
          </Button>
          <Link href="/stock-analysis/create">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-200 hover:scale-105 shadow-lg">
              <Upload className="mr-2 h-4 w-4" />
              New Analysis
            </Button>
          </Link>
        </div>
      </div>

      {showFavoritesOnly && favoriteCount === 0 && (
        <Card className="border-dashed border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
          <CardContent className="flex flex-col items-center justify-center p-16">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center mb-6">
              <Star className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-3">No favorite analyses yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Click the star icon on any analysis to add it to your favorites and quickly access your most important stocks.
            </p>
            <Button variant="outline" onClick={() => setShowFavoritesOnly(false)}>
              Browse All Analyses
            </Button>
          </CardContent>
        </Card>
      )}

      {sortedAnalyses.length === 0 && !showFavoritesOnly ? (
        <Card className="border-dashed border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="flex flex-col items-center justify-center p-16">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mb-6">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-3">Start your first analysis</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Upload stock data to identify significant price changes and gain AI-powered insights.
            </p>
            <Link href="/stock-analysis/create">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">
                <Upload className="mr-2 h-4 w-4" />
                Create Your First Analysis
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedAnalyses.map((analysis) => {
            const results = parseAnalysisResults(analysis.analysisResults);
            return (
              <Link key={analysis.id} href={`/stock-analysis/${analysis.id}`}>
                <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer h-full border-0 bg-white/90 backdrop-blur-sm hover:scale-[1.02] overflow-hidden">
                  {/* Card Header with Gradient Border */}
                  <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                            {analysis.symbol}
                          </CardTitle>
                          {analysis.favorite && (
                            <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                              <Star className="h-3 w-3 text-white fill-current" />
                            </div>
                          )}
                        </div>
                        {analysis.name && (
                          <CardDescription className="text-base font-medium text-slate-600">
                            {analysis.name}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getStatusColor(analysis.status)} text-white border-0 shadow-sm`}>
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
                          className={`shrink-0 transition-all duration-200 hover:scale-110 ${analysis.favorite ? "text-yellow-600 border-yellow-300 hover:bg-yellow-50 hover:border-yellow-400" : "hover:text-yellow-600 hover:border-yellow-300"}`}
                        >
                          <Star className={`h-4 w-4 ${analysis.favorite ? "fill-current" : ""}`} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Enhanced Price Information */}
                    <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-semibold text-slate-700">Latest Price</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-2xl text-slate-900">
                          {formatPriceWithNull(analysis.latestPrice, analysis.symbol)}
                        </div>
                        <div className={`flex items-center justify-end space-x-1 text-sm font-medium ${formatPriceChange(analysis.priceChange, analysis.priceChangePercent).color}`}>
                          {analysis.priceChange !== null && analysis.priceChange >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : analysis.priceChange !== null ? (
                            <TrendingDown className="h-4 w-4" />
                          ) : null}
                          <span>
                            {formatPriceChange(analysis.priceChange, analysis.priceChangePercent).text}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* AI Price Recommendations */}
                    {(analysis.buyPrice || analysis.sellPrice) && (
                      <div className="grid grid-cols-2 gap-3">
                        {analysis.buyPrice && (
                          <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                            <div className="flex items-center space-x-1 text-green-600 mb-2">
                              <TrendingUp className="h-4 w-4" />
                              <span className="text-xs font-semibold">Buy Target</span>
                            </div>
                            <div className="font-bold text-green-700 text-lg">
                              {formatPrice(analysis.buyPrice, analysis.symbol)}
                            </div>
                            {analysis.latestPrice && (
                              <div className="text-xs text-green-600 mt-1 font-medium">
                                {((analysis.buyPrice - analysis.latestPrice) / analysis.latestPrice * 100).toFixed(1)}% potential
                              </div>
                            )}
                          </div>
                        )}
                        {analysis.sellPrice && (
                          <div className="p-3 bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl">
                            <div className="flex items-center space-x-1 text-red-600 mb-2">
                              <TrendingDown className="h-4 w-4" />
                              <span className="text-xs font-semibold">Sell Target</span>
                            </div>
                            <div className="font-bold text-red-700 text-lg">
                              {formatPrice(analysis.sellPrice, analysis.symbol)}
                            </div>
                            {analysis.latestPrice && (
                              <div className="text-xs text-red-600 mt-1 font-medium">
                                {((analysis.sellPrice - analysis.latestPrice) / analysis.latestPrice * 100).toFixed(1)}% potential
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Analysis Results */}
                    {results && (
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200/50">
                        <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Analysis Results
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Total Days:</span>
                            <span className="font-bold text-slate-800">{results.totalDays}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Transactions:</span>
                            <span className="font-bold text-green-600">
                              {results.transactionsFound}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Threshold:</span>
                            <span className="font-bold text-blue-600">≥ {results.minPctChange}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge className={`${getStatusColor(analysis.status)} text-white border-0 text-xs`}>
                              {analysis.status || "draft"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Footer */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200/50">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Created {new Date(analysis.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-blue-600">
                        <span className="text-sm font-medium">View Details</span>
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          </div>
          
          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <Card className="mt-6">
              <CardContent className="p-4">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  onPageChange={handlePageChange}
                  loading={isLoading}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
