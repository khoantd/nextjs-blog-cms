import { NextRequest, NextResponse } from 'next/server';
import { performFactorAnalysis, generateDailyPrediction, parseStockCSV } from '@/lib/services/stock-factor-service';
import { DEFAULT_DAILY_SCORE_CONFIG } from '@/lib/stock-factors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csvContent, options = {} } = body;

    if (!csvContent) {
      return NextResponse.json(
        { error: 'CSV content is required' },
        { status: 400 }
      );
    }

    // Parse stock data
    const stockData = parseStockCSV(csvContent);

    if (stockData.length === 0) {
      return NextResponse.json(
        { error: 'No valid stock data found in CSV' },
        { status: 400 }
      );
    }

    // Perform factor analysis with daily scoring
    const analysisResult = performFactorAnalysis(stockData, {
      ...options,
      scoreConfig: options.scoreConfig || DEFAULT_DAILY_SCORE_CONFIG
    });

    // Generate daily predictions for the most recent days
    const recentScores = analysisResult.dailyScores
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10); // Last 10 days

    const predictions = recentScores.map(score => {
      // Create current factors from the score
      const currentFactors: Record<string, boolean> = {};
      score.factors.forEach(factor => {
        currentFactors[factor] = true;
      });

      return generateDailyPrediction(
        'STOCK', // This should be dynamic based on the actual symbol
        currentFactors,
        options.scoreConfig || DEFAULT_DAILY_SCORE_CONFIG
      );
    });

    return NextResponse.json({
      success: true,
      data: {
        analysis: {
          totalDays: analysisResult.summary.totalDays,
          highScoreDays: analysisResult.scoreSummary.highScoreDays,
          highScorePercentage: analysisResult.scoreSummary.highScorePercentage,
          averageScore: analysisResult.scoreSummary.averageScore,
          maxScore: analysisResult.scoreSummary.maxScore,
          minScore: analysisResult.scoreSummary.minScore
        },
        dailyScores: analysisResult.dailyScores.map(score => ({
          date: score.date,
          score: score.score,
          factorCount: score.factorCount,
          aboveThreshold: score.aboveThreshold,
          factors: score.factors,
          breakdown: score.breakdown
        })),
        predictions,
        scoreConfig: options.scoreConfig || DEFAULT_DAILY_SCORE_CONFIG,
        factorFrequency: analysisResult.scoreSummary.factorFrequency
      }
    });

  } catch (error) {
    console.error('Daily scoring analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform daily scoring analysis' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const factorsParam = searchParams.get('factors');
    const symbol = searchParams.get('symbol') || 'UNKNOWN';

    if (!factorsParam) {
      return NextResponse.json(
        { error: 'Factors parameter is required' },
        { status: 400 }
      );
    }

    // Parse factors from query parameter
    const factors = JSON.parse(decodeURIComponent(factorsParam));

    // Generate prediction for current factors
    const prediction = generateDailyPrediction(
      symbol,
      factors,
      DEFAULT_DAILY_SCORE_CONFIG
    );

    return NextResponse.json({
      success: true,
      data: prediction
    });

  } catch (error) {
    console.error('Daily prediction error:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily prediction' },
      { status: 500 }
    );
  }
}
