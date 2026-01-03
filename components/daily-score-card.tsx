"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import type { DailyScoreResult } from "@/lib/stock-factors";
import { FACTOR_DESCRIPTIONS, DEFAULT_DAILY_SCORE_CONFIG } from "@/lib/stock-factors";

interface DailyScoreCardProps {
  score: DailyScoreResult;
  showDetails?: boolean;
  compact?: boolean;
}

export function DailyScoreCard({ score, showDetails = true, compact = false }: DailyScoreCardProps) {
  const scorePercentage = score.score * 100;
  const thresholdPercentage = DEFAULT_DAILY_SCORE_CONFIG.threshold * 100;

  const getScoreColor = (score: number) => {
    if (score >= DEFAULT_DAILY_SCORE_CONFIG.threshold) return "text-green-600";
    if (score >= DEFAULT_DAILY_SCORE_CONFIG.threshold * 0.7) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (aboveThreshold: boolean) => {
    if (aboveThreshold) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score.score >= DEFAULT_DAILY_SCORE_CONFIG.threshold * 0.7) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getPredictionText = (score: number) => {
    if (score >= DEFAULT_DAILY_SCORE_CONFIG.threshold) return "High Probability";
    if (score >= DEFAULT_DAILY_SCORE_CONFIG.threshold * 0.7) return "Moderate";
    return "Low Probability";
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-lg">
        {getScoreIcon(score.aboveThreshold)}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${getScoreColor(score.score)}`}>
              {(scorePercentage).toFixed(1)}%
            </span>
            <Badge variant={score.aboveThreshold ? "default" : "secondary"}>
              {getPredictionText(score.score)}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {score.factorCount} factors active
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Daily Score - {score.date}</CardTitle>
          <div className="flex items-center gap-2">
            {getScoreIcon(score.aboveThreshold)}
            <Badge variant={score.aboveThreshold ? "default" : "secondary"}>
              {getPredictionText(score.score)}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Probability of strong upward movement based on factor analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Score Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Score</span>
              <span className={`font-bold ${getScoreColor(score.score)}`}>
                {scorePercentage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={scorePercentage} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>Threshold: {thresholdPercentage.toFixed(0)}%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{score.factorCount}</div>
              <div className="text-xs text-muted-foreground">Active Factors</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${getScoreColor(score.score)}`}>
                {scorePercentage.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {score.aboveThreshold ? "✓" : "✗"}
              </div>
              <div className="text-xs text-muted-foreground">Above Threshold</div>
            </div>
          </div>

          {/* Active Factors */}
          {showDetails && score.factors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Active Factors</h4>
              <div className="flex flex-wrap gap-2">
                {score.factors.map(factor => {
                  const factorInfo = FACTOR_DESCRIPTIONS[factor];
                  const contribution = score.breakdown[factor]?.contribution || 0;
                  return (
                    <Badge 
                      key={factor} 
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <span>{factorInfo.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(contribution * 100).toFixed(0)}%)
                      </span>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Factor Breakdown */}
          {showDetails && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Factor Breakdown</h4>
              <div className="space-y-1">
                {Object.entries(score.breakdown)
                  .sort((a, b) => b[1].weight - a[1].weight)
                  .map(([factor, data]) => {
                    const factorInfo = FACTOR_DESCRIPTIONS[factor as keyof typeof FACTOR_DESCRIPTIONS];
                    return (
                      <div key={factor} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            data.active ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                          <span className={data.active ? 'font-medium' : 'text-muted-foreground'}>
                            {factorInfo.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {(data.weight * 100).toFixed(0)}%
                          </span>
                          {data.active && (
                            <span className="text-green-600 font-medium">
                              +{(data.contribution * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface DailyScoreListProps {
  scores: DailyScoreResult[];
  showDetails?: boolean;
  compact?: boolean;
  maxItems?: number;
}

export function DailyScoreList({ 
  scores, 
  showDetails = false, 
  compact = false, 
  maxItems 
}: DailyScoreListProps) {
  const displayScores = maxItems ? scores.slice(0, maxItems) : scores;

  if (compact) {
    return (
      <div className="space-y-2">
        {displayScores.map(score => (
          <DailyScoreCard 
            key={score.date} 
            score={score} 
            compact={true}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {displayScores.map(score => (
        <DailyScoreCard 
          key={score.date} 
          score={score} 
          showDetails={showDetails}
        />
      ))}
    </div>
  );
}
