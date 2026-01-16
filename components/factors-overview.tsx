"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { 
  BarChart3, 
  TrendingUp, 
  Loader2, 
  AlertCircle,
  Brain,
  Activity,
  Target,
  Zap,
  TrendingDown,
  DollarSign,
  Calendar,
  Newspaper,
  ArrowRight,
  Filter,
  CheckCircle2
} from "lucide-react";
import { FACTOR_DESCRIPTIONS, STOCK_FACTORS, type StockFactor } from "@/lib/stock-factors";
import { getStockAnalyses } from "@/lib/stock-api";
import type { StockAnalysis } from "@/lib/types/stock-analysis";

interface FactorStats {
  factor: StockFactor;
  totalOccurrences: number;
  totalDays: number;
  frequency: number; // percentage
  analysesCount: number;
  avgOccurrencesPerAnalysis: number;
}

interface CategoryStats {
  category: "technical" | "fundamental" | "market" | "sentiment";
  totalOccurrences: number;
  factors: FactorStats[];
}

interface FactorOccurrenceByYear {
  year: string;
  [factor: string]: string | number;
}

interface DetailedFactorData {
  date: string;
  symbol: string;
  analysisId: number;
  factors: Record<StockFactor, number>;
}

const fetcher = async () => {
  try {
    const response = await getStockAnalyses(1, 1000); // Get all analyses
    return response;
  } catch (error) {
    throw new Error('Failed to fetch stock analyses');
  }
};

