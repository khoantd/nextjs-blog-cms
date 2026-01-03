/**
 * Stock Factor Analysis Service
 * Integrates factor analysis with the existing stock analysis workflow
 */

import {
  analyzeFactors,
  getFactorSummary,
  correlateFactorsWithPriceMovement,
  calculateMA,
  calculateRSI,
  calculateDailyScore,
  calculateDailyScores,
  getDailyScoreSummary,
  predictStrongMovement,
  type ExtendedStockData,
  type FactorAnalysis,
  type StockFactor,
  FACTOR_DESCRIPTIONS,
  type DailyScoreConfig,
  type DailyScoreResult,
  DEFAULT_DAILY_SCORE_CONFIG
} from '../stock-factors';

export interface FactorAnalysisOptions {
  nasdaqData?: Array<{ date: string; pct_change: number }>;
  sectorData?: Array<{ date: string; pct_change: number }>;
  earningsDates?: string[];
  newsData?: Array<{ date: string; sentiment: 'positive' | 'negative' | 'neutral' }>;
  shortInterest?: number;
  macroEvents?: Array<{ date: string; favorable: boolean }>;
  scoreConfig?: DailyScoreConfig;
}

export interface EnrichedTransaction {
  tx: number;
  date: string;
  close: number;
  pctChange: number;
  factors: StockFactor[];
  factorCount: number;
  score?: number;
  aboveThreshold?: boolean;
  technicalIndicators?: {
    ma20?: number;
    ma50?: number;
    ma200?: number;
    rsi?: number;
    volume?: number;
    volumeMA20?: number;
  };
}

/**
 * Parse CSV content into stock data array
 */
export function parseStockCSV(csvContent: string): ExtendedStockData[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  const data: ExtendedStockData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: any = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim();

      if (header === 'Close' || header === 'Open' || header === 'High' || header === 'Low') {
        row[header] = parseFloat(value);
      } else if (header === 'Volume') {
        row[header] = parseInt(value, 10);
      } else {
        row[header] = value;
      }
    });

    data.push(row as ExtendedStockData);
  }

  // Sort by date
  return data.sort((a, b) =>
    new Date(a.Date).getTime() - new Date(b.Date).getTime()
  );
}

/**
 * Calculate percentage changes
 */
export function calculatePctChanges(data: ExtendedStockData[]): ExtendedStockData[] {
  return data.map((row, index) => {
    if (index === 0) {
      return { ...row, pct_change: 0 };
    }

    const prevClose = data[index - 1].Close;
    const pctChange = ((row.Close - prevClose) / prevClose) * 100;

    return { ...row, pct_change: pctChange };
  });
}

/**
 * Enrich stock data with technical indicators
 */
export function enrichWithTechnicalIndicators(
  data: ExtendedStockData[]
): ExtendedStockData[] {
  const closePrices = data.map(d => d.Close);
  const volumes = data.map(d => d.Volume || 0);

  const ma20 = calculateMA(closePrices, 20);
  const ma50 = calculateMA(closePrices, 50);
  const ma200 = calculateMA(closePrices, 200);
  const rsi = calculateRSI(closePrices, 14);

  return data.map((row, index) => ({
    ...row,
    ma20: ma20[index],
    ma50: ma50[index],
    ma200: ma200[index],
    rsi: rsi[index]
  }));
}

/**
 * Perform complete factor analysis on stock data
 */
export function performFactorAnalysis(
  stockData: ExtendedStockData[],
  options: FactorAnalysisOptions = {}
) {
  // Enrich data with technical indicators
  const enrichedData = enrichWithTechnicalIndicators(stockData);

  // Perform factor analysis
  const factorAnalyses = analyzeFactors(enrichedData, options);

  // Calculate daily scores
  const scoreConfig = options.scoreConfig || DEFAULT_DAILY_SCORE_CONFIG;
  const dailyScores = calculateDailyScores(factorAnalyses, scoreConfig);
  const scoreSummary = getDailyScoreSummary(dailyScores);

  // Get summary statistics
  const summary = getFactorSummary(factorAnalyses);

  // Calculate correlation with price movements
  const correlation = correlateFactorsWithPriceMovement(factorAnalyses, enrichedData);

  return {
    enrichedData,
    factorAnalyses,
    dailyScores,
    scoreSummary,
    summary,
    correlation
  };
}

/**
 * Enrich transactions with factor data
 */
