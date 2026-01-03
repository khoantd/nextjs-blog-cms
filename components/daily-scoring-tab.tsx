"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DailyScoreCard, DailyScoreList } from "@/components/daily-score-card";
import { DailyPredictionCard, DailyPredictionSummary } from "@/components/daily-prediction";
import { 
  TrendingUp, 
  Calculator, 
  Target, 
  BarChart3, 
  Settings,
  RefreshCw,
  Download
} from "lucide-react";
import type { DailyScoreResult, StockFactor } from "@/lib/stock-factors";

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
  fromCache?: boolean;
  message?: string;
}

export function DailyScoringTab({ stockAnalysisId, csvFilePath, symbol = "STOCK" }: DailyScoringTabProps) {
  const [data, setData] = useState<DailyScoringData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchDailyScoring = async () => {
    setLoading(true);
    setError(null);

    try {
      // First try to get existing data
      const response = await fetch(`/api/stock-analyses/${stockAnalysisId}/daily-scoring-db`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch daily scoring data');
      }

      const result = await response.json();

      if (result.success) {
        // If no data exists, try to generate it
        if (result.data.analysis.totalDays === 0) {
          console.log('No existing data found, generating daily scoring data...');
          setIsGenerating(true);
          
          const generateResponse = await fetch(`/api/stock-analyses/${stockAnalysisId}/generate-daily-scoring`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (!generateResponse.ok) {
            throw new Error('Failed to generate daily scoring data');
          }

          const generateResult = await generateResponse.json();
          
          if (generateResult.success) {
            // After generating, fetch the data again
            const newResponse = await fetch(`/api/stock-analyses/${stockAnalysisId}/daily-scoring-db`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              }
            });

            if (newResponse.ok) {
              const newResult = await newResponse.json();
              if (newResult.success) {
                setData(newResult.data);
                console.log('✅ Daily scoring data generated and loaded');
                return;
              }
            }
          } else {
            setError(generateResult.error || 'Failed to generate daily scoring data');
          }
        } else {
          setData(result.data);
          
          // Show message if data is from cache or if no data exists
          if (result.data.message) {
            if (result.data.fromCache) {
              console.log('✅ Data loaded from database cache');
            } else {
              console.log('ℹ️ No existing data found in database');
            }
          }
        }
      } else {
        setError(result.error || 'Failed to load daily scoring data');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchDailyScoring();
  }, [stockAnalysisId]);

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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>{isGenerating ? 'Generating daily scoring data...' : 'Analyzing daily scoring patterns...'}</span>
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
            <Button onClick={fetchDailyScoring} variant="outline">
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
          {data?.fromCache && (
            <div className="flex items-center gap-1 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600">Loaded from database cache</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchDailyScoring} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

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
                    <div className="flex justify-between">
                      <span>Threshold:</span>
                      <span className="font-medium">{(data.scoreConfig.threshold * 100).toFixed(0)}%</span>
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
            scores={data.dailyScores.slice(0, 10)} 
            showDetails={true}
            compact={false}
          />
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          {data.predictions.length > 0 ? (
            <div className="space-y-4">
              {data.predictions.slice(0, 5).map((prediction, index) => (
                <DailyPredictionCard key={index} {...prediction} />
              ))}
            </div>
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
