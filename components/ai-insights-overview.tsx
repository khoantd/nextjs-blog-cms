"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Brain, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Filter,
  Sparkles,
  BarChart3,
  Calendar,
  Target
} from "lucide-react";
import { getStockAnalyses } from "@/lib/stock-api";
import type { StockAnalysis } from "@/lib/types/stock-analysis";

interface AIInsight {
  analysisId: number;
  symbol: string;
  name?: string | null;
  insights: any; // Parsed AI insights object
  generatedAt?: string;
  confidence?: string;
  dataPoints?: number;
  factorsAnalyzed?: number;
  createdAt: Date;
}

const fetcher = async () => {
  try {
    const response = await getStockAnalyses(1, 1000); // Get all analyses
    return response;
  } catch (error) {
    throw new Error('Failed to fetch stock analyses');
  }
};

export function AIInsightsOverview() {
  const { data, error, isLoading } = useSWR(
    "ai-insights-overview",
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      errorRetryCount: 3,
    }
  );

  const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("all");
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // 10 insights per page
  const [stats, setStats] = useState({
    totalInsights: 0,
    totalAnalyses: 0,
    avgConfidence: 0,
    totalDataPoints: 0,
  });

  useEffect(() => {
    if (!data?.data) {
      console.log('[AI Insights Overview] No data available from getStockAnalyses');
      return;
    }

    const analyses = data.data as StockAnalysis[];
    console.log(`[AI Insights Overview] Fetched ${analyses.length} total analyses`);

    // Filter analyses with AI insights
    const insightsList: AIInsight[] = [];
    const symbols = new Set<string>();

    analyses.forEach((analysis) => {
      if (analysis.aiInsights && (analysis.status === 'ai_completed' || analysis.status === 'completed')) {
        try {
          const parsedInsights = typeof analysis.aiInsights === 'string' 
            ? JSON.parse(analysis.aiInsights) 
            : analysis.aiInsights;

          if (parsedInsights && typeof parsedInsights === 'object') {
            insightsList.push({
              analysisId: analysis.id,
              symbol: analysis.symbol || 'N/A',
              name: analysis.name,
              insights: parsedInsights,
              generatedAt: parsedInsights.generatedAt,
              confidence: parsedInsights.confidence,
              dataPoints: parsedInsights.dataPoints,
              factorsAnalyzed: parsedInsights.factorsAnalyzed,
              createdAt: new Date(analysis.createdAt),
            });

            if (analysis.symbol) {
              symbols.add(analysis.symbol);
            }
          }
        } catch (error) {
          console.warn(`[AI Insights Overview] Failed to parse AI insights for analysis ${analysis.id}:`, error);
        }
      }
    });

    // Sort by creation date (newest first)
    insightsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    setAIInsights(insightsList);
    setAvailableSymbols(Array.from(symbols).sort());

    // Calculate statistics
    const totalDataPoints = insightsList.reduce((sum, insight) => sum + (insight.dataPoints || 0), 0);
    const confidences = insightsList
      .map(i => i.confidence)
      .filter(c => c)
      .map(c => {
        if (c === 'high') return 100;
        if (c === 'medium') return 50;
        if (c === 'low') return 25;
        return 50;
      });
    const avgConfidence = confidences.length > 0 
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length 
      : 0;

    setStats({
      totalInsights: insightsList.length,
      totalAnalyses: analyses.length,
      avgConfidence,
      totalDataPoints,
    });
  }, [data]);

  // Filter insights by symbol
  const filteredInsights = selectedSymbol === "all" 
    ? aiInsights 
    : aiInsights.filter(i => i.symbol === selectedSymbol);

  // Pagination logic
  const totalPages = Math.ceil(filteredInsights.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedInsights = filteredInsights.slice(startIndex, endIndex);

  // Reset to page 1 when symbol filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSymbol]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const parseInsights = (insights: any) => {
    if (!insights) return null;

    // If it's a structured object with summary/keyPoints
    if (typeof insights === 'object' && ('summary' in insights || 'keyPoints' in insights)) {
      return {
        summary: insights.summary || '',
        keyPoints: insights.keyPoints || [],
        confidence: insights.confidence,
        dataPoints: insights.dataPoints,
        factorsAnalyzed: insights.factorsAnalyzed,
        generatedAt: insights.generatedAt,
      };
    }

    // If it's a markdown string
    if (typeof insights === 'string') {
      return {
        summary: insights,
        keyPoints: [],
      };
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-500" />
          <p className="text-muted-foreground">Loading AI insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-destructive font-medium">Failed to load AI insights</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasNoInsights = !isLoading && aiInsights.length === 0;
  const hasNoAnalyses = !isLoading && (!data?.data || (data.data as StockAnalysis[]).length === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="h-8 w-8 text-purple-600" />
          AI Insights Overview
        </h1>
        <p className="text-muted-foreground mt-2">
          AI-powered analysis and insights across all stock analyses
        </p>
      </div>

      {/* Statistics */}
      {stats.totalInsights > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.totalInsights}</div>
              <p className="text-xs text-muted-foreground mt-1">AI analyses available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.avgConfidence.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground mt-1">Average confidence level</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Data Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalDataPoints.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Total analyzed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Analyses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAnalyses}</div>
              <p className="text-xs text-muted-foreground mt-1">Stock analyses</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty States */}
      {hasNoAnalyses && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Brain className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Stock Analyses Found</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              You need to create and complete stock analyses before viewing AI insights.
            </p>
            <Link href="/stock-analysis/create">
              <Button>
                <TrendingUp className="mr-2 h-4 w-4" />
                Create New Analysis
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {hasNoInsights && !hasNoAnalyses && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Sparkles className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No AI Insights Available</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              You have {stats.totalAnalyses} analysis/analyses, but none have AI insights generated yet.
              Complete an analysis to generate AI insights.
            </p>
            <Link href="/stock-analyses">
              <Button variant="outline">
                <ArrowRight className="mr-2 h-4 w-4" />
                View Analyses
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {aiInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Stock Symbol:</label>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select symbol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Symbols</SelectItem>
                    {availableSymbols.map((symbol) => (
                      <SelectItem key={symbol} value={symbol}>
                        {symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSymbol !== "all" && (
                <Badge variant="outline" className="text-sm">
                  Filtered by: {selectedSymbol} ({filteredInsights.length} insights)
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights List */}
      {filteredInsights.length > 0 && (
        <>
          <div className="space-y-4">
            {paginatedInsights.map((insight) => {
            const parsed = parseInsights(insight.insights);
            if (!parsed) return null;

            return (
              <Card key={insight.analysisId} className="border-purple-200 hover:border-purple-300 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-purple-600" />
                        {insight.symbol}
                        {insight.name && (
                          <span className="text-sm font-normal text-muted-foreground">
                            - {insight.name}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Analysis ID: {insight.analysisId}
                        {insight.generatedAt && (
                          <span className="ml-2">
                            • Generated: {new Date(insight.generatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Link href={`/stock-analysis/${insight.analysisId}`}>
                      <Button variant="outline" size="sm">
                        <ArrowRight className="mr-2 h-4 w-4" />
                        View Analysis
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary */}
                  {parsed.summary && (
                    <div>
                      <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Summary
                      </h4>
                      <div className="text-sm text-gray-700 bg-purple-50 p-3 rounded-md">
                        {(() => {
                          const sentences = parsed.summary.split('. ').filter((s: string) => s.trim());
                          return sentences.length > 1 ? (
                            <ul className="space-y-1">
                              {sentences.map((sentence: string, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-purple-500 mt-1">•</span>
                                  <span>{sentence.trim()}{sentence.trim() && !sentence.trim().endsWith('.') ? '.' : ''}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>{parsed.summary}</p>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Key Points */}
                  {parsed.keyPoints && parsed.keyPoints.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Key Findings
                      </h4>
                      <ul className="space-y-1">
                        {parsed.keyPoints.map((point: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-purple-500 mt-1">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-purple-100">
                    {parsed.dataPoints !== undefined && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{parsed.dataPoints}</div>
                        <div className="text-xs text-gray-600">Data Points</div>
                      </div>
                    )}
                    {parsed.factorsAnalyzed !== undefined && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{parsed.factorsAnalyzed}</div>
                        <div className="text-xs text-gray-600">Factors Analyzed</div>
                      </div>
                    )}
                    {parsed.confidence && (
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600 capitalize">{parsed.confidence}</div>
                        <div className="text-xs text-gray-600">Confidence</div>
                      </div>
                    )}
                    {insight.createdAt && (
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-600">
                          {insight.createdAt.toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-600">Created</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
          
          {/* Pagination Controls */}
          {filteredInsights.length > pageSize && (
            <Card className="mt-6">
              <CardContent className="p-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  total={filteredInsights.length}
                  limit={pageSize}
                  onPageChange={handlePageChange}
                  loading={isLoading}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Quick Actions */}
      {aiInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/stock-analyses">
                <Button variant="outline">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View All Analyses
                </Button>
              </Link>
              <Link href="/stock-analysis/create">
                <Button variant="outline">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Create New Analysis
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
