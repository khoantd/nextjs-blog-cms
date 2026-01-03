"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Brain, BarChart3, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { FactorRepetitionStats } from "@/components/factor-repetition-stats";

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

interface StockFactorTableBackendProps {
  analysisId: number;
  symbol: string;
  minPctChange?: number;
}

export function StockFactorTableBackend({ 
  analysisId, 
  symbol, 
  minPctChange = 4.0 
}: StockFactorTableBackendProps) {
  const [factorData, setFactorData] = useState<FactorData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isTableCollapsed, setIsTableCollapsed] = useState(true);

  // Load existing factor data on component mount
  useEffect(() => {
    const loadExistingFactorData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/stock-analyses/${analysisId}/factor-table`, {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setFactorData(result.data);
            setIsGenerated(true);
            console.log(`Loaded ${result.data.length} existing factor records from database`);
          }
        } else if (response.status === 404) {
          // No existing data found, that's okay - show generate button
          console.log('No existing factor data found, ready to generate');
        } else {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          console.error('Error loading existing data:', errorData);
          // Don't show error to user for 404, just log it
        }
      } catch (err) {
        console.error('Error checking for existing factor data:', err);
        // Don't show error to user, just fail silently to allow generation
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingFactorData();
  }, [analysisId]);

  const handleGenerateFactors = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stock-analyses/${analysisId}/factor-table`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error('API Error Response:', errorData);
        throw new Error(errorData.error || `Failed to generate factor table (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setFactorData(result.data);
        setIsGenerated(true);
      } else {
        throw new Error('Failed to generate factor table');
      }
    } catch (err) {
      console.error('Error generating factor table:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while generating factors');
    } finally {
      setIsLoading(false);
    }
  };

  const getFactorBadge = (value: number | null, label: string) => {
    if (value === null) {
      return <Badge variant="outline" className="text-xs">{label}</Badge>;
    }
    return value === 1 
      ? <Badge variant="default" className="text-xs bg-green-500">{label}</Badge>
      : <Badge variant="secondary" className="text-xs">{label}</Badge>;
  };

  const getAiFactorBadge = (value: number | null, label: string) => {
    if (value === null) {
      return <Badge variant="outline" className="text-xs italic">AI: {label}</Badge>;
    }
    return value === 1 
      ? <Badge variant="default" className="text-xs bg-blue-500">AI: {label}</Badge>
      : <Badge variant="secondary" className="text-xs">AI: {label}</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Factor Analysis for {symbol}
        </CardTitle>
        <CardDescription>
          Technical and AI-powered factors for significant price movements (≥{minPctChange}%)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && !isGenerated && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading factor data...</p>
          </div>
        )}

        {!isGenerated && !isLoading && (
          <div className="text-center">
            <Button 
              onClick={handleGenerateFactors} 
              disabled={isLoading}
              size="lg"
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Factors...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Generate Factor Table
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Analyze technical indicators and prepare for AI-powered factor analysis
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}

        {isGenerated && factorData.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                {factorData.length} transactions analyzed
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGenerateFactors}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Regenerate
              </Button>
            </div>

            <FactorRepetitionStats factorData={factorData} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Technical Indicators</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <strong>Volume Spike:</strong> Unusual trading volume</li>
                  <li>• <strong>Break MA50/200:</strong> Price crosses moving averages</li>
                  <li>• <strong>RSI &gt; 60:</strong> Overbought condition</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">AI-Powered Factors</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <strong>Market/Sector:</strong> Broad market trends</li>
                  <li>• <strong>Earnings:</strong> Earnings calendar impact</li>
                  <li>• <strong>News/Macro:</strong> Sentiment & economic factors</li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTableCollapsed(!isTableCollapsed)}
                className="w-full flex items-center justify-between"
              >
                <span>Factor Data Table ({factorData.length} transactions)</span>
                {isTableCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>

              {!isTableCollapsed && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Tx</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-center">Volume Spike</TableHead>
                        <TableHead className="text-center">Break MA50</TableHead>
                        <TableHead className="text-center">Break MA200</TableHead>
                        <TableHead className="text-center">RSI &gt; 60</TableHead>
                        <TableHead className="text-center">Market Up</TableHead>
                        <TableHead className="text-center">Sector Up</TableHead>
                        <TableHead className="text-center">Earnings</TableHead>
                        <TableHead className="text-center">News</TableHead>
                        <TableHead className="text-center">Short Cover</TableHead>
                        <TableHead className="text-center">Macro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {factorData.map((factor) => (
                        <TableRow key={factor.Tx}>
                          <TableCell className="font-medium">{factor.Tx}</TableCell>
                          <TableCell>{factor.Date}</TableCell>
                          <TableCell className="text-center">
                            {getFactorBadge(factor.volume_spike, 'Vol')}
                          </TableCell>
                          <TableCell className="text-center">
                            {getFactorBadge(factor.break_ma50, 'MA50')}
                          </TableCell>
                          <TableCell className="text-center">
                            {getFactorBadge(factor.break_ma200, 'MA200')}
                          </TableCell>
                          <TableCell className="text-center">
                            {getFactorBadge(factor.rsi_over_60, 'RSI')}
                          </TableCell>
                          <TableCell className="text-center">
                            {getAiFactorBadge(factor.market_up, 'Market')}
                          </TableCell>
                          <TableCell className="text-center">
                            {getAiFactorBadge(factor.sector_up, 'Sector')}
                          </TableCell>
                          <TableCell className="text-center">
                            {getAiFactorBadge(factor.earnings_window, 'Earn')}
                          </TableCell>
                          <TableCell className="text-center">
                            {getAiFactorBadge(factor.news_positive, 'News')}
                          </TableCell>
                          <TableCell className="text-center">
                            {getAiFactorBadge(factor.short_covering, 'Short')}
                          </TableCell>
                          <TableCell className="text-center">
                            {getAiFactorBadge(factor.macro_tailwind, 'Macro')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
