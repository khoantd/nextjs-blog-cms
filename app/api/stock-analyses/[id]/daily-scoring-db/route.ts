import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { performFactorAnalysis, generateDailyPrediction } from '@/lib/services/stock-factor-service';
import { DEFAULT_DAILY_SCORE_CONFIG } from '@/lib/stock-factors';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const stockAnalysisId = parseInt(id);

    if (isNaN(stockAnalysisId)) {
      return NextResponse.json(
        { error: 'Invalid analysis ID' },
        { status: 400 }
      );
    }

    // First, check if we already have daily scores in the database
    const existingScores = await prisma.dailyScore.findMany({
      where: { stockAnalysisId },
      orderBy: { date: 'desc' }
    });

    if (existingScores.length > 0) {
      // Get stock analysis for symbol
      const stockAnalysis = await prisma.stockAnalysis.findUnique({
        where: { id: stockAnalysisId }
      });

      // Return existing database data immediately
      const factorData = await prisma.dailyFactorData.findMany({
        where: { stockAnalysisId },
        orderBy: { date: 'desc' }
      });

      // Calculate summary from existing data
      const highScoreDays = existingScores.filter(s => s.aboveThreshold).length;
      const totalDays = existingScores.length;
      const averageScore = existingScores.reduce((sum: number, s: any) => sum + s.score, 0) / totalDays;
      const maxScore = Math.max(...existingScores.map((s: any) => s.score));
      const minScore = Math.min(...existingScores.map((s: any) => s.score));

      // Adjust threshold dynamically if too few high-score days
      let adjustedConfig = { ...DEFAULT_DAILY_SCORE_CONFIG };
      if (highScoreDays === 0 && maxScore > 0) {
        // If no high-score days but we have some scores, lower threshold to 75% of max score
        adjustedConfig.threshold = Math.max(maxScore * 0.75, 0.15);
      } else if (highScoreDays < totalDays * 0.05 && maxScore > 0.2) {
        // If less than 5% high-score days and max score is decent, lower threshold
        adjustedConfig.threshold = Math.max(maxScore * 0.6, 0.2);
      }

      // Calculate factor frequency from existing factor data
      const factorFrequency: Record<string, number> = {};
      const factors = ['volume_spike', 'market_up', 'earnings_window', 'break_ma50', 'rsi_over_60', 'sector_up', 'break_ma200', 'news_positive', 'short_covering', 'macro_tailwind'];
      
      factors.forEach(factor => {
        const count = factorData.filter((data: any) => {
          switch(factor) {
            case 'volume_spike': return data.volumeSpike;
            case 'market_up': return data.marketUp;
            case 'earnings_window': return data.earningsWindow;
            case 'break_ma50': return data.breakMa50;
            case 'break_ma200': return data.breakMa200;
            case 'rsi_over_60': return data.rsiOver60;
            case 'sector_up': return data.sectorUp;
            case 'news_positive': return data.newsPositive;
            case 'short_covering': return data.shortCovering;
            case 'macro_tailwind': return data.macroTailwind;
            default: return false;
          }
        }).length;
        factorFrequency[factor] = highScoreDays > 0 ? (count / highScoreDays) * 100 : 0;
      });

      // Generate predictions for recent days
      const predictions = [];
      const recentFactorData = factorData.slice(0, 7); // First 7 days (most recent after DESC ordering)
      
      for (const data of recentFactorData) {
        const currentFactors = {
          volume_spike: data.volumeSpike || false,
          market_up: data.marketUp || false,
          earnings_window: data.earningsWindow || false,
          break_ma50: data.breakMa50 || false,
          rsi_over_60: data.rsiOver60 || false,
          sector_up: data.sectorUp || false,
          break_ma200: data.breakMa200 || false,
          news_positive: data.newsPositive || false,
          short_covering: data.shortCovering || false,
          macro_tailwind: data.macroTailwind || false
        };
        
        const prediction = generateDailyPrediction(stockAnalysis?.symbol || 'STOCK', currentFactors, adjustedConfig);
        predictions.push({
          ...prediction,
          symbol: stockAnalysis?.symbol || 'STOCK',
          date: data.date
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          analysis: {
            totalDays,
            highScoreDays,
            highScorePercentage: (highScoreDays / totalDays) * 100,
            averageScore,
            maxScore,
            minScore
          },
          dailyScores: existingScores.map((score: any) => ({
            date: score.date,
            score: score.score,
            factorCount: score.factorCount,
            aboveThreshold: score.aboveThreshold,
            factors: [], // Will be populated from factor data
            breakdown: score.breakdown ? JSON.parse(score.breakdown) : {}
          })),
          predictions,
          factorData: factorData.map((data: any) => ({
            date: data.date,
            close: data.close,
            pctChange: data.pctChange,
            factors: {
              volume_spike: data.volumeSpike,
              market_up: data.marketUp,
              earnings_window: data.earningsWindow,
              break_ma50: data.breakMa50,
              break_ma200: data.breakMa200,
              rsi_over_60: data.rsiOver60,
              sector_up: data.sectorUp,
              news_positive: data.newsPositive,
              short_covering: data.shortCovering,
              macro_tailwind: data.macroTailwind
            }
          })),
          scoreConfig: adjustedConfig,
          factorFrequency,
          fromCache: true,
          message: "Data loaded from database cache"
        }
      });
    }

    // If no existing data, return empty result with message
    return NextResponse.json({
      success: true,
      data: {
        analysis: {
          totalDays: 0,
          highScoreDays: 0,
          highScorePercentage: 0,
          averageScore: 0,
          maxScore: 0,
          minScore: 0
        },
        dailyScores: [],
        predictions: [], // Empty predictions array for no data case
        factorData: [],
        scoreConfig: DEFAULT_DAILY_SCORE_CONFIG,
        factorFrequency: {},
        fromCache: false,
        message: "No existing data found in database. Please run factor analysis first."
      }
    });

  } catch (error) {
    console.error('Database-backed daily scoring error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily scoring data from database' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const stockAnalysisId = parseInt(id);

    if (isNaN(stockAnalysisId)) {
      return NextResponse.json(
        { error: 'Invalid analysis ID' },
        { status: 400 }
      );
    }

    // Get existing scores from database
    const scores = await prisma.dailyScore.findMany({
      where: { stockAnalysisId },
      orderBy: { date: 'desc' },
      take: 30 // Last 30 days
    });

    if (scores.length === 0) {
      return NextResponse.json(
        { error: 'No daily scores found for this analysis' },
        { status: 404 }
      );
    }

    // Get factor data for context
    const factorData = await prisma.dailyFactorData.findMany({
      where: { stockAnalysisId },
      orderBy: { date: 'desc' },
      take: 30
    });

    return NextResponse.json({
      success: true,
      data: {
        scores: scores.map(score => ({
          date: score.date,
          score: score.score,
          factorCount: score.factorCount,
          aboveThreshold: score.aboveThreshold,
          breakdown: score.breakdown ? JSON.parse(score.breakdown) : {}
        })),
        factorData: factorData.map(data => ({
          date: data.date,
          close: data.close,
          pctChange: data.pctChange,
          factors: {
            volume_spike: data.volumeSpike,
            market_up: data.marketUp,
            earnings_window: data.earningsWindow,
            break_ma50: data.breakMa50,
            break_ma200: data.breakMa200,
            rsi_over_60: data.rsiOver60
          }
        })),
        totalDays: scores.length,
        highScoreDays: scores.filter(s => s.aboveThreshold).length
      }
    });

  } catch (error) {
    console.error('Error fetching daily scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily scores' },
      { status: 500 }
    );
  }
}
