"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, Calendar, DollarSign, BarChart3, Table, Brain, LineChart, Calculator } from "lucide-react";
import Link from "next/link";
import type { StockAnalysis, StockAnalysisResult } from "@/lib/types/stock-analysis";
import { FACTOR_DESCRIPTIONS } from "@/lib/stock-factors";
import { StockFactorTableBackend } from "@/components/stock-factor-table-backend";
import { StockChart } from "@/components/stock-chart";
import { DailyScoringTab } from "@/components/daily-scoring-tab";

interface StockAnalysisDetailProps {
  analysis: StockAnalysis;
}

export function StockAnalysisDetail({ analysis }: StockAnalysisDetailProps) {
  const results: StockAnalysisResult | null = analysis.analysisResults
    ? JSON.parse(analysis.analysisResults)
    : null;

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
                <Badge className={getStatusColor(analysis.status)}>
                  {analysis.status || "draft"}
                </Badge>
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
                  {Object.entries(results.factorAnalysis.summary.factorCounts)
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
                    })}
                </div>
              </div>

              {/* Top Performing Factors */}
              <div>
                <h4 className="font-semibold mb-3">Top Performing Factors</h4>
                <div className="space-y-2">
                  {results.factorAnalysis.correlation &&
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
        <Tabs defaultValue="data" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
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
          </TabsList>

          <TabsContent value="data" className="space-y-4">
            {results.transactions.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Significant Price Increases
                  </CardTitle>
                  <CardDescription>
                    Days where closing price increased by {results.minPctChange}% or more
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
                              ${transaction.close.toFixed(2)}
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
                    No days found with price increases of {results.minPctChange}% or more
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="chart" className="space-y-4">
            <StockChart results={results} />
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
        </Tabs>
      )}

      {analysis.aiInsights && (
        <Card>
          <CardHeader>
            <CardTitle>AI Insights</CardTitle>
            <CardDescription>AI-generated analysis and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p>{analysis.aiInsights}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
