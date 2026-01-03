"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp } from "lucide-react";
import { FACTOR_DESCRIPTIONS } from "@/lib/stock-factors";

interface FactorData {
  Tx: number;
  Date: string;
  volume_spike: number;
  break_ma50: number;
  break_ma200: number;
  rsi_over_60: number;
  market_up: number | null;
  sector_up: number | null;
  earnings_window: number | null;
  news_positive: number | null;
  short_covering: number | null;
  macro_tailwind: number | null;
}

interface FactorRepetitionStatsProps {
  factorData: FactorData[];
}

export function FactorRepetitionStats({ factorData }: FactorRepetitionStatsProps) {
  // Convert Python logic: factor_counts = factor_df.drop(columns=["Tx", "Date"]).sum().sort_values(ascending=False)
  const calculateFactorCounts = () => {
    if (!factorData || factorData.length === 0) {
      return [];
    }

    // Extract factor columns (exclude Tx and Date)
    const factorColumns = [
      'volume_spike', 'break_ma50', 'break_ma200', 'rsi_over_60',
      'market_up', 'sector_up', 'earnings_window', 'news_positive',
      'short_covering', 'macro_tailwind'
    ];

    // Calculate sum for each factor column
    const factorCounts: { [key: string]: number } = {};
    
    factorColumns.forEach(factor => {
      factorCounts[factor] = factorData.reduce((sum, row) => {
        const value = row[factor as keyof FactorData];
        // Only count non-null values that equal 1
        return sum + ((value === 1) ? 1 : 0);
      }, 0);
    });

    // Sort by count in descending order and convert to array format
    const sortedFactors = Object.entries(factorCounts)
      .filter(([_, count]) => count > 0) // Only include factors that appear
      .sort((a, b) => b[1] - a[1]) // Sort descending
      .map(([factor, count]) => ({
        factor,
        count,
        percentage: ((count / factorData.length) * 100).toFixed(1)
      }));

    return sortedFactors;
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

  const factorCounts = calculateFactorCounts();

  const getFactorDisplayName = (factorKey: string) => {
    const description = FACTOR_DESCRIPTIONS[factorKey as keyof typeof FACTOR_DESCRIPTIONS];
    return description ? description.name : factorKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getFactorCategory = (factorKey: string) => {
    const description = FACTOR_DESCRIPTIONS[factorKey as keyof typeof FACTOR_DESCRIPTIONS];
    return description ? description.category : 'other';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Repeated Factors
        </CardTitle>
        <CardDescription>
          Factor repetition statistics - Key factors that appear most frequently across analyzed transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {factorCounts.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
            <p className="text-muted-foreground">
              No factor data available. Generate factor table first to see repetition statistics.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{factorData.length}</div>
                <div className="text-sm text-muted-foreground">Total Transactions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{factorCounts.length}</div>
                <div className="text-sm text-muted-foreground">Active Factors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {factorCounts[0]?.count || 0}
                </div>
                <div className="text-sm text-muted-foreground">Top Factor Count</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {factorCounts[0]?.percentage || 0}%
                </div>
                <div className="text-sm text-muted-foreground">Top Factor %</div>
              </div>
            </div>

            {/* Factor Counts List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Factor Frequency Ranking</h4>
              {factorCounts.map((item, index) => (
                <div key={item.factor} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {index + 1}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={getFactorColor(getFactorCategory(item.factor))}
                    >
                      {getFactorDisplayName(item.factor)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold text-lg">{item.count}</div>
                      <div className="text-sm text-muted-foreground">{item.percentage}%</div>
                    </div>
                    <div className="w-20 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Key Insights */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Key Insights</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>{getFactorDisplayName(factorCounts[0]?.factor)}</strong> is the most frequent factor ({factorCounts[0]?.percentage}% of transactions)</li>
                {factorCounts.length >= 3 && (
                  <li>• Top 3 factors account for {((parseInt(factorCounts[0]?.percentage) + parseInt(factorCounts[1]?.percentage) + parseInt(factorCounts[2]?.percentage)) / 3).toFixed(1)}% of occurrences</li>
                )}
                <li>• {factorCounts.filter(f => getFactorCategory(f.factor) === 'technical').length} technical factors identified</li>
                <li>• {factorCounts.filter(f => getFactorCategory(f.factor) === 'market' || getFactorCategory(f.factor) === 'sentiment').length} market/sentiment factors identified</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
