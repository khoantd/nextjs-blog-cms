import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from "@/lib/auth-utils";
import { canViewStockAnalyses } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { performFactorAnalysis } from '@/lib/services/stock-factor-service';

/**
 * POST /api/stock-analyses/[id]/regenerate-daily-scoring
 * Force regeneration of daily scoring data by deleting existing data and regenerating
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has permission to view stock analyses
    if (!canViewStockAnalyses(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to regenerate daily scoring" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const analysisId = parseInt(id);
    if (isNaN(analysisId)) {
      return NextResponse.json(
        { error: "Invalid analysis ID" },
        { status: 400 }
      );
    }

    // Get the stock analysis from database
    const stockAnalysis = await prisma.stockAnalysis.findUnique({
      where: { id: analysisId }
    });

    if (!stockAnalysis) {
      return NextResponse.json(
        { error: "Stock analysis not found" },
        { status: 404 }
      );
    }

    // Check if daily scoring data exists
    const existingScores = await prisma.dailyScore.findMany({
      where: { stockAnalysisId: analysisId }
    });

    if (existingScores.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No daily scoring data exists to regenerate. Use generate endpoint instead.",
        action: "generate"
      });
    }

    // Get existing factor data
    const existingFactorData = await prisma.dailyFactorData.findMany({
      where: { stockAnalysisId: analysisId },
      orderBy: { date: 'desc' }
    });

    if (existingFactorData.length === 0) {
      return NextResponse.json(
        { error: "No factor data found. Cannot regenerate daily scoring without factor data." },
        { status: 400 }
      );
    }

    // Check for rate limiting - only allow regeneration once per hour per analysis
    // unless user has admin privileges to bypass cooldown
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRegeneration = await prisma.dailyScore.findFirst({
      where: {
        stockAnalysisId: analysisId,
        updatedAt: {
          gte: oneHourAgo
        }
      }
    });

    // Check if user can bypass cooldown (admin role)
    const canBypassCooldown = user.role === 'admin';

    if (recentRegeneration && !canBypassCooldown) {
      const timeUntilNextRegeneration = Math.ceil(
        (60 * 60 * 1000 - (Date.now() - recentRegeneration.updatedAt.getTime())) / (60 * 1000)
      );
      
      return NextResponse.json({
        success: false,
        error: "Rate limit exceeded",
        message: `Daily scoring was recently regenerated. Please wait ${timeUntilNextRegeneration} minutes before regenerating again.`,
        cooldownMinutes: timeUntilNextRegeneration,
        canBypassCooldown: false
      }, { status: 429 });
    }

    if (recentRegeneration && canBypassCooldown) {
      console.log(`⚠️ Admin user ${user.email} bypassing cooldown for analysis ${analysisId}`);
    }

    console.log(`🔄 Starting regeneration of daily scoring for analysis ${analysisId}...`);

    // Delete existing daily scores
    const deletedScores = await prisma.dailyScore.deleteMany({
      where: { stockAnalysisId: analysisId }
    });

    console.log(`🗑️ Deleted ${deletedScores.count} existing daily scores`);

    // Generate new daily scoring data from existing factor data
    const factorAnalyses = existingFactorData.map((day: any) => ({
      date: day.date,
      factors: {
        volume_spike: day.volumeSpike,
        market_up: day.marketUp,
        earnings_window: day.earningsWindow,
        break_ma50: day.breakMa50,
        rsi_over_60: day.rsiOver60,
        sector_up: day.sectorUp,
        break_ma200: day.breakMa200,
        news_positive: day.newsPositive,
        short_covering: day.shortCovering,
        macro_tailwind: day.macroTailwind
      },
      factorCount: [
        day.volumeSpike, day.marketUp, day.earningsWindow, day.breakMa50,
        day.rsiOver60, day.sectorUp, day.breakMa200, day.newsPositive,
        day.shortCovering, day.macroTailwind
      ].filter(Boolean).length
    }));

    // Calculate daily scores with default configuration
    const { dailyScores, scoreSummary } = performFactorAnalysis(
      existingFactorData.map((day: any) => ({
        Date: day.date,
        Close: day.close,
        Open: day.open,
        High: day.high,
        Low: day.low,
        Volume: day.volume,
        pct_change: day.pctChange,
        ma20: day.ma20,
        ma50: day.ma50,
        ma200: day.ma200,
        rsi: day.rsi,
        volume_spike: day.volumeSpike,
        market_up: day.marketUp,
        earnings_window: day.earningsWindow,
        break_ma50: day.breakMa50,
        break_ma200: day.breakMa200,
        rsi_over_60: day.rsiOver60,
        sector_up: day.sectorUp,
        news_positive: day.newsPositive,
        short_covering: day.shortCovering,
        macro_tailwind: day.macroTailwind
      })),
      {
        scoreConfig: {
          weights: {
            volume_spike: 0.2,
            market_up: 0.15,
            earnings_window: 0.15,
            break_ma50: 0.15,
            rsi_over_60: 0.1,
            sector_up: 0.1,
            break_ma200: 0.05,
            news_positive: 0.05,
            short_covering: 0.03,
            macro_tailwind: 0.02
          },
          threshold: 0.3,
          minFactorsRequired: 2
        }
      }
    );

    // Save new daily scores to database
    const dailyScoresToSave = dailyScores.map((score: any) => ({
      stockAnalysisId: analysisId,
      date: score.date,
      score: score.score,
      factorCount: score.factorCount,
      aboveThreshold: score.aboveThreshold,
      breakdown: JSON.stringify(score.breakdown)
    }));

    // Bulk insert new daily scores
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

    console.log(`✅ Successfully regenerated ${dailyScoresToSave.length} daily scores`);

    return NextResponse.json({
      success: true,
      message: `Successfully regenerated daily scoring data for ${dailyScoresToSave.length} days`,
      data: {
        totalDays: dailyScoresToSave.length,
        highScoreDays: scoreSummary.highScoreDays,
        successRate: scoreSummary.highScorePercentage,
        averageScore: scoreSummary.averageScore,
        maxScore: scoreSummary.maxScore,
        minScore: scoreSummary.minScore,
        previousDataDeleted: deletedScores.count,
        regeneratedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error regenerating daily scoring data:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate daily scoring data' },
      { status: 500 }
    );
  }
}
