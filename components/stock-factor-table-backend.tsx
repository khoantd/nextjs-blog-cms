"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Loader2, Brain, BarChart3, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
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

interface TechnicalIndicators {
  ma20?: number;
  ma50?: number;
  ma200?: number;
  rsi?: number;
  volume?: number;
}

interface EnhancedFactorData extends FactorData {
  technicalIndicators?: TechnicalIndicators;
  confidence?: number;
  dataSource?: 'calculated' | 'ai' | 'hybrid';
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
  const [factorData, setFactorData] = useState<EnhancedFactorData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isTableCollapsed, setIsTableCollapsed] = useState(true);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState("");
  const [technicalIndicators, setTechnicalIndicators] = useState<Record<string, TechnicalIndicators>>({});

  // Fetch technical indicators data
  const fetchTechnicalIndicators = async () => {
    try {
      const response = await fetch(`/api/stock-analyses/${analysisId}/daily-scoring-db`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.factorData) {
          const indicatorsMap: Record<string, TechnicalIndicators> = {};
          result.data.factorData.forEach((data: any) => {
            indicatorsMap[data.date] = {
              ma20: data.ma20,
              ma50: data.ma50,
              ma200: data.ma200,
              rsi: data.rsi,
              volume: data.volume,
            };
          });
          setTechnicalIndicators(indicatorsMap);
        }
      }
    } catch (err) {
      console.error('Error fetching technical indicators:', err);
    }
  };

  // Helper functions for enhanced factor data
  const calculateConfidence = (factor: FactorData): number => {
    const technicalFactors = ['volume_spike', 'break_ma50', 'break_ma200', 'rsi_over_60'];
    const aiFactors = ['market_up', 'sector_up', 'earnings_window', 'news_positive', 'short_covering', 'macro_tailwind'];
    
    const technicalCount = technicalFactors.filter(f => factor[f as keyof FactorData] === 1).length;
    const aiCount = aiFactors.filter(f => factor[f as keyof FactorData] === 1).length;
    const totalFactors = technicalCount + aiCount;
    
    // Higher confidence for more factors and technical indicators
    if (totalFactors === 0) return 0;
    if (totalFactors <= 2) return 60;
    if (totalFactors <= 4) return 75;
    if (totalFactors <= 6) return 85;
    return 95;
  };

  const getDataSource = (factor: FactorData): 'calculated' | 'ai' | 'hybrid' => {
    const technicalFactors = ['volume_spike', 'break_ma50', 'break_ma200', 'rsi_over_60'];
    const aiFactors = ['market_up', 'sector_up', 'earnings_window', 'news_positive', 'short_covering', 'macro_tailwind'];
    
    const hasTechnical = technicalFactors.some(f => factor[f as keyof FactorData] === 1);
    const hasAI = aiFactors.some(f => factor[f as keyof FactorData] === 1);
    
    if (hasTechnical && hasAI) return 'hybrid';
    if (hasTechnical) return 'calculated';
    if (hasAI) return 'ai';
    return 'calculated'; // default
  };

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
            // Enhance factor data with technical indicators and metadata
            const enhancedData: EnhancedFactorData[] = result.data.map((factor: FactorData) => ({
              ...factor,
              technicalIndicators: technicalIndicators[factor.Date] || {},
              confidence: calculateConfidence(factor),
              dataSource: getDataSource(factor)
            }));
            setFactorData(enhancedData);
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
    fetchTechnicalIndicators();
  }, [analysisId]);

  const handleGenerateFactors = async () => {
    setIsLoading(true);
    setError(null);
    setGenerationProgress(0);
    setGenerationStep("Initializing factor generation...");

    try {
      // Simulate progress updates during generation
      const progressSteps = [
        { progress: 20, step: "Calculating technical indicators..." },
        { progress: 40, step: "Analyzing volume patterns..." },
        { progress: 60, step: "Processing moving averages..." },
        { progress: 80, step: "Running AI factor analysis..." },
        { progress: 100, step: "Finalizing results..." }
      ];

      // Start progress simulation
      let currentStep = 0;
      const progressInterval = setInterval(() => {
        if (currentStep < progressSteps.length) {
          setGenerationProgress(progressSteps[currentStep].progress);
          setGenerationStep(progressSteps[currentStep].step);
          currentStep++;
        } else {
          clearInterval(progressInterval);
        }
      }, 800);

      const response = await fetch(`/api/stock-analyses/${analysisId}/factor-table`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationStep("Factor generation completed!");

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error('API Error Response:', errorData);
        throw new Error(errorData.error || `Failed to generate factor table (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Enhance factor data with technical indicators and metadata
        const enhancedData: EnhancedFactorData[] = result.data.map((factor: FactorData) => ({
          ...factor,
          technicalIndicators: technicalIndicators[factor.Date] || {},
          confidence: calculateConfidence(factor),
          dataSource: getDataSource(factor)
        }));
        setFactorData(enhancedData);
        setIsGenerated(true);
        setGenerationStep("Successfully generated factor table!");
      } else {
        throw new Error('Failed to generate factor table');
      }
    } catch (err) {
      console.error('Error generating factor table:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while generating factors');
      setGenerationStep("Factor generation failed");
    } finally {
      setIsLoading(false);
      // Reset progress after a delay
      setTimeout(() => {
        setGenerationProgress(0);
        setGenerationStep("");
      }, 2000);
    }
  };

  const getFactorBadge = (value: number | null, label: string, confidence?: number) => {
    const confidenceColor = confidence && confidence >= 80 ? 'border-green-300' : 
                          confidence && confidence >= 60 ? 'border-yellow-300' : 
                          'border-gray-300';
    
    if (value === null) {
      return <Badge variant="outline" className={`text-xs ${confidenceColor}`}>{label}</Badge>;
    }
    return value === 1 
      ? <Badge variant="default" className={`text-xs bg-green-500 ${confidenceColor}`}>{label}</Badge>
      : <Badge variant="secondary" className={`text-xs ${confidenceColor}`}>{label}</Badge>;
  };

  const getAiFactorBadge = (value: number | null, label: string, confidence?: number) => {
    const confidenceColor = confidence && confidence >= 80 ? 'border-blue-300' : 
                          confidence && confidence >= 60 ? 'border-purple-300' : 
                          'border-gray-300';
    
    if (value === null) {
      return <Badge variant="outline" className={`text-xs italic ${confidenceColor}`}>AI: {label}</Badge>;
    }
    return value === 1 
      ? <Badge variant="default" className={`text-xs bg-blue-500 ${confidenceColor}`}>AI: {label}</Badge>
      : <Badge variant="secondary" className={`text-xs ${confidenceColor}`}>AI: {label}</Badge>;
  };

  const getDataSourceBadge = (dataSource: 'calculated' | 'ai' | 'hybrid') => {
    switch(dataSource) {
      case 'calculated':
        return <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Technical</Badge>;
      case 'ai':
        return <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">AI</Badge>;
      case 'hybrid':
        return <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">Hybrid</Badge>;
      default:
        return null;
    }
  };

  const getConfidenceIndicator = (confidence?: number) => {
    if (!confidence) return null;
    const color = confidence >= 80 ? 'text-green-600' : 
                  confidence >= 60 ? 'text-yellow-600' : 'text-red-600';
    return (
      <span className={`text-xs font-medium ${color}`}>
        {confidence}%
      </span>
    );
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
        {/* Enhanced Loading State */}
        {isLoading && !isGenerated && (
          <div className="text-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
            <div>
              <p className="text-lg font-medium mb-2">Generating Factor Analysis</p>
              <p className="text-sm text-muted-foreground mb-4">{generationStep}</p>
              {generationProgress > 0 && (
                <div className="w-full max-w-md mx-auto space-y-2">
                  <Progress value={generationProgress} className="w-full" />
                  <p className="text-xs text-muted-foreground">{generationProgress}% Complete</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-left max-w-md mx-auto">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Technical Indicators</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-500" />
                <span>AI Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                <span>Factor Detection</span>
              </div>
            </div>
          </div>
        )}

        {!isGenerated && !isLoading && (
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <XCircle className="h-5 w-5" />
                <span>No factor data available</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Generate comprehensive factor analysis to identify market patterns and AI-driven insights
              </p>
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-left max-w-md mx-auto">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Technical Indicators</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-500" />
                <span>AI Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                <span>Factor Detection</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span>Risk Analysis</span>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Error State */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">Factor Generation Failed</p>
                <p className="text-sm text-destructive/80">{error}</p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleGenerateFactors}
                  disabled={isLoading}
                  className="text-xs"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Retry
                    </>
                  )}
                </Button>
              </div>
            </div>
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
                        <TableHead className="text-center">Technical Indicators</TableHead>
                        <TableHead className="text-center">Confidence</TableHead>
                        <TableHead className="text-center">Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {factorData.map((factor) => (
                        <TableRow key={factor.Tx}>
                          <TableCell className="font-medium">{factor.Tx}</TableCell>
                          <TableCell>{factor.Date}</TableCell>
                          <TableCell className="text-center">
                            {getFactorBadge(factor.volume_spike, 'Vol', factor.confidence)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getFactorBadge(factor.break_ma50, 'MA50', factor.confidence)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getFactorBadge(factor.break_ma200, 'MA200', factor.confidence)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getFactorBadge(factor.rsi_over_60, 'RSI', factor.confidence)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getAiFactorBadge(factor.market_up, 'Market', factor.confidence)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getAiFactorBadge(factor.sector_up, 'Sector', factor.confidence)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getAiFactorBadge(factor.earnings_window, 'Earn', factor.confidence)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getAiFactorBadge(factor.news_positive, 'News', factor.confidence)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getAiFactorBadge(factor.short_covering, 'Short', factor.confidence)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getAiFactorBadge(factor.macro_tailwind, 'Macro', factor.confidence)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="text-xs space-y-1">
                              {factor.technicalIndicators?.ma20 && (
                                <div>MA20: ${factor.technicalIndicators.ma20.toFixed(2)}</div>
                              )}
                              {factor.technicalIndicators?.ma50 && (
                                <div>MA50: ${factor.technicalIndicators.ma50.toFixed(2)}</div>
                              )}
                              {factor.technicalIndicators?.rsi && (
                                <div>RSI: {factor.technicalIndicators.rsi.toFixed(1)}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {getConfidenceIndicator(factor.confidence)}
                          </TableCell>
                          <TableCell className="text-center">
                            {factor.dataSource && getDataSourceBadge(factor.dataSource)}
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
