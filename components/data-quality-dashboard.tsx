"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Loader2,
  BarChart3,
  Brain,
  TrendingUp,
  Calculator,
  DollarSign,
  RefreshCw
} from "lucide-react";

interface DataQualityMetrics {
  technicalIndicators: {
    calculated: boolean;
    completeness: number; // 0-100
    availableIndicators: string[];
  };
  factorData: {
    exists: boolean;
    completeness: number; // 0-100
    totalFactors: number;
    aiFactorsAvailable: boolean;
  };
  dailyScoring: {
    available: boolean;
    completeness: number; // 0-100
    scoredDays: number;
    totalDays: number;
  };
  aiAnalysis: {
    completed: boolean;
    inProgress: boolean;
    insightsAvailable: boolean;
  };
  earnings: {
    dataAvailable: boolean;
    lastUpdated?: Date;
  };
}

interface DataQualityDashboardProps {
  analysisId: number;
  symbol: string;
  status: string | null;
  metrics: DataQualityMetrics;
  onRetryFactorGeneration?: () => void;
  onRetryAIAnalysis?: () => void;
  isGeneratingFactors?: boolean;
  isAnalyzingAI?: boolean;
}

export function DataQualityDashboard({
  analysisId,
  symbol,
  status,
  metrics,
  onRetryFactorGeneration,
  onRetryAIAnalysis,
  isGeneratingFactors = false,
  isAnalyzingAI = false
}: DataQualityDashboardProps) {
  const getOverallQuality = () => {
    const scores = [
      metrics.technicalIndicators.completeness,
      metrics.factorData.completeness,
      metrics.dailyScoring.completeness,
      metrics.aiAnalysis.completed ? 100 : (metrics.aiAnalysis.inProgress ? 50 : 0)
    ];
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const getStatusIcon = (section: string, completed: boolean, inProgress = false) => {
    if (inProgress) return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    if (completed) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return "bg-green-500";
    if (value >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const overallQuality = getOverallQuality();

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analysis Overview - {symbol}
          </CardTitle>
          <CardDescription>
            Data quality and processing status for your stock analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Overall Quality Score */}
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">{overallQuality}%</div>
              <div className="text-sm text-muted-foreground mb-2">Overall Quality</div>
              <Progress value={overallQuality} className="w-full" />
            </div>

            {/* Status */}
            <div className="text-center">
              <div className="mb-2">
                <Badge className={
                  status === "completed" ? "bg-green-500" :
                  status === "processing" || status === "ai_processing" ? "bg-blue-500 animate-pulse" :
                  status === "factor_failed" ? "bg-orange-500" :
                  status === "failed" ? "bg-red-500" : "bg-gray-500"
                }>
                  {status || "draft"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">Current Status</div>
            </div>

            {/* Data Completeness */}
            <div className="text-center">
              <div className="text-2xl font-bold mb-2 text-blue-600">
                {metrics.factorData.totalFactors}
              </div>
              <div className="text-sm text-muted-foreground">Total Factors</div>
            </div>

            {/* Analysis Progress */}
            <div className="text-center">
              <div className="text-2xl font-bold mb-2 text-green-600">
                {metrics.dailyScoring.scoredDays}/{metrics.dailyScoring.totalDays}
              </div>
              <div className="text-sm text-muted-foreground">Days Scored</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Section Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Technical Indicators */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {getStatusIcon("technical", metrics.technicalIndicators.calculated)}
              Technical Indicators
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress 
              value={metrics.technicalIndicators.completeness} 
              className="w-full"
            />
            <div className="text-sm text-muted-foreground">
              {metrics.technicalIndicators.availableIndicators.length} indicators calculated
            </div>
            {metrics.technicalIndicators.availableIndicators.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {metrics.technicalIndicators.availableIndicators.slice(0, 3).map((indicator) => (
                  <Badge key={indicator} variant="outline" className="text-xs">
                    {indicator}
                  </Badge>
                ))}
                {metrics.technicalIndicators.availableIndicators.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{metrics.technicalIndicators.availableIndicators.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Factor Analysis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {getStatusIcon("factors", metrics.factorData.exists)}
              Factor Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress 
              value={metrics.factorData.completeness} 
              className="w-full"
            />
            <div className="text-sm text-muted-foreground">
              {metrics.factorData.exists ? "Factor data available" : "No factor data"}
            </div>
            {metrics.factorData.aiFactorsAvailable && (
              <Badge variant="outline" className="text-xs bg-blue-50">
                AI Factors Enabled
              </Badge>
            )}
            {!metrics.factorData.exists && onRetryFactorGeneration && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onRetryFactorGeneration}
                disabled={isGeneratingFactors}
                className="w-full"
              >
                {isGeneratingFactors ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Generate Factors
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Daily Scoring */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {getStatusIcon("scoring", metrics.dailyScoring.available)}
              Daily Scoring
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress 
              value={metrics.dailyScoring.completeness} 
              className="w-full"
            />
            <div className="text-sm text-muted-foreground">
              {metrics.dailyScoring.available 
                ? `${metrics.dailyScoring.scoredDays} of ${metrics.dailyScoring.totalDays} days scored`
                : "Scoring not available"
              }
            </div>
          </CardContent>
        </Card>

        {/* AI Analysis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {getStatusIcon("ai", metrics.aiAnalysis.completed, metrics.aiAnalysis.inProgress)}
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress 
              value={metrics.aiAnalysis.completed ? 100 : (metrics.aiAnalysis.inProgress ? 50 : 0)} 
              className="w-full"
            />
            <div className="text-sm text-muted-foreground">
              {metrics.aiAnalysis.completed 
                ? "AI insights available"
                : metrics.aiAnalysis.inProgress
                ? "AI analysis in progress"
                : "AI analysis not started"
              }
            </div>
            {metrics.aiAnalysis.insightsAvailable && (
              <Badge variant="outline" className="text-xs bg-purple-50">
                Insights Available
              </Badge>
            )}
            {!metrics.aiAnalysis.completed && !metrics.aiAnalysis.inProgress && onRetryAIAnalysis && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onRetryAIAnalysis}
                disabled={isAnalyzingAI}
                className="w-full"
              >
                {isAnalyzingAI ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-3 w-3" />
                    Start AI Analysis
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Earnings Data */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {getStatusIcon("earnings", metrics.earnings.dataAvailable)}
              Earnings Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {metrics.earnings.dataAvailable 
                ? "Earnings data available"
                : "No earnings data"
              }
            </div>
            {metrics.earnings.lastUpdated && (
              <div className="text-xs text-muted-foreground">
                Last updated: {metrics.earnings.lastUpdated.toLocaleDateString()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button size="sm" variant="outline" className="w-full text-xs">
              <Calculator className="mr-2 h-3 w-3" />
              View Daily Scoring
            </Button>
            <Button size="sm" variant="outline" className="w-full text-xs">
              <DollarSign className="mr-2 h-3 w-3" />
              View Earnings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Error States */}
      {status === "factor_failed" && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Factor Generation Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700 mb-3">
              Factor generation encountered an error. This might be due to missing data or API issues.
            </p>
            {onRetryFactorGeneration && (
              <Button 
                size="sm" 
                onClick={onRetryFactorGeneration}
                disabled={isGeneratingFactors}
              >
                {isGeneratingFactors ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Factor Generation
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