export function enrichTransactionsWithFactors(
  transactions: Array<{ tx: number; date: string; close: number; pctChange: number }>,
  factorAnalyses: FactorAnalysis[],
  enrichedData: ExtendedStockData[],
  dailyScores?: DailyScoreResult[]
): EnrichedTransaction[] {
  return transactions.map(tx => {
    const txDate = new Date(tx.date).toISOString().split('T')[0];

    // Find corresponding factor analysis
    const factorAnalysis = factorAnalyses.find(
      fa => new Date(fa.date).toISOString().split('T')[0] === txDate
    );

    // Find corresponding stock data for technical indicators
    const stockDay = enrichedData.find(
      sd => new Date(sd.Date).toISOString().split('T')[0] === txDate
    );

    // Find corresponding daily score
    const dailyScore = dailyScores?.find(
      ds => new Date(ds.date).toISOString().split('T')[0] === txDate
    );

    return {
      ...tx,
      factors: factorAnalysis?.factorList || [],
      factorCount: factorAnalysis?.factorCount || 0,
      score: dailyScore?.score,
      aboveThreshold: dailyScore?.aboveThreshold,
      technicalIndicators: stockDay ? {
        ma20: stockDay.ma20,
        ma50: stockDay.ma50,
        ma200: stockDay.ma200,
        rsi: stockDay.rsi,
        volume: stockDay.Volume,
      } : undefined
    };
  });
}

/**
 * Generate AI insights prompt based on factor analysis
 */
