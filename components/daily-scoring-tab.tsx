"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DailyScoreCard, DailyScoreList } from "@/components/daily-score-card";
import { DailyPredictionCard, DailyPredictionSummary } from "@/components/daily-prediction";
import { 
  TrendingUp, 
  Calculator, 
  Target, 
  BarChart3, 
  Settings,
  RefreshCw,
  Download,
  Trash2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import type { DailyScoreResult, StockFactor } from "@/lib/stock-factors";
import { DEFAULT_DAILY_SCORE_CONFIG } from "@/lib/stock-factors";

interface DailyScoringTabProps {
  stockAnalysisId: string;
  csvFilePath?: string;
  symbol?: string;
}

interface DailyScoringData {
  analysis: {
    totalDays: number;
    highScoreDays: number;
    highScorePercentage: number;
    averageScore: number;
    maxScore: number;
    minScore: number;
  };
  dailyScores: DailyScoreResult[];
  predictions: Array<{
    symbol: string;
    date: string;
    score: number;
    prediction: 'HIGH_PROBABILITY' | 'MODERATE' | 'LOW_PROBABILITY';
    confidence: number;
    activeFactors: Array<{
      factor: StockFactor;
      name: string;
      description: string;
      weight: number;
    }>;
    recommendations: string[];
    threshold: number;
    interpretation: string;
  }>;
  scoreConfig: {
    weights: Partial<Record<StockFactor, number>>;
    threshold: number;
    minFactorsRequired?: number;
  };
  factorFrequency: Partial<Record<StockFactor, number>>;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  fromCache?: boolean;
  message?: string;
  lastUpdated?: string; // Add last updated timestamp
}

export function DailyScoringTab({ stockAnalysisId, csvFilePath, symbol = "STOCK" }: DailyScoringTabProps) {
  const [data, setData] = useState<DailyScoringData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20); // Records per page

  const [predictionSortBy, setPredictionSortBy] = useState<'date' | 'score' | 'confidence' | 'prediction'>('date');
  const [predictionSortOrder, setPredictionSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [threshold, setThreshold] = useState<number>(DEFAULT_DAILY_SCORE_CONFIG.threshold);
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState(false);

  const fetchPredictions = async (sortBy?: string, sortOrder?: string) => {
    try {
      const sortByParam = sortBy || predictionSortBy;
      const sortOrderParam = sortOrder || predictionSortOrder;
      
      // Use Next.js API proxy route to avoid CORS issues
      const response = await fetch(`/api/stock-analyses/${stockAnalysisId}/predictions?orderBy=${sortByParam}&order=${sortOrderParam}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn('Failed to fetch predictions:', response.status);
        return [];
      }

      const result = await response.json();
      return result.data?.predictions || [];
    } catch (err) {
      console.warn('Error fetching predictions:', err);
      return [];
    }
  };

  const updatePredictions = async (newSortBy?: 'date' | 'score' | 'confidence' | 'prediction', newSortOrder?: 'asc' | 'desc') => {
    setIsLoadingPredictions(true);
    try {
      const sortedPredictions = await fetchPredictions(newSortBy, newSortOrder);
      if (data) {
        setData({
          ...data,
          predictions: sortedPredictions
        });
      }
    } catch (err) {
      console.error('Error updating predictions:', err);
      setError('Failed to update predictions');
    } finally {
      setIsLoadingPredictions(false);
    }
  };

  const fetchDailyScoring = async (page: number = currentPage) => {
    setLoading(true);
    setError(null);

    try {
      // Use Next.js API proxy route to avoid CORS issues
      // Include threshold in query params if it differs from default
      const thresholdParam = threshold !== DEFAULT_DAILY_SCORE_CONFIG.threshold ? `&threshold=${threshold}` : '';
      const response = await fetch(`/api/stock-analyses/${stockAnalysisId}/daily-scores?page=${page}&limit=${pageSize}&orderBy=date&order=desc${thresholdParam}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error?.message || errorData.error || 'Failed to fetch daily scoring data');
      }

      const result = await response.json();
      
      // Backend returns { data: { items: [...], pagination: {...} } }
      if (result.data && result.data.items) {
        const scores = result.data.items;
        const pagination = result.data.pagination;
        
        // Transform backend format to frontend expected format
        // Calculate summary statistics from current page data
        // Note: For accurate overall statistics, we'd need to fetch all data or have a separate summary endpoint
        const totalDays = pagination?.total || scores.length;
        const highProbabilityDays = scores.filter((s: any) => s.prediction === 'HIGH_PROBABILITY' || s.aboveThreshold).length;
        const moderateDays = scores.filter((s: any) => s.prediction === 'MODERATE').length;
        const lowDays = scores.filter((s: any) => s.prediction === 'LOW_PROBABILITY').length;
        
        // Calculate score statistics from current page
        const scoreValues = scores.map((s: any) => s.score || 0).filter((score: number) => !isNaN(score));
        const averageScore = scoreValues.length > 0 
          ? scoreValues.reduce((sum: number, score: number) => sum + score, 0) / scoreValues.length 
          : 0;
        const maxScore = scoreValues.length > 0 ? Math.max(...scoreValues) : 0;
        const minScore = scoreValues.length > 0 ? Math.min(...scoreValues) : 0;
        // Calculate highScorePercentage from current page (for overall stats, would need all data)
        const highScorePercentage = scores.length > 0 ? (highProbabilityDays / scores.length) * 100 : 0;
        
        // Calculate factor frequency in high-score days (days that exceed threshold)
        const factorFrequency: Record<string, number> = {};
        const highScoreDaysList = scores.filter((s: any) => s.aboveThreshold || s.prediction === 'HIGH_PROBABILITY');
        const totalHighScoreDays = highScoreDaysList.length;
        
        // Count how often each factor appears in high-score days
        highScoreDaysList.forEach((score: any) => {
          // Check breakdown (from DailyScoreResult calculation)
          // Format: { [factor]: { weight: number, active: boolean, contribution: number } }
          const breakdown = score.breakdown || {};
          Object.keys(breakdown).forEach((factor) => {
            const factorData = breakdown[factor];
            // Handle breakdown format: {active: boolean, weight: number, contribution: number}
            if (typeof factorData === 'object' && factorData !== null) {
              if (factorData.active === true) {
                factorFrequency[factor] = (factorFrequency[factor] || 0) + 1;
              }
            }
          });
        });
        
        // Convert counts to percentages (how often factor appears in high-score days)
        const factorFrequencyPercentages: Record<string, number> = {};
        Object.keys(factorFrequency).forEach((factor) => {
          if (totalHighScoreDays > 0) {
            factorFrequencyPercentages[factor] = (factorFrequency[factor] / totalHighScoreDays) * 100;
          } else {
            factorFrequencyPercentages[factor] = 0;
          }
        });
        
        // Fetch predictions in parallel with current sort settings
        const predictions = await fetchPredictions();
        
        const transformedData = {
          analysis: {
            totalDays,
            highScoreDays: highProbabilityDays,
            highScorePercentage,
            averageScore,
            maxScore,
            minScore,
          },
          dailyScores: scores,
          predictions: predictions, // Fetch predictions from API
          scoreConfig: {
            threshold: threshold, // Use current threshold state
            weights: DEFAULT_DAILY_SCORE_CONFIG.weights,
            minFactorsRequired: DEFAULT_DAILY_SCORE_CONFIG.minFactorsRequired,
          },
          factorFrequency: factorFrequencyPercentages,
          pagination: pagination ? {
            total: pagination.total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: pagination.totalPages,
          } : undefined,
        };
        
        setData(transformedData);
        setCurrentPage(page);
        // Update threshold state when data is loaded
        if (transformedData.scoreConfig.threshold) {
          setThreshold(transformedData.scoreConfig.threshold);
        }
        console.log(`✅ Loaded ${scores.length} daily scores from backend (page ${page}/${pagination?.totalPages || 1})`);
        if (predictions.length > 0) {
          console.log(`✅ Loaded ${predictions.length} predictions`);
        }
      } else {
        // Still try to fetch predictions even if no scores
        const predictions = await fetchPredictions();
        setData({
          analysis: {
            totalDays: 0,
            highScoreDays: 0,
            highScorePercentage: 0,
            averageScore: 0,
            maxScore: 0,
            minScore: 0,
          },
          dailyScores: [],
          predictions: predictions,
          scoreConfig: {
            threshold: threshold, // Use current threshold state
            weights: DEFAULT_DAILY_SCORE_CONFIG.weights,
            minFactorsRequired: DEFAULT_DAILY_SCORE_CONFIG.minFactorsRequired,
          },
          factorFrequency: {},
        });
        console.log('ℹ️ No daily scoring data available');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error occurred');
    } finally {
      setLoading(false);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchDailyScoring(1);
  }, [stockAnalysisId]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && (!data?.pagination || newPage <= data.pagination.totalPages)) {
      fetchDailyScoring(newPage);
    }
  };

  const handleExportData = () => {
    if (!data) return;

    const exportData = {
      symbol,
      analysis: data.analysis,
      dailyScores: data.dailyScores,
      scoreConfig: data.scoreConfig,
      factorFrequency: data.factorFrequency,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${symbol}-daily-scoring-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpdateThreshold = async () => {
    if (threshold < 0 || threshold > 1) {
      setError('Threshold must be between 0 and 1 (0% to 100%)');
      return;
    }

    setIsUpdatingThreshold(true);
    setError(null);

    try {
      // Reload scores with new threshold (threshold is passed as query param)
      await fetchDailyScoring(currentPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update threshold');
    } finally {
      setIsUpdatingThreshold(false);
    }
  };

  const handleRegenerateDailyScoring = async () => {
    setIsRegenerating(true);
    setError(null);

    try {
      // Use Next.js API proxy route to avoid CORS issues
      const response = await fetch(`/api/stock-analyses/${stockAnalysisId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        
        if (response.status === 429) {
          setError(errorData.message || 'Rate limit exceeded. Please wait before regenerating again.');
        } else {
          setError(errorData.error?.message || errorData.error || 'Failed to regenerate daily scoring data');
        }
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        // After regenerating, fetch the updated data with a delay
        setTimeout(() => {
          fetchDailyScoring();
        }, 2000);
        setShowRegenerateConfirm(false);
        console.log('✅ Daily scoring data regeneration initiated');
      } else {
        setError(result.error || 'Failed to regenerate daily scoring data');
      }
    } catch (err) {
      setError('Network error occurred during regeneration');
    } finally {
      setIsRegenerating(false);
    }
  };

  const formatLastUpdated = (lastUpdated?: string) => {
    if (!lastUpdated) return null;
    
    const date = new Date(lastUpdated);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>
              {isRegenerating ? 'Regenerating daily scoring data...' : 
               isGenerating ? 'Generating daily scoring data...' : 
               'Analyzing daily scoring patterns...'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchDailyScoring(currentPage)} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p>No daily scoring data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Daily Scoring Analysis
          </h3>
          <p className="text-sm text-muted-foreground">
            Predict strong price movements using weighted factor analysis
          </p>
          <div className="flex items-center gap-4 mt-1">
            {data?.fromCache && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600">Loaded from database cache</span>
              </div>
            )}
            {data?.dailyScores && data.dailyScores.length > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatLastUpdated(data.dailyScores[0]?.date)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowRegenerateConfirm(true)} 
            variant="outline" 
            size="sm"
            disabled={isRegenerating || data?.analysis.totalDays === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Regenerate
          </Button>
          <Button onClick={() => fetchDailyScoring(currentPage)} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Regeneration Confirmation Dialog */}
      {showRegenerateConfirm && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-orange-900">Confirm Regeneration</h4>
                <p className="text-sm text-orange-700 mt-1">
                  This will delete all existing daily scoring data and regenerate it from the current factor data. 
                  This action cannot be undone and may take a few moments to complete.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Button 
                    onClick={handleRegenerateDailyScoring} 
                    size="sm" 
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Regenerate Now
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => setShowRegenerateConfirm(false)} 
                    variant="outline" 
                    size="sm"
                    disabled={isRegenerating}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.analysis.highScoreDays}
            </div>
            <div className="text-xs text-muted-foreground">High Score Days</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {data.analysis.highScorePercentage.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Success Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {data.analysis.averageScore.toFixed(3)}
            </div>
            <div className="text-xs text-muted-foreground">Average Score</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {(data.scoreConfig.threshold * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Threshold</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="scores" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Daily Scores
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Predictions
          </TabsTrigger>
          <TabsTrigger value="factors" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Factor Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scoring Summary</CardTitle>
              <CardDescription>
                Overall performance of the daily scoring system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Performance Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Days Analyzed:</span>
                      <span className="font-medium">{data.analysis.totalDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>High Score Days:</span>
                      <span className="font-medium text-green-600">{data.analysis.highScoreDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate:</span>
                      <span className="font-medium">{data.analysis.highScorePercentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Score:</span>
                      <span className="font-medium">{data.analysis.averageScore.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Score Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Maximum Score:</span>
                      <span className="font-medium text-green-600">{data.analysis.maxScore.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Minimum Score:</span>
                      <span className="font-medium text-red-600">{data.analysis.minScore.toFixed(3)}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span>Threshold:</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={(threshold * 100).toFixed(1)}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value) && value >= 0 && value <= 100) {
                                setThreshold(value / 100);
                              }
                            }}
                            className="w-20 h-8 text-sm"
                            disabled={isUpdatingThreshold}
                          />
                          <span className="text-sm">%</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleUpdateThreshold}
                            disabled={isUpdatingThreshold || threshold === data.scoreConfig.threshold}
                            className="h-8"
                          >
                            {isUpdatingThreshold ? (
                              <>
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              'Update'
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Current: {(data.scoreConfig.threshold * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span>Min Factors Required:</span>
                      <span className="font-medium">{data.scoreConfig.minFactorsRequired || 1}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scores" className="space-y-4">
          <DailyScoreList 
            scores={data.dailyScores} 
            showDetails={true}
            compact={false}
          />
          
          {/* Pagination Controls */}
          {data.pagination && data.pagination.totalPages > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
                    {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
                    {data.pagination.total} records
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(data.pagination!.page - 1)}
                      disabled={data.pagination.page === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (data.pagination!.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (data.pagination!.page <= 3) {
                          pageNum = i + 1;
                        } else if (data.pagination!.page >= data.pagination!.totalPages - 2) {
                          pageNum = data.pagination!.totalPages - 4 + i;
                        } else {
                          pageNum = data.pagination!.page - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={data.pagination!.page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            disabled={loading}
                            className="min-w-[40px]"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(data.pagination!.page + 1)}
                      disabled={data.pagination.page === data.pagination.totalPages || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          {data.predictions.length > 0 ? (
            <>
              {/* Sorting Controls */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="prediction-sort-by">Sort by:</Label>
                      <Select
                        value={predictionSortBy}
                        onValueChange={(value: 'date' | 'score' | 'confidence' | 'prediction') => {
                          setPredictionSortBy(value);
                          // Refetch predictions with new sort
                          updatePredictions(value, predictionSortOrder);
                        }}
                        disabled={isLoadingPredictions}
                      >
                        <SelectTrigger id="prediction-sort-by" className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="score">Score</SelectItem>
                          <SelectItem value="confidence">Confidence</SelectItem>
                          <SelectItem value="prediction">Prediction Level</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="prediction-sort-order">Order:</Label>
                      <Select
                        value={predictionSortOrder}
                        onValueChange={(value: 'asc' | 'desc') => {
                          setPredictionSortOrder(value);
                          // Refetch predictions with new sort
                          updatePredictions(predictionSortBy, value);
                        }}
                        disabled={isLoadingPredictions}
                      >
                        <SelectTrigger id="prediction-sort-order" className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">Descending</SelectItem>
                          <SelectItem value="asc">Ascending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updatePredictions()}
                      disabled={isLoadingPredictions}
                    >
                      {isLoadingPredictions ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Predictions List */}
              {isLoadingPredictions ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Loading predictions...</span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {data.predictions.map((prediction, index) => (
                    <DailyPredictionCard key={`${prediction.date}-${index}`} {...prediction} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p>No predictions available for the current period</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="factors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Factor Weights</CardTitle>
              <CardDescription>
                Current weighting configuration for the scoring system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(data.scoreConfig.weights)
                  .filter(([_, weight]) => weight !== undefined)
                  .sort((a, b) => (b[1] || 0) - (a[1] || 0))
                  .map(([factor, weight]) => (
                    <div key={factor} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium capitalize">
                          {factor.replace(/_/g, ' ')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Weight: {((weight || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <Badge variant="outline">
                        {((weight || 0) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Factor Frequency in High-Score Days</CardTitle>
              <CardDescription>
                How often each factor appears in days that exceed the threshold
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(data.factorFrequency)
                  .filter(([_, freq]) => freq !== undefined)
                  .sort((a, b) => (b[1] || 0) - (a[1] || 0))
                  .map(([factor, frequency]) => (
                    <div key={factor} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium capitalize">
                          {factor.replace(/_/g, ' ')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Appears in {(frequency || 0).toFixed(1)}% of high-score days
                        </div>
                      </div>
                      <Badge variant={(frequency || 0) > 50 ? "default" : "secondary"}>
                        {(frequency || 0).toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
