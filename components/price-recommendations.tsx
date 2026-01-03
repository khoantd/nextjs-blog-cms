"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Target, Shield, Clock, AlertTriangle, Loader2, RefreshCw, DollarSign } from "lucide-react";
import { formatPrice } from "@/lib/currency-utils";

interface PriceRecommendations {
  buyPrice: number;
  sellPrice: number;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string[];
  riskFactors: string[];
  targetUpside: number;
  stopLoss: number;
  timeHorizon: 'short' | 'medium' | 'long';
  technicalIndicators: {
    support: number[];
    resistance: number[];
    trend: 'bullish' | 'bearish' | 'neutral';
  };
  fundamentalFactors: {
    sentiment: 'positive' | 'negative' | 'neutral';
    keyDrivers: string[];
  };
  generatedAt?: string;
}

interface PriceRecommendationsProps {
  analysisId: number;
  symbol: string;
  currentPrice?: number;
  initialRecommendations?: PriceRecommendations | null;
}

export function PriceRecommendations({ 
  analysisId, 
  symbol, 
  currentPrice,
  initialRecommendations 
}: PriceRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<PriceRecommendations | null>(initialRecommendations || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing recommendations on mount
  useEffect(() => {
    if (!initialRecommendations) {
      loadRecommendations();
    }
  }, [analysisId, initialRecommendations]);

  const loadRecommendations = async () => {
    try {
      const response = await fetch(`/api/stock-analyses/${analysisId}/price-recommendations`);
      const data = await response.json();
      
      if (data.success && data.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error('Error loading price recommendations:', err);
    }
  };

  const generateRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/stock-analyses/${analysisId}/price-recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Failed to generate recommendations (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success) {
        setRecommendations(result.recommendations);
      } else {
        throw new Error('Failed to generate recommendations');
      }
    } catch (err) {
      console.error('Error generating recommendations:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return 'text-green-600';
      case 'bearish':
        return 'text-red-600';
      case 'neutral':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      case 'neutral':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTimeHorizonColor = (horizon: string) => {
    switch (horizon) {
      case 'short':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-purple-100 text-purple-800';
      case 'long':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!recommendations) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Target className="h-5 w-5" />
            AI Price Recommendations
          </CardTitle>
          <CardDescription className="text-green-600">
            Get AI-powered buy/sell price targets based on technical and fundamental analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={generateRecommendations}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-4 w-4" />
                  Generate Price Recommendations
                </>
              )}
            </Button>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Target className="h-5 w-5" />
              AI Price Recommendations
            </CardTitle>
            <CardDescription className="text-green-600">
              Data-driven buy/sell targets for {symbol}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getConfidenceColor(recommendations.confidence)}>
              {recommendations.confidence.toUpperCase()} CONFIDENCE
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={generateRecommendations}
              disabled={isLoading}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Price Targets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-blue-200">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Current Price</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {currentPrice ? formatPrice(currentPrice, symbol) : 'N/A'}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-green-200">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-green-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    Buy Target
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatPrice(recommendations.buyPrice, symbol)}
                  </div>
                  {currentPrice && (
                    <div className="text-xs text-gray-500 mt-1">
                      {((recommendations.buyPrice - currentPrice) / currentPrice * 100).toFixed(1)}% from current
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-red-200">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-red-600 mb-1">
                    <TrendingDown className="h-4 w-4" />
                    Sell Target
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {formatPrice(recommendations.sellPrice, symbol)}
                  </div>
                  {currentPrice && (
                    <div className="text-xs text-gray-500 mt-1">
                      {((recommendations.sellPrice - currentPrice) / currentPrice * 100).toFixed(1)}% from current
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-lg font-bold text-purple-600">{recommendations.targetUpside}%</div>
              <div className="text-sm text-gray-600">Target Upside</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className="text-lg font-bold text-orange-600">{formatPrice(recommendations.stopLoss, symbol)}</div>
              <div className="text-sm text-gray-600">Stop Loss</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <Badge className={getTimeHorizonColor(recommendations.timeHorizon || 'medium')}>
                {(recommendations.timeHorizon || 'medium').toUpperCase()}
              </Badge>
              <div className="text-sm text-gray-600 mt-1">Time Horizon</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border">
              <div className={`text-lg font-bold capitalize ${getTrendColor(recommendations.technicalIndicators?.trend || 'neutral')}`}>
                {recommendations.technicalIndicators?.trend || 'neutral'}
              </div>
              <div className="text-sm text-gray-600">Technical Trend</div>
            </div>
          </div>

          {/* Technical Analysis */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Technical Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Support Levels</h4>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.technicalIndicators?.support?.map((level, index) => (
                        <Badge key={index} variant="outline" className="text-green-600 border-green-200">
                          ${level.toFixed(2)}
                        </Badge>
                      )) || <span className="text-sm text-gray-500">No support levels available</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Resistance Levels</h4>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.technicalIndicators?.resistance?.map((level, index) => (
                        <Badge key={index} variant="outline" className="text-red-600 border-red-200">
                          ${level.toFixed(2)}
                        </Badge>
                      )) || <span className="text-sm text-gray-500">No resistance levels available</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fundamental Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Sentiment</h4>
                    <Badge className={getSentimentColor(recommendations.fundamentalFactors?.sentiment || 'neutral')}>
                      {(recommendations.fundamentalFactors?.sentiment || 'neutral').toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Key Drivers</h4>
                    <ul className="space-y-1">
                      {recommendations.fundamentalFactors?.keyDrivers?.map((driver, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          {driver}
                        </li>
                      )) || <li className="text-sm text-gray-500">No key drivers available</li>}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reasoning */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Investment Rationale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recommendations.reasoning?.map((reason, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-green-500 mt-1">•</span>
                    {reason}
                  </li>
                )) || <li className="text-sm text-gray-500">No reasoning available</li>}
              </ul>
            </CardContent>
          </Card>

          {/* Risk Factors */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                Risk Factors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recommendations.riskFactors?.map((risk, index) => (
                  <li key={index} className="text-sm text-orange-700 flex items-start gap-2">
                    <Shield className="h-4 w-4 mt-0.5 text-orange-500" />
                    {risk}
                  </li>
                )) || <li className="text-sm text-orange-500">No risk factors available</li>}
              </ul>
            </CardContent>
          </Card>

          {/* Generated At */}
          {recommendations.generatedAt && (
            <div className="text-xs text-gray-500 text-center">
              Generated on {new Date(recommendations.generatedAt).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