export function generateFactorInsightsPrompt(
  symbol: string,
  summary: ReturnType<typeof getFactorSummary>,
  correlation: ReturnType<typeof correlateFactorsWithPriceMovement>,
  enrichedTransactions: EnrichedTransaction[]
): string {
  // Find top factors
  const topFactors = Object.entries(correlation)
    .filter(([_, data]) => data.occurrences > 0)
    .sort((a, b) => b[1].avgReturn - a[1].avgReturn)
    .slice(0, 5);

  // Find most common factors in high-return days
  const factorOccurrences: Record<string, number> = {};
  enrichedTransactions.forEach(tx => {
    tx.factors.forEach(factor => {
      factorOccurrences[factor] = (factorOccurrences[factor] || 0) + 1;
    });
  });

  const mostCommonFactors = Object.entries(factorOccurrences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const prompt = `Analyze the stock performance of ${symbol} based on the following factor analysis:

SUMMARY:
- Total trading days analyzed: ${summary.totalDays}
- Average factors per day: ${summary.averageFactorsPerDay.toFixed(2)}
- Days with significant price movements: ${enrichedTransactions.length}

TOP PERFORMING FACTORS (by average return):
${topFactors.map(([factor, data], index) => {
  const desc = FACTOR_DESCRIPTIONS[factor as StockFactor];
  return `${index + 1}. ${desc.name} (${factor})
   - Occurrences: ${data.occurrences}
   - Average Return: ${data.avgReturn.toFixed(2)}%
   - Description: ${desc.description}`;
}).join('\n')}

MOST COMMON FACTORS ON HIGH-RETURN DAYS:
${mostCommonFactors.map(([factor, count], index) => {
  const desc = FACTOR_DESCRIPTIONS[factor as StockFactor];
  return `${index + 1}. ${desc.name}: ${count} occurrences`;
}).join('\n')}

FACTOR FREQUENCY ACROSS ALL DAYS:
${Object.entries(summary.factorFrequency)
  .filter(([_, freq]) => (freq || 0) > 5)
  .sort((a, b) => (b[1] || 0) - (a[1] || 0))
  .map(([factor, freq]) => {
    const desc = FACTOR_DESCRIPTIONS[factor as StockFactor];
    return `- ${desc.name}: ${freq?.toFixed(1)}% of days`;
  }).join('\n')}

Please provide:
1. Key insights about which factors most strongly correlate with price increases
2. Patterns or combinations of factors that appear most frequently on high-return days
3. Recommendations for monitoring these factors in future trading decisions
4. Any notable observations about the technical, fundamental, or market factors`;

  return prompt;
}

/**
 * Format factor analysis results for API response
 */
export function formatFactorAnalysisResults(
  factorAnalyses: FactorAnalysis[],
  summary: ReturnType<typeof getFactorSummary>,
  correlation: ReturnType<typeof correlateFactorsWithPriceMovement>,
  dailyScores?: DailyScoreResult[],
  scoreSummary?: ReturnType<typeof getDailyScoreSummary>
) {
  return {
    analyses: factorAnalyses.map(analysis => ({
      date: analysis.date,
      factorCount: analysis.factorCount,
      factors: analysis.factorList.map(factor => ({
        factor,
        name: FACTOR_DESCRIPTIONS[factor].name,
        category: FACTOR_DESCRIPTIONS[factor].category,
        description: FACTOR_DESCRIPTIONS[factor].description
      }))
    })),
    dailyScores: dailyScores?.map(score => ({
      date: score.date,
      score: score.score,
      factorCount: score.factorCount,
      aboveThreshold: score.aboveThreshold,
      factors: score.factors.map(factor => ({
        factor,
        name: FACTOR_DESCRIPTIONS[factor].name,
        contribution: score.breakdown[factor]?.contribution || 0
      }))
    })),
    summary: {
      totalDays: summary.totalDays,
      averageFactorsPerDay: summary.averageFactorsPerDay,
      factorCounts: summary.factorCounts,
      factorFrequency: Object.entries(summary.factorFrequency).map(([factor, freq]) => ({
        factor,
        name: FACTOR_DESCRIPTIONS[factor as StockFactor].name,
        frequency: freq,
        count: summary.factorCounts[factor as StockFactor] || 0
      }))
    },
    scoreSummary: scoreSummary ? {
      totalDays: scoreSummary.totalDays,
      highScoreDays: scoreSummary.highScoreDays,
      highScorePercentage: scoreSummary.highScorePercentage,
      averageScore: scoreSummary.averageScore,
      maxScore: scoreSummary.maxScore,
      minScore: scoreSummary.minScore,
      factorFrequency: Object.entries(scoreSummary.factorFrequency).map(([factor, freq]) => ({
        factor,
        name: FACTOR_DESCRIPTIONS[factor as StockFactor].name,
        frequency: freq
      }))
    } : null,
    correlation: Object.entries(correlation).map(([factor, data]) => ({
      factor,
      name: FACTOR_DESCRIPTIONS[factor as StockFactor].name,
      category: FACTOR_DESCRIPTIONS[factor as StockFactor].category,
      occurrences: data.occurrences,
      avgReturn: data.avgReturn,
      correlation: data.correlation
    })).sort((a, b) => b.avgReturn - a.avgReturn)
  };
}

/**
 * Save complete factor analysis to database
 * Integrates daily factor data, daily scores, and factor tables
 */
export async function saveFactorAnalysisToDatabase(
  stockAnalysisId: number,
  csvContent: string,
  analysisResult: any
) {
  console.log(`[Factor Service] Saving factor analysis for stock analysis ID: ${stockAnalysisId}`);
  
  try {
    // Parse CSV and perform complete factor analysis
    const stockData = parseStockCSV(csvContent);
    const dataWithPctChange = calculatePctChanges(stockData);
    
    // Perform comprehensive factor analysis
    const factorAnalysisResult = performFactorAnalysis(dataWithPctChange, {
      scoreConfig: {
        weights: {
          volume_spike: 0.25,
          market_up: 0.20,
          earnings_window: 0.15,
          break_ma50: 0.15,
          rsi_over_60: 0.10,
          sector_up: 0.08,
          break_ma200: 0.05,
          news_positive: 0.02,
          short_covering: 0.03,
          macro_tailwind: 0.02
        },
        threshold: 0.45,
        minFactorsRequired: 2
      }
    });
    
    // Save daily factor data
    console.log(`[Factor Service] Saving ${factorAnalysisResult.enrichedData.length} days of factor data`);
    const factorDataToSave = factorAnalysisResult.enrichedData.map((day: any) => ({
      stockAnalysisId,
      date: day.Date,
      close: day.Close,
      open: day.Open,
      high: day.High,
      low: day.Low,
      volume: day.Volume,
      pctChange: day.pct_change,
      ma20: day.ma20 || null,
      ma50: day.ma50 || null,
      ma200: day.ma200 || null,
      rsi: day.rsi || null,
      volumeSpike: day.volume_spike || false,
      marketUp: day.market_up || false,
      sectorUp: day.sector_up || false,
      earningsWindow: day.earnings_window || false,
      breakMa50: day.break_ma50 || false,
      breakMa200: day.break_ma200 || false,
      rsiOver60: day.rsi_over_60 || false,
      newsPositive: day.news_positive || false,
      shortCovering: day.short_covering || false,
      macroTailwind: day.macro_tailwind || false
    }));
    
    // Import prisma dynamically to avoid circular dependencies
    const { prisma } = await import('@/lib/prisma');
    
    // Bulk insert daily factor data
    for (const data of factorDataToSave) {
      await prisma.dailyFactorData.upsert({
        where: {
          stockAnalysisId_date: {
            stockAnalysisId: data.stockAnalysisId,
            date: data.date
          }
        },
        update: data,
        create: data
      });
    }
    
    // Save daily scores
    console.log(`[Factor Service] Saving ${factorAnalysisResult.dailyScores.length} daily scores`);
    const dailyScoresToSave = factorAnalysisResult.dailyScores.map((score: any) => ({
      stockAnalysisId,
      date: score.date,
      score: score.score,
      factorCount: score.factorCount,
      aboveThreshold: score.aboveThreshold,
      breakdown: JSON.stringify(score.breakdown)
    }));
    
    // Bulk insert daily scores
    for (const score of dailyScoresToSave) {
      await prisma.dailyScore.upsert({
        where: {
          stockAnalysisId_date: {
            stockAnalysisId: score.stockAnalysisId,
            date: score.date
          }
        },
        update: score,
        create: score
      });
    }
    
    // Save factor table data for transactions
    console.log(`[Factor Service] Saving factor table for ${analysisResult.transactions.length} transactions`);
    const factorTableData = analysisResult.transactions.map((tx: any, index: number) => {
      // Extract factors from the transaction if available
      const factors = tx.factors || [];
      
      // Map existing factors to our factor structure
      const factorMap = {
        "volume_spike": factors.includes('volume_spike') ? 1 : 0,
        "break_ma50": factors.includes('break_ma50') ? 1 : 0,
        "break_ma200": factors.includes('break_ma200') ? 1 : 0,
        "rsi_over_60": factors.includes('rsi_over_60') ? 1 : 0,
        // AI-powered factors (null for now, will be populated by AI later)
        "market_up": null,
        "sector_up": null,
        "earnings_window": null,
        "news_positive": null,
        "short_covering": null,
        "macro_tailwind": null
      };
      
      return {
        stockAnalysisId,
        transactionId: tx.tx || index + 1,
        date: tx.date,
        factorData: JSON.stringify(factorMap)
      };
    });
    
    // Bulk insert factor table data
    for (const row of factorTableData) {
      await prisma.factorTable.upsert({
        where: {
          stockAnalysisId_transactionId: {
            stockAnalysisId: row.stockAnalysisId,
            transactionId: row.transactionId
          }
        },
        update: {
          date: row.date,
          factorData: row.factorData,
          updatedAt: new Date()
        },
        create: row
      });
    }
    
    console.log(`[Factor Service] Successfully saved complete factor analysis:`);
    console.log(`  - Daily factor data: ${factorDataToSave.length} days`);
    console.log(`  - Daily scores: ${dailyScoresToSave.length} scores`);
    console.log(`  - Factor table: ${factorTableData.length} transactions`);
    
    return {
      success: true,
      dailyFactorDataCount: factorDataToSave.length,
      dailyScoresCount: dailyScoresToSave.length,
      factorTableCount: factorTableData.length
    };
    
  } catch (error) {
    console.error('[Factor Service] Error saving factor analysis:', error);
    throw error;
  }
}

/**
 * Generate daily prediction for current market conditions
 */
export function generateDailyPrediction(
  symbol: string,
  currentFactors: Partial<Record<StockFactor, boolean>>,
  config: DailyScoreConfig = DEFAULT_DAILY_SCORE_CONFIG
) {
  const prediction = predictStrongMovement(currentFactors, config);
  
  return {
    symbol,
    date: new Date().toISOString().split('T')[0],
    score: prediction.score,
    prediction: prediction.prediction,
    confidence: prediction.confidence,
    activeFactors: prediction.activeFactors.map(factor => ({
      factor,
      name: FACTOR_DESCRIPTIONS[factor].name,
      description: FACTOR_DESCRIPTIONS[factor].description,
      weight: config.weights[factor] || 0
    })),
    recommendations: prediction.recommendations,
    threshold: config.threshold,
    interpretation: prediction.prediction === 'HIGH_PROBABILITY' 
      ? `${symbol} shows high probability of strong upward movement based on current factors`
      : prediction.prediction === 'MODERATE'
      ? `${symbol} shows moderate potential for price movement`
      : `${symbol} shows low probability of significant movement today`
  };
}
