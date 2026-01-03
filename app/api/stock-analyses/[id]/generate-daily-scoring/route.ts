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
      // Generate factor data from existing transaction data in database
      console.log('Generating factor data from database transactions...');
      
      // Get transaction data from factor table
      const transactionData = await prisma.factorTable.findMany({
        where: { stockAnalysisId: analysisId },
        orderBy: { transactionId: 'asc' }
      });

      if (transactionData.length === 0) {
        return NextResponse.json(
          { error: "No transaction data found for this analysis" },
          { status: 404 }
        );
      }

      // Parse factor data and convert to daily format
      const dailyDataMap = new Map();
      
      transactionData.forEach((transaction: any) => {
        const factors = JSON.parse(transaction.factorData);
        const date = transaction.date;
        
        if (!dailyDataMap.has(date)) {
          dailyDataMap.set(date, {
            Date: date,
            factors: [],
            factorCount: 0,
            aboveThreshold: false
          });
        }
        
        const dayData = dailyDataMap.get(date);
        dayData.factors.push(factors);
        
        // Count active factors for this transaction
        const activeFactors = Object.entries(factors).filter(([_, value]) => value === true || value === 1);
        dayData.factorCount += activeFactors.length;
      });

      // Convert map to array and calculate daily scores
      const dailyData = Array.from(dailyDataMap.values()).map(day => ({
        date: day.Date,
        factors: day.factors[0] || {}, // Use first transaction's factors as representative
        factorCount: day.factorCount,
        aboveThreshold: day.factorCount >= 2 // Example threshold
      }));

      // Save factor data to database
      const factorDataToSave = dailyData.map((day: any) => ({
        stockAnalysisId: analysisId,
        date: day.date,
        close: 0, // Will be updated if available
        open: 0,
        high: 0,
        low: 0,
        volume: 0,
        pctChange: 0,
        ma20: null,
        ma50: null,
        ma200: null,
        rsi: null,
        volumeSpike: day.factors.volume_spike === true || day.factors.volume_spike === 1,
        marketUp: day.factors.market_up === true || day.factors.market_up === 1,
        sectorUp: day.factors.sector_up === true || day.factors.sector_up === 1,
        earningsWindow: day.factors.earnings_window === true || day.factors.earnings_window === 1,
        breakMa50: day.factors.break_ma50 === true || day.factors.break_ma50 === 1,
        breakMa200: day.factors.break_ma200 === true || day.factors.break_ma200 === 1,
        rsiOver60: day.factors.rsi_over_60 === true || day.factors.rsi_over_60 === 1,
        newsPositive: day.factors.news_positive === true || day.factors.news_positive === 1,
        shortCovering: day.factors.short_covering === true || day.factors.short_covering === 1,
        macroTailwind: day.factors.macro_tailwind === true || day.factors.macro_tailwind === 1
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

      // Retrieve the saved factor data
      factorData = await prisma.dailyFactorData.findMany({
        where: { stockAnalysisId: analysisId },
        orderBy: { date: 'desc' }
      });
      console.log(`Generated and saved ${factorData.length} days of factor data from database`);
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
