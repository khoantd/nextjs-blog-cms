import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from "@/lib/auth-utils";
import { canViewStockAnalyses } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { performFactorAnalysis, parseStockCSV, calculatePctChanges } from '@/lib/services/stock-factor-service';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * POST /api/stock-analyses/[id]/generate-daily-scoring
 * Generate daily scoring data from existing stock analysis
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
        { error: "Insufficient permissions to generate daily scoring" },
        { status: 403 }
      );
    }

    const analysisId = parseInt(params.id);
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

    // Check if daily scoring data already exists
    const existingScores = await prisma.dailyScore.findMany({
      where: { stockAnalysisId: analysisId }
    });

    if (existingScores.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Daily scoring data already exists (${existingScores.length} days)`,
        fromCache: true,
        data: {
          totalDays: existingScores.length,
          highScoreDays: existingScores.filter(s => s.aboveThreshold).length
        }
      });
    }

    // Check if factor data exists, if not generate it first
    const existingFactorData = await prisma.dailyFactorData.findMany({
      where: { stockAnalysisId: analysisId }
    });

    let factorData = existingFactorData;

    if (existingFactorData.length === 0) {
      // Generate factor data from CSV
      if (!stockAnalysis.csvFilePath) {
        return NextResponse.json(
          { error: "No CSV file found for this analysis" },
          { status: 404 }
        );
      }

      console.log('Generating factor data from CSV...');
      
      // Read and parse CSV
      const csvPath = join(process.cwd(), stockAnalysis.csvFilePath);
      const csvContent = readFileSync(csvPath, 'utf-8');
      const stockData = parseStockCSV(csvContent);
      const dataWithPctChange = calculatePctChanges(stockData);

      // Perform factor analysis
      const factorAnalysis = performFactorAnalysis(dataWithPctChange, {
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
      });

      // Save factor data to database
      const factorDataToSave = factorAnalysis.enrichedData.map((day: any) => ({
        stockAnalysisId: analysisId,
        date: day.Date,
        close: day.Close,
        open: day.Open,
        high: day.High,
        low: day.Low,
        volume: day.Volume,
        pctChange: day.pct_change,
        ma20: day.ma20,
        ma50: day.ma50,
        ma200: day.ma200,
        rsi: day.rsi,
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

      // Bulk insert factor data
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

      factorData = factorDataToSave;
      console.log(`Generated and saved ${factorData.length} days of factor data`);
    } else {
      console.log(`Using existing factor data (${existingFactorData.length} days)`);
    }

    // Generate daily scoring data from factor data
    console.log('Generating daily scoring data...');
    
    // Convert factor data to the format expected by the scoring system
    const factorAnalyses = factorData.map((day: any) => ({
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
      ].filter(Boolean).length,
      factorList: [
        ...(day.volumeSpike ? ['volume_spike'] : []),
        ...(day.marketUp ? ['market_up'] : []),
        ...(day.earningsWindow ? ['earnings_window'] : []),
        ...(day.breakMa50 ? ['break_ma50'] : []),
        ...(day.rsiOver60 ? ['rsi_over_60'] : []),
        ...(day.sectorUp ? ['sector_up'] : []),
        ...(day.breakMa200 ? ['break_ma200'] : []),
        ...(day.newsPositive ? ['news_positive'] : []),
        ...(day.shortCovering ? ['short_covering'] : []),
        ...(day.macroTailwind ? ['macro_tailwind'] : [])
      ]
    }));

    // Calculate daily scores
    const { dailyScores, scoreSummary } = performFactorAnalysis(
      factorData.map((day: any) => ({
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

    // Save daily scores to database
    const dailyScoresToSave = dailyScores.map((score: any) => ({
      stockAnalysisId: analysisId,
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

    console.log(`Generated and saved ${dailyScoresToSave.length} daily scores`);

    return NextResponse.json({
      success: true,
      message: `Successfully generated daily scoring data for ${dailyScoresToSave.length} days`,
      fromCache: false,
      data: {
        totalDays: dailyScoresToSave.length,
        highScoreDays: scoreSummary.highScoreDays,
        successRate: scoreSummary.highScorePercentage,
        averageScore: scoreSummary.averageScore,
        maxScore: scoreSummary.maxScore,
        minScore: scoreSummary.minScore
      }
    });

  } catch (error) {
    console.error('Error generating daily scoring data:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily scoring data' },
      { status: 500 }
    );
  }
}