export function FactorsOverview() {
  const { data, error, isLoading } = useSWR(
    "factors-overview",
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      errorRetryCount: 3,
    }
  );

  const [factorStats, setFactorStats] = useState<FactorStats[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalAnalyses: 0,
    totalDays: 0,
    totalFactorOccurrences: 0,
    avgFactorsPerDay: 0,
  });
  const [selectedSymbol, setSelectedSymbol] = useState<string>("all");
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [detailedFactorData, setDetailedFactorData] = useState<DetailedFactorData[]>([]);
  const [factorOccurrencesByYear, setFactorOccurrencesByYear] = useState<FactorOccurrenceByYear[]>([]);
  const [loadingState, setLoadingState] = useState<{
    totalAnalyses: number;
    completedAnalyses: number;
    analysesWithFactorData: number;
    errors: Array<{ analysisId: number; error: string }>;
  }>({
    totalAnalyses: 0,
    completedAnalyses: 0,
    analysesWithFactorData: 0,
    errors: [],
  });

  useEffect(() => {
    if (!data?.data) {
      console.log('[Factors Overview] No data available from getStockAnalyses');
      return;
    }

    const analyses = data.data as StockAnalysis[];
    console.log(`[Factors Overview] Fetched ${analyses.length} total analyses`);

    // Process each analysis - fetch factor data from daily-factor-data endpoint
    const processAnalyses = async () => {
      const completedAnalyses = analyses.filter(a => a.status === 'completed');
      console.log(`[Factors Overview] Found ${completedAnalyses.length} completed analyses out of ${analyses.length} total`);
      
      // Extract unique symbols
      const symbols = Array.from(new Set(completedAnalyses.map(a => a.symbol).filter(Boolean))) as string[];
      setAvailableSymbols(symbols.sort());
      console.log(`[Factors Overview] Found ${symbols.length} unique symbols:`, symbols);

      const allDetailedData: DetailedFactorData[] = [];
      const errors: Array<{ analysisId: number; error: string }> = [];
      let analysesWithFactorData = 0;
      
      for (const analysis of completedAnalyses) {
        try {
          // Fetch daily factor data using Next.js API proxy route to avoid CORS issues
          const url = `/api/stock-analyses/${analysis.id}/daily-factor-data?page=1&limit=10000`;
          console.log(`[Factors Overview] Fetching factor data for analysis ${analysis.id} (${analysis.symbol}) from ${url}`);
          
          const response = await fetch(url, {
            method: "GET",
            credentials: "include",
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error(`[Factors Overview] API error for analysis ${analysis.id}: ${response.status} ${response.statusText}`, errorText);
            errors.push({
              analysisId: analysis.id,
              error: `HTTP ${response.status}: ${response.statusText}`,
            });
            continue;
          }

          const result = await response.json();
          console.log(`[Factors Overview] Response for analysis ${analysis.id}:`, {
            hasData: !!result.data,
            dataType: typeof result.data,
            isArray: Array.isArray(result.data),
            dataKeys: result.data ? Object.keys(result.data) : [],
          });

          // Handle different response structures (similar to stock-factor-table-backend.tsx)
          let items: any[] = [];
          if (result.data) {
            // Check if data is an array directly
            if (Array.isArray(result.data)) {
              items = result.data;
              console.log(`[Factors Overview] Found ${items.length} items in result.data (array)`);
            } 
            // Check if data has items property (paginated response)
            else if (result.data.items && Array.isArray(result.data.items)) {
              items = result.data.items;
              console.log(`[Factors Overview] Found ${items.length} items in result.data.items`);
            }
            // Check if data has data property (nested structure)
            else if (result.data.data && Array.isArray(result.data.data)) {
              items = result.data.data;
              console.log(`[Factors Overview] Found ${items.length} items in result.data.data`);
            } else {
              console.warn(`[Factors Overview] Unexpected response structure for analysis ${analysis.id}:`, result);
            }
          }

          // Ensure items is defined and is an array before proceeding
          if (!items || !Array.isArray(items)) {
            console.log(`[Factors Overview] No valid factor data found for analysis ${analysis.id} (${analysis.symbol}) - items is undefined or not an array`);
            continue;
          }

          if (items.length === 0) {
            console.log(`[Factors Overview] No factor data found for analysis ${analysis.id} (${analysis.symbol})`);
            continue;
          }

          console.log(`[Factors Overview] Processing ${items.length} factor records for analysis ${analysis.id} (${analysis.symbol})`);
          analysesWithFactorData++;

          // Store detailed data for year-based analysis
          items.forEach((dayData: any) => {
            const factorRecord: Record<StockFactor, number> = {} as Record<StockFactor, number>;
            STOCK_FACTORS.forEach((factor) => {
              const factorValue = dayData[factor];
              factorRecord[factor] = factorValue === 1 || factorValue === true ? 1 : 0;
            });

            allDetailedData.push({
              date: dayData.Date || dayData.date,
              symbol: analysis.symbol,
              analysisId: analysis.id,
              factors: factorRecord,
            });
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[Factors Overview] Error fetching factor data for analysis ${analysis.id}:`, error);
          errors.push({
            analysisId: analysis.id,
            error: errorMessage,
          });
          // Continue with next analysis
        }
      }

      console.log(`[Factors Overview] Processing complete:`, {
        totalAnalyses: analyses.length,
        completedAnalyses: completedAnalyses.length,
        analysesWithFactorData,
        totalFactorRecords: allDetailedData.length,
        errors: errors.length,
      });

      setLoadingState({
        totalAnalyses: analyses.length,
        completedAnalyses: completedAnalyses.length,
        analysesWithFactorData,
        errors,
      });

      setDetailedFactorData(allDetailedData);
    };

    processAnalyses();
  }, [data]);

  // Recalculate stats and year data when symbol filter changes
  useEffect(() => {
    if (detailedFactorData.length === 0) {
      setFactorOccurrencesByYear([]);
      return;
    }

    // Filter by selected symbol
    const filteredData = selectedSymbol === "all" 
      ? detailedFactorData 
      : detailedFactorData.filter(d => d.symbol === selectedSymbol);

    // Recalculate statistics for filtered data
    const statsMap = new Map<StockFactor, {
      occurrences: number;
      days: number;
      analyses: Set<number>;
    }>();

    let totalDays = filteredData.length;
    let totalOccurrences = 0;

    filteredData.forEach((data) => {
      STOCK_FACTORS.forEach((factor) => {
        if (data.factors[factor] === 1) {
          totalOccurrences++;
          const current = statsMap.get(factor) || {
            occurrences: 0,
            days: 0,
            analyses: new Set<number>(),
          };
          current.occurrences++;
          current.analyses.add(data.analysisId);
          statsMap.set(factor, current);
        }
      });
    });

    // Recalculate factor stats
    const stats: FactorStats[] = STOCK_FACTORS.map((factor) => {
      const data = statsMap.get(factor) || {
        occurrences: 0,
        days: 0,
        analyses: new Set<number>(),
      };

      return {
        factor,
        totalOccurrences: data.occurrences,
        totalDays,
        frequency: totalDays > 0 ? (data.occurrences / totalDays) * 100 : 0,
        analysesCount: data.analyses.size,
        avgOccurrencesPerAnalysis: data.analyses.size > 0 
          ? data.occurrences / data.analyses.size 
          : 0,
      };
    });

    // Group by category
    const categoryMap = new Map<string, FactorStats[]>();
    stats.forEach((stat) => {
      const category = FACTOR_DESCRIPTIONS[stat.factor].category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(stat);
    });

    const categories: CategoryStats[] = Array.from(categoryMap.entries()).map(([category, factors]) => ({
      category: category as "technical" | "fundamental" | "market" | "sentiment",
      totalOccurrences: factors.reduce((sum, f) => sum + f.totalOccurrences, 0),
      factors,
    }));

    setFactorStats(stats.sort((a, b) => b.totalOccurrences - a.totalOccurrences));
    setCategoryStats(categories.sort((a, b) => b.totalOccurrences - a.totalOccurrences));
    setOverallStats({
      totalAnalyses: new Set(filteredData.map(d => d.analysisId)).size,
      totalDays,
      totalFactorOccurrences: totalOccurrences,
      avgFactorsPerDay: totalDays > 0 ? totalOccurrences / totalDays : 0,
    });

    // Group by year for charts
    const yearMap = new Map<string, Record<StockFactor, number>>();

    filteredData.forEach((data) => {
      // Parse date with better error handling
      let date: Date;
      try {
        // Try parsing the date string
        date = new Date(data.date);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
          console.warn(`[Factors Overview] Invalid date encountered: "${data.date}" for symbol ${data.symbol}`);
          return; // Skip this entry
        }
      } catch (error) {
        console.warn(`[Factors Overview] Error parsing date "${data.date}" for symbol ${data.symbol}:`, error);
        return; // Skip this entry
      }
      
      const year = date.getFullYear().toString();
      
      // Validate year is a valid number
      if (isNaN(parseInt(year))) {
        console.warn(`[Factors Overview] Invalid year extracted from date "${data.date}": ${year}`);
        return; // Skip this entry
      }

      if (!yearMap.has(year)) {
        const initialFactors: Record<StockFactor, number> = {} as Record<StockFactor, number>;
        STOCK_FACTORS.forEach(factor => {
          initialFactors[factor] = 0;
        });
        yearMap.set(year, initialFactors);
      }

      const yearData = yearMap.get(year)!;
      STOCK_FACTORS.forEach((factor) => {
        if (data.factors[factor] === 1) {
          yearData[factor] = (yearData[factor] || 0) + 1;
        }
      });
    });

    // Convert to array format for charts
    const yearData: FactorOccurrenceByYear[] = Array.from(yearMap.entries())
      .map(([year, factors]) => {
        const entry: FactorOccurrenceByYear = { year };
        STOCK_FACTORS.forEach((factor) => {
          entry[FACTOR_DESCRIPTIONS[factor].name] = factors[factor] || 0;
        });
        return entry;
      })
      .sort((a, b) => a.year.localeCompare(b.year));

    setFactorOccurrencesByYear(yearData);
  }, [detailedFactorData, selectedSymbol]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "technical":
        return <Activity className="h-5 w-5" />;
      case "fundamental":
        return <DollarSign className="h-5 w-5" />;
      case "market":
        return <TrendingUp className="h-5 w-5" />;
      case "sentiment":
        return <Brain className="h-5 w-5" />;
      default:
        return <BarChart3 className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "technical":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "fundamental":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "market":
        return "bg-green-100 text-green-800 border-green-200";
      case "sentiment":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
          <p className="text-muted-foreground">Loading factor statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-destructive font-medium">Failed to load factor data</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Check if we have data to display
  const hasNoData = !isLoading && data?.data && detailedFactorData.length === 0;
  const hasNoAnalyses = !isLoading && (!data?.data || (data.data as StockAnalysis[]).length === 0);
  const hasNoCompletedAnalyses = !isLoading && data?.data && loadingState.totalAnalyses > 0 && loadingState.completedAnalyses === 0;
  const hasCompletedButNoFactorData = !isLoading && loadingState.completedAnalyses > 0 && loadingState.analysesWithFactorData === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Factor Analysis Overview
        </h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive statistics and insights across all stock analyses
        </p>
      </div>

      {/* Status Check UI */}
      {!isLoading && data?.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Analysis Status
            </CardTitle>
            <CardDescription>
              Overview of stock analyses and factor data availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Total Analyses</div>
                  <div className="text-2xl font-bold">{loadingState.totalAnalyses}</div>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                  <div className="text-2xl font-bold">{loadingState.completedAnalyses}</div>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">With Factor Data</div>
                  <div className="text-2xl font-bold">{loadingState.analysesWithFactorData}</div>
                </div>
                <Brain className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            {loadingState.errors.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-yellow-800">
                      {loadingState.errors.length} error(s) occurred while fetching factor data
                    </div>
                    <details className="mt-2">
                      <summary className="text-xs text-yellow-700 cursor-pointer">Show details</summary>
                      <ul className="mt-2 space-y-1 text-xs text-yellow-700">
                        {loadingState.errors.map((err, idx) => (
                          <li key={idx}>Analysis {err.analysisId}: {err.error}</li>
                        ))}
                      </ul>
                    </details>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty States */}
      {hasNoAnalyses && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Stock Analyses Found</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              You need to create and complete stock analyses before viewing factor statistics.
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

      {hasNoCompletedAnalyses && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Completed Analyses</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              You have {loadingState.totalAnalyses} analysis/analyses, but none are completed yet.
              Complete an analysis to generate factor data.
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

      {hasCompletedButNoFactorData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Brain className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Factor Data Available</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              You have {loadingState.completedAnalyses} completed analysis/analyses, but factor data hasn't been generated yet.
              Visit each analysis and click "Generate Factor Table" to create factor data.
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

      {hasNoData && !hasNoAnalyses && !hasNoCompletedAnalyses && !hasCompletedButNoFactorData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Factor Data to Display</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Factor data exists but couldn't be processed. Check the browser console for details.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Only show main content if we have factor data */}
      {!hasNoData && !hasNoAnalyses && !hasNoCompletedAnalyses && !hasCompletedButNoFactorData && (
        <>
          {/* Filters */}
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
                    Filtered by: {selectedSymbol}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Analyses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalAnalyses}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed analyses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Trading Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalDays.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Days analyzed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Factor Occurrences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalFactorOccurrences.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total detections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Factors/Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.avgFactorsPerDay.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Average per day</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Factors</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="top">Top Performers</TabsTrigger>
          <TabsTrigger value="charts">Yearly Charts</TabsTrigger>
        </TabsList>

        {/* All Factors View */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Market Factors</CardTitle>
              <CardDescription>
                Complete breakdown of all 10 factors across all analyses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {factorStats.map((stat) => {
                  const desc = FACTOR_DESCRIPTIONS[stat.factor];
                  return (
                    <div key={stat.factor} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getCategoryColor(desc.category)}>
                              {desc.name}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {desc.category}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {desc.description}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                        <div>
                          <div className="text-2xl font-bold text-blue-600">
                            {stat.totalOccurrences}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Occurrences</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {stat.frequency.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Frequency</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-600">
                            {stat.analysesCount}
                          </div>
                          <div className="text-xs text-muted-foreground">Analyses</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-orange-600">
                            {stat.avgOccurrencesPerAnalysis.toFixed(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">Avg per Analysis</div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span>Frequency</span>
                          <span>{stat.frequency.toFixed(1)}%</span>
                        </div>
                        <Progress value={stat.frequency} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Category View */}
        <TabsContent value="categories" className="space-y-4">
          {categoryStats.map((category) => (
            <Card key={category.category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getCategoryIcon(category.category)}
                  {category.category.charAt(0).toUpperCase() + category.category.slice(1)} Factors
                </CardTitle>
                <CardDescription>
                  {category.factors.length} factors, {category.totalOccurrences} total occurrences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {category.factors
                    .sort((a, b) => b.totalOccurrences - a.totalOccurrences)
                    .map((stat) => {
                      const desc = FACTOR_DESCRIPTIONS[stat.factor];
                      return (
                        <div key={stat.factor} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="font-semibold">{desc.name}</div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {desc.description}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-lg font-bold">
                              {stat.totalOccurrences}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Frequency</div>
                              <div className="font-semibold">{stat.frequency.toFixed(1)}%</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Analyses</div>
                              <div className="font-semibold">{stat.analysesCount}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Avg per Analysis</div>
                              <div className="font-semibold">{stat.avgOccurrencesPerAnalysis.toFixed(1)}</div>
                            </div>
                          </div>
                          <Progress value={stat.frequency} className="mt-3 h-2" />
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Top Performers View */}
        <TabsContent value="top" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Most Frequent Factors
                </CardTitle>
                <CardDescription>Top factors by occurrence frequency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {factorStats
                    .sort((a, b) => b.frequency - a.frequency)
                    .slice(0, 5)
                    .map((stat, index) => {
                      const desc = FACTOR_DESCRIPTIONS[stat.factor];
                      return (
                        <div key={stat.factor} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold">{desc.name}</div>
                              <div className="text-xs text-muted-foreground">{desc.category}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">{stat.frequency.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">{stat.totalOccurrences} occurrences</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Most Common Factors
                </CardTitle>
                <CardDescription>Top factors by total occurrences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {factorStats
                    .sort((a, b) => b.totalOccurrences - a.totalOccurrences)
                    .slice(0, 5)
                    .map((stat, index) => {
                      const desc = FACTOR_DESCRIPTIONS[stat.factor];
                      return (
                        <div key={stat.factor} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold">{desc.name}</div>
                              <div className="text-xs text-muted-foreground">{desc.category}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">{stat.totalOccurrences}</div>
                            <div className="text-xs text-muted-foreground">{stat.frequency.toFixed(1)}% frequency</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Factor Effectiveness</CardTitle>
              <CardDescription>
                Factors appearing in the most analyses (broader market coverage)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {factorStats
                  .sort((a, b) => b.analysesCount - a.analysesCount)
                  .slice(0, 5)
                  .map((stat, index) => {
                    const desc = FACTOR_DESCRIPTIONS[stat.factor];
                    return (
                      <div key={stat.factor} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-semibold">{desc.name}</div>
                            <div className="text-xs text-muted-foreground">{desc.description}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{stat.analysesCount} analyses</div>
                          <div className="text-xs text-muted-foreground">
                            {stat.avgOccurrencesPerAnalysis.toFixed(1)} avg per analysis
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Yearly Charts View */}
        <TabsContent value="charts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Factor Occurrences by Year
              </CardTitle>
              <CardDescription>
                {selectedSymbol === "all" 
                  ? "All factors across all symbols" 
                  : `Factors for ${selectedSymbol}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {factorOccurrencesByYear.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No data available for the selected filter
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Overall Factor Occurrences by Year */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">All Factors Combined</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={factorOccurrencesByYear}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {STOCK_FACTORS.map((factor, index) => {
                          const desc = FACTOR_DESCRIPTIONS[factor];
                          const colors = [
                            "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00",
                            "#0088fe", "#00c49f", "#ffbb28", "#ff8042", "#8884d8"
                          ];
                          return (
                            <Bar
                              key={factor}
                              dataKey={desc.name}
                              stackId="a"
                              fill={colors[index % colors.length]}
                            />
                          );
                        })}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top 5 Factors by Year */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Top 5 Most Frequent Factors</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <ComposedChart data={factorOccurrencesByYear}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {factorStats
                          .sort((a, b) => b.totalOccurrences - a.totalOccurrences)
                          .slice(0, 5)
                          .map((stat, index) => {
                            const desc = FACTOR_DESCRIPTIONS[stat.factor];
                            const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00"];
                            return (
                              <Bar
                                key={stat.factor}
                                dataKey={desc.name}
                                fill={colors[index % colors.length]}
                              />
                            );
                          })}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Factor Trends Over Time (Line Chart) */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Factor Trends Over Time</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={factorOccurrencesByYear}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {factorStats
                          .sort((a, b) => b.totalOccurrences - a.totalOccurrences)
                          .slice(0, 5)
                          .map((stat, index) => {
                            const desc = FACTOR_DESCRIPTIONS[stat.factor];
                            const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00"];
                            return (
                              <Line
                                key={stat.factor}
                                type="monotone"
                                dataKey={desc.name}
                                stroke={colors[index % colors.length]}
                                strokeWidth={2}
                              />
                            );
                          })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category Breakdown by Year */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">By Category</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categoryStats.map((category) => (
                        <div key={category.category}>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            {getCategoryIcon(category.category)}
                            {category.category.charAt(0).toUpperCase() + category.category.slice(1)}
                          </h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={factorOccurrencesByYear}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="year" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              {category.factors.map((stat, index) => {
                                const desc = FACTOR_DESCRIPTIONS[stat.factor];
                                const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300"];
                                return (
                                  <Bar
                                    key={stat.factor}
                                    dataKey={desc.name}
                                    fill={colors[index % colors.length]}
                                  />
                                );
                              })}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </>
      )}

      {/* Quick Actions */}
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
    </div>
  );
}

