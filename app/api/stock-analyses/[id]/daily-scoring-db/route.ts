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
      orderBy: { date: 'asc' }
    });

    if (existingScores.length > 0) {
      // Return existing database data immediately
      const factorData = await prisma.dailyFactorData.findMany({
        where: { stockAnalysisId },
        orderBy: { date: 'asc' }
      });

      // Calculate summary from existing data
      const highScoreDays = existingScores.filter(s => s.aboveThreshold).length;
      const totalDays = existingScores.length;
      const averageScore = existingScores.reduce((sum: number, s: any) => sum + s.score, 0) / totalDays;
      const maxScore = Math.max(...existingScores.map((s: any) => s.score));
      const minScore = Math.min(...existingScores.map((s: any) => s.score));

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
          predictions: [], // Empty predictions array for existing data
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
          scoreConfig: DEFAULT_DAILY_SCORE_CONFIG,
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
