"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, Calendar, DollarSign, BarChart3, Table, Brain, LineChart, Calculator, Loader2, Activity, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { StockAnalysis, StockAnalysisResult } from "@/lib/types/stock-analysis";
import { FACTOR_DESCRIPTIONS } from "@/lib/stock-factors";
import { formatPrice } from "@/lib/currency-utils";
import { StockFactorTableBackend } from "@/components/stock-factor-table-backend";
import { StockChart } from "@/components/stock-chart";
import { DailyScoringTab } from "@/components/daily-scoring-tab";
import { EarningsTab } from "@/components/earnings-tab";
import { DataQualityDashboard } from "@/components/data-quality-dashboard";
import { CurrentStockPrice } from "@/components/current-stock-price";
import { useRealTimeStatus } from "@/lib/hooks/use-real-time-status";

interface StockAnalysisDetailProps {
  analysis: StockAnalysis;
}

export function StockAnalysisDetail({ analysis }: StockAnalysisDetailProps) {
  const results: StockAnalysisResult | null = analysis.analysisResults
    ? JSON.parse(analysis.analysisResults)
    : null;

  // Real-time status updates
  const { 
    status: realTimeStatus, 
    lastUpdated, 
    progress, 
    message, 
    isPolling 
  } = useRealTimeStatus({ 
    analysisId: analysis.id, 
    pollingInterval: 3000, 
    enabled: true 
  });

  // Use real-time status if available, otherwise fall back to static status
  const currentStatus = realTimeStatus || analysis.status;

  // State for factor generation
  const [isGeneratingFactors, setIsGeneratingFactors] = useState(false);

  // Handle factor generation
  const handleRetryFactorGeneration = async () => {
    setIsGeneratingFactors(true);
    
    try {
      const response = await fetch(`/api/stock-analyses/${analysis.id}/regenerate-factors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error('API Error Response:', errorData);
        throw new Error(errorData.error || `Failed to regenerate factors (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('Factor regeneration initiated successfully');
        // Navigate to factors tab to show the results
        const factorsTab = document.querySelector('[value="factors"]') as HTMLElement;
        factorsTab?.click();
      } else {
        throw new Error('Failed to regenerate factors');
      }
    } catch (err) {
      console.error('Error regenerating factors:', err);
      // You could show a toast notification here if you have one
    } finally {
      setIsGeneratingFactors(false);
    }
  };

  // State for AI analysis
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  
  // State for earnings data availability
  const [earningsDataAvailable, setEarningsDataAvailable] = useState(false);
  const [earningsLastUpdated, setEarningsLastUpdated] = useState<Date | undefined>(undefined);

  // Check earnings data availability
  useEffect(() => {
    const checkEarningsData = async () => {
      try {
        const response = await fetch(`/api/earnings/${analysis.symbol}`);
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
          setEarningsDataAvailable(true);
          // Get the most recent earnings date
          const latestEarning = data.data[0];
          setEarningsLastUpdated(new Date(latestEarning.updatedAt));
        } else {
          setEarningsDataAvailable(false);
          setEarningsLastUpdated(undefined);
        }
      } catch (error) {
        console.error('Error checking earnings data:', error);
        setEarningsDataAvailable(false);
        setEarningsLastUpdated(undefined);
      }
    };

    checkEarningsData();
  }, [analysis.symbol]);

  // Handle AI analysis
  const handleRetryAIAnalysis = async () => {
    setIsAnalyzingAI(true);
    
    try {
      const response = await fetch(`/api/stock-analyses/${analysis.id}/ai-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error('API Error Response:', errorData);
        throw new Error(errorData.error || `Failed to start AI analysis (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('AI analysis initiated successfully');
        // The real-time status hook will update the UI automatically
      } else {
        throw new Error('Failed to start AI analysis');
      }
    } catch (err) {
      console.error('Error starting AI analysis:', err);
      // You could show a toast notification here if you have one
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "analyzing":
        return "bg-blue-500";
      case "processing":
        return "bg-blue-500 animate-pulse";
      case "ai_processing":
        return "bg-purple-500 animate-pulse";
      case "ai_completed":
        return "bg-emerald-500";
      case "factor_failed":
        return "bg-orange-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "processing":
      case "ai_processing":
        return <Loader2 className="h-3 w-3 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string | null) => {
    switch (status) {
      case "completed":
        return "completed";
      case "analyzing":
        return "analyzing";
      case "processing":
        return "processing";
      case "ai_processing":
        return "AI processing";
      case "ai_completed":
        return "AI completed";
      case "factor_failed":
        return "factor failed";
      case "failed":
        return "failed";
      default:
        return "draft";
    }
  };

  const getFactorColor = (category: string) => {
    switch (category) {
      case "technical":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "market":
        return "bg-green-100 text-green-800 border-green-200";
      case "fundamental":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "sentiment":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };


  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/stock-analyses">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-4xl">{analysis.symbol}</CardTitle>
                <Badge className={getStatusColor(currentStatus)}>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(currentStatus)}
                    {getStatusText(currentStatus)}
                    {isPolling && <Loader2 className="h-3 w-3 animate-spin" />}
                  </div>
                </Badge>
                {message && (
                  <div className="text-sm text-muted-foreground">
                    {message}
                  </div>
                )}
              </div>
              {analysis.name && (
                <CardDescription className="text-lg mt-2">
                  {analysis.name}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5 mb-6">
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Total Days Analyzed</span>
              <span className="text-2xl font-bold">{results?.totalDays || 0}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Transactions Found</span>
              <span className="text-2xl font-bold text-green-600">
                {results?.transactionsFound || 0}
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Min % Change</span>
              <span className="text-2xl font-bold">≥ {results?.minPctChange || 4}%</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Avg Factors/Day</span>
              <span className="text-2xl font-bold text-blue-600">
                {results?.factorAnalysis?.summary.averageFactorsPerDay?.toFixed(2) || "0.00"}
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-lg font-medium">
                {new Date(analysis.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Status Card - Prominent Position */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Brain className="h-5 w-5" />
            AI Analysis
          </CardTitle>
          <CardDescription className="text-purple-600">
            Get AI-powered insights and investment recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status and Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentStatus === 'ai_completed' ? (
                  <>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div>
                      <div className="font-medium text-green-700">AI Analysis Completed</div>
                      <div className="text-sm text-green-600">Insights available</div>
                    </div>
                  </>
                ) : currentStatus === 'ai_processing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    <div>
                      <div className="font-medium text-purple-700">AI Analysis in Progress</div>
                      <div className="text-sm text-purple-600">Generating insights...</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <div>
                      <div className="font-medium text-gray-700">AI Analysis Not Started</div>
                      <div className="text-sm text-gray-600">Click to generate insights</div>
                    </div>
                  </>
                )}
              </div>
              
              {currentStatus !== 'ai_completed' && currentStatus !== 'ai_processing' && (
                <Button 
                  onClick={handleRetryAIAnalysis}
                  disabled={isAnalyzingAI || !results}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isAnalyzingAI ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Start AI Analysis
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {/* AI Insights Preview */}
            {analysis.aiInsights && currentStatus === 'ai_completed' && (
              <div className="mt-4 p-4 bg-white border border-purple-200 rounded-md">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    {(() => {
                      try {
                        const insights = typeof analysis.aiInsights === 'string' 
                          ? JSON.parse(analysis.aiInsights) 
                          : analysis.aiInsights;
                        
                        return (
                          <div className="space-y-4">
                            {/* Summary */}
                            <div>
                              <h4 className="font-semibold text-purple-800 mb-2">Analysis Summary</h4>
                              <div className="text-sm text-gray-700">
                                {(() => {
                                  // Split the summary into sentences and convert to bullet points
                                  const sentences = insights.summary.split('. ').filter((s: string) => s.trim());
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
                                    <p>{insights.summary}</p>
                                  );
                                })()}
                              </div>
                            </div>
                            
                            {/* Key Points */}
                            {insights.keyPoints && insights.keyPoints.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-purple-800 mb-2">Key Findings</h4>
                                <ul className="space-y-1">
                                  {insights.keyPoints.map((point: string, index: number) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <span className="text-purple-500 mt-1">•</span>
                                      <span className="text-sm text-gray-700">{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Metadata */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-purple-100">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">{insights.dataPoints || 0}</div>
                                <div className="text-sm text-gray-600">Data Points</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{insights.factorsAnalyzed || 0}</div>
                                <div className="text-sm text-gray-600">Factors Analyzed</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-blue-600 capitalize">{insights.confidence || 'medium'}</div>
                                <div className="text-sm text-gray-600">Confidence</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-gray-600">
                                  {insights.generatedAt ? new Date(insights.generatedAt).toLocaleDateString() : 'N/A'}
                                </div>
                                <div className="text-sm text-gray-600">Generated</div>
                              </div>
                            </div>
                          </div>
                        );
                      } catch (error) {
                        // Fallback for string data (backward compatibility)
                        return (
                          <div className="text-sm text-gray-700">
                            <p>{analysis.aiInsights}</p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                  
                  {/* Regenerate Button */}
                  <div className="ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleRetryAIAnalysis}
                      disabled={isAnalyzingAI || !results}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      {isAnalyzingAI ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-3 w-3" />
                          Regenerate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {!results && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm text-yellow-800">
                  Complete the stock analysis first to enable AI insights
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Stock Price */}
      {analysis.symbol && <CurrentStockPrice symbol={analysis.symbol} />}

      {/* Factor Analysis Summary */}
      {results?.factorAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Factor Analysis Summary
            </CardTitle>
            <CardDescription>
              Market factors detected during the analysis period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Factor Frequency */}
              <div>
                <h4 className="font-semibold mb-3">Factor Frequency</h4>
                <div className="space-y-2">
                  {results?.factorAnalysis?.summary?.factorCounts
                    ? Object.entries(results.factorAnalysis.summary.factorCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([factor, count]) => {
                        const description = FACTOR_DESCRIPTIONS[factor as keyof typeof FACTOR_DESCRIPTIONS];
                        return (
                          <div key={factor} className="flex justify-between items-center">
                            <Badge 
                              variant="outline" 
                              className={getFactorColor(description.category)}
                            >
                              {description.name}
                            </Badge>
                            <span className="text-sm font-medium">{count} days</span>
                          </div>
                        );
                      })
                    : null}
                </div>
              </div>

              {/* Top Performing Factors */}
              <div>
                <h4 className="font-semibold mb-3">Top Performing Factors</h4>
                <div className="space-y-2">
                  {results?.factorAnalysis?.correlation &&
                    Object.entries(results.factorAnalysis.correlation)
                      .sort((a, b) => b[1].avgReturn - a[1].avgReturn)
                      .slice(0, 5)
                      .map(([factor, data]) => {
                        const description = FACTOR_DESCRIPTIONS[factor as keyof typeof FACTOR_DESCRIPTIONS];
                        return (
                          <div key={factor} className="flex justify-between items-center">
                            <Badge 
                              variant="outline" 
                              className={getFactorColor(description.category)}
                            >
                              {description.name}
                            </Badge>
                            <span className="text-sm font-medium text-green-600">
                              +{data.avgReturn.toFixed(2)}%
                            </span>
                          </div>
                        );
                      })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data and Factor Analysis Tabs */}
      {results && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              Data
            </TabsTrigger>
            <TabsTrigger value="chart" className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Chart
            </TabsTrigger>
            <TabsTrigger value="factors" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Factor Analysis
            </TabsTrigger>
            <TabsTrigger value="scoring" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Daily Scoring
            </TabsTrigger>
            <TabsTrigger value="earnings" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Earnings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <DataQualityDashboard 
              analysisId={analysis.id}
              symbol={analysis.symbol}
              status={currentStatus}
              onRetryFactorGeneration={handleRetryFactorGeneration}
              onRetryAIAnalysis={handleRetryAIAnalysis}
              isGeneratingFactors={isGeneratingFactors || currentStatus === 'processing'}
              isAnalyzingAI={isAnalyzingAI || currentStatus === 'ai_processing'}
              metrics={{
                technicalIndicators: {
                  calculated: true, // This would be determined by checking if technical indicators exist
                  completeness: 85, // This would be calculated based on available data
                  availableIndicators: ['MA20', 'MA50', 'MA200', 'RSI', 'Volume']
                },
                factorData: {
                  exists: results?.factorAnalysis ? true : false,
                  completeness: results?.factorAnalysis ? 75 : 0,
                  totalFactors: results?.transactions?.length || 0,
                  aiFactorsAvailable: true
                },
                dailyScoring: {
                  available: true, // This would be checked from the database
                  completeness: 60, // This would be calculated
                  scoredDays: 15, // This would be fetched from database
                  totalDays: results?.totalDays || 0
                },
                aiAnalysis: {
                  completed: currentStatus === 'ai_completed',
                  inProgress: currentStatus === 'ai_processing',
                  insightsAvailable: !!analysis.aiInsights
                },
                earnings: {
                  dataAvailable: earningsDataAvailable,
                  lastUpdated: earningsLastUpdated
                }
              }}
            />
            
            {/* Real-time Status Indicator */}
            {isPolling && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <div className="text-sm">
                      <div className="font-medium text-blue-800">Live Updates Active</div>
                      <div className="text-blue-600">Last updated: {lastUpdated.toLocaleTimeString()}</div>
                      {progress > 0 && (
                        <div className="mt-1">
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            {results?.transactions && results.transactions.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Significant Price Increases
                  </CardTitle>
                  <CardDescription>
                    Days where closing price increased by {results?.minPctChange || 4}% or more
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold">#</th>
                          <th className="text-left p-3 font-semibold">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Date
                            </div>
                          </th>
                          <th className="text-right p-3 font-semibold">
                            <div className="flex items-center justify-end gap-2">
                              <DollarSign className="h-4 w-4" />
                              Close Price
                            </div>
                          </th>
                          <th className="text-right p-3 font-semibold">% Change</th>
                          <th className="text-left p-3 font-semibold">Factors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.transactions.map((transaction, index) => (
                          <tr
                            key={transaction.tx}
                            className={index % 2 === 0 ? "bg-muted/50" : ""}
                          >
                            <td className="p-3">{transaction.tx}</td>
                            <td className="p-3">
                              {new Date(transaction.date).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-right font-medium">
                              {formatPrice(transaction.close, analysis.symbol)}
                            </td>
                            <td className="p-3 text-right">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                +{transaction.pctChange}%
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {transaction.factors && transaction.factors.length > 0 ? (
                                  <>
                                    {transaction.factors.slice(0, 3).map((factor) => {
                                      const description = FACTOR_DESCRIPTIONS[factor];
                                      return (
                                        <Badge
                                          key={factor}
                                          variant="outline"
                                          className={`text-xs ${getFactorColor(description.category)}`}
                                          title={description.description}
                                        >
                                          {description.name}
                                        </Badge>
                                      );
                                    })}
                                    {transaction.factors.length > 3 && (
                                      <Badge variant="outline" className="text-xs bg-gray-100">
                                        +{transaction.factors.length - 3}
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground">None</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No days found with price increases of {results?.minPctChange || 4}% or more
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="chart" className="space-y-4">
            <StockChart results={results} symbol={analysis.symbol} />
          </TabsContent>

          <TabsContent value="factors" className="space-y-4">
            <StockFactorTableBackend 
              analysisId={analysis.id}
              symbol={analysis.symbol}
              minPctChange={analysis.minPctChange || 4.0}
            />
          </TabsContent>

          <TabsContent value="scoring" className="space-y-4">
            <DailyScoringTab 
              stockAnalysisId={analysis.id.toString()}
              csvFilePath={analysis.csvFilePath || undefined}
              symbol={analysis.symbol}
            />
          </TabsContent>
          
          <TabsContent value="earnings" className="space-y-4">
            <EarningsTab symbol={analysis.symbol} />
          </TabsContent>
        </Tabs>
      )}

      </div>
  );
}
