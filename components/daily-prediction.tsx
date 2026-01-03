"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Lightbulb,
  BarChart3
} from "lucide-react";
import type { StockFactor } from "@/lib/stock-factors";
import { FACTOR_DESCRIPTIONS, DEFAULT_DAILY_SCORE_CONFIG } from "@/lib/stock-factors";

interface DailyPredictionProps {
  symbol: string;
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
}

export function DailyPredictionCard({
  symbol,
  score,
  prediction,
  confidence,
  activeFactors,
  recommendations,
  threshold,
  interpretation
}: DailyPredictionProps) {
  const scorePercentage = score * 100;
  const thresholdPercentage = threshold * 100;

  const getPredictionColor = (prediction: string) => {
    switch (prediction) {
      case 'HIGH_PROBABILITY': return 'text-green-600';
      case 'MODERATE': return 'text-yellow-600';
      case 'LOW_PROBABILITY': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPredictionIcon = (prediction: string) => {
    switch (prediction) {
      case 'HIGH_PROBABILITY': return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'MODERATE': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'LOW_PROBABILITY': return <TrendingDown className="h-5 w-5 text-red-600" />;
      default: return <BarChart3 className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPredictionBadgeVariant = (prediction: string) => {
    switch (prediction) {
      case 'HIGH_PROBABILITY': return 'default';
      case 'MODERATE': return 'secondary';
      case 'LOW_PROBABILITY': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getPredictionIcon(prediction)}
              Daily Prediction - {symbol}
            </CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardDescription>
          </div>
          <Badge variant={getPredictionBadgeVariant(prediction)} className="text-sm">
            {prediction.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score and Confidence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Movement Score</span>
              <span className={`font-bold text-lg ${getPredictionColor(prediction)}`}>
                {scorePercentage.toFixed(1)}%
              </span>
            </div>
            <Progress value={scorePercentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>Threshold: {thresholdPercentage.toFixed(0)}%</span>
              <span>100%</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Confidence Level</span>
              <span className="font-bold text-lg">{confidence.toFixed(0)}%</span>
            </div>
            <Progress value={confidence} className="h-3" />
            <div className="text-xs text-muted-foreground">
              Based on factor analysis
            </div>
          </div>
        </div>

        {/* Interpretation */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <p className="text-sm">{interpretation}</p>
          </div>
        </div>

        {/* Active Factors */}
        {activeFactors.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Active Factors ({activeFactors.length})
            </h4>
            <div className="grid gap-2">
              {activeFactors.map(({ factor, name, weight }) => (
                <div key={factor} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <div>
                      <div className="font-medium text-sm">{name}</div>
                      <div className="text-xs text-muted-foreground">
                        {FACTOR_DESCRIPTIONS[factor].description}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {(weight * 100).toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Trading Recommendations
            </h4>
            <div className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" size="sm">
            View Detailed Analysis
          </Button>
          <Button variant="outline" size="sm">
            Export Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface DailyPredictionSummaryProps {
  predictions: DailyPredictionProps[];
}

export function DailyPredictionSummary({ predictions }: DailyPredictionSummaryProps) {
  const highProbabilityCount = predictions.filter(p => p.prediction === 'HIGH_PROBABILITY').length;
  const moderateCount = predictions.filter(p => p.prediction === 'MODERATE').length;
  const lowProbabilityCount = predictions.filter(p => p.prediction === 'LOW_PROBABILITY').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Overview</CardTitle>
        <CardDescription>
          Summary of daily predictions across analyzed stocks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="text-2xl font-bold text-green-600">{highProbabilityCount}</div>
            <div className="text-sm text-muted-foreground">High Probability</div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-yellow-600">{moderateCount}</div>
            <div className="text-sm text-muted-foreground">Moderate</div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-red-600">{lowProbabilityCount}</div>
            <div className="text-sm text-muted-foreground">Low Probability</div>
          </div>
        </div>
        
        <div className="mt-6 space-y-4">
          {predictions.map((prediction, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-3">
                {getPredictionIcon(prediction.prediction)}
                <div>
                  <div className="font-medium">{prediction.symbol}</div>
                  <div className="text-sm text-muted-foreground">
                    {(prediction.score * 100).toFixed(1)}% score
                  </div>
                </div>
              </div>
              <Badge variant={getPredictionBadgeVariant(prediction.prediction)}>
                {prediction.prediction.replace('_', ' ')}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to get prediction icon (moved outside to be used in both components)
function getPredictionIcon(prediction: string) {
  switch (prediction) {
    case 'HIGH_PROBABILITY': return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'MODERATE': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case 'LOW_PROBABILITY': return <TrendingDown className="h-4 w-4 text-red-600" />;
    default: return <BarChart3 className="h-4 w-4 text-gray-600" />;
  }
}

// Helper function to get badge variant
function getPredictionBadgeVariant(prediction: string) {
  switch (prediction) {
    case 'HIGH_PROBABILITY': return 'default';
    case 'MODERATE': return 'secondary';
    case 'LOW_PROBABILITY': return 'destructive';
    default: return 'outline';
  }
}
