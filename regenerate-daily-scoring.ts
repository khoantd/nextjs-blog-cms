#!/usr/bin/env tsx

/**
 * Script to regenerate daily scoring data for a specific stock analysis
 * This bypasses authentication for testing purposes
 */

import { config } from 'dotenv';
// Load environment variables from .env.local
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { performFactorAnalysis } from './lib/services/stock-factor-service';

const prisma = new PrismaClient();

async function regenerateDailyScoring(analysisId: number) {
  try {
    console.log(`🔄 Starting regeneration of daily scoring for analysis ${analysisId}...`);
    
    // Get the stock analysis
    const stockAnalysis = await prisma.stockAnalysis.findUnique({
      where: { id: analysisId }
    });
    
    if (!stockAnalysis) {
      console.error('❌ Stock analysis not found');
      return;
    }
    
    console.log(`📊 Found analysis: ID=${stockAnalysis.id}, symbol=${stockAnalysis.symbol}`);
    
    // Check if daily scoring data exists
    const existingScores = await prisma.dailyScore.findMany({
      where: { stockAnalysisId: analysisId }
    });
    
    if (existingScores.length === 0) {
      console.log('ℹ️ No daily scoring data exists to regenerate. Use generate endpoint instead.');
      return;
    }
    
    console.log(`🗑️ Found ${existingScores.length} existing daily scores to delete`);
    
    // Delete existing daily scores
    const deletedScores = await prisma.dailyScore.deleteMany({
      where: { stockAnalysisId: analysisId }
    });
    
    console.log(`🗑️ Deleted ${deletedScores.count} existing daily scores`);
    
    // Get existing factor data
    const existingFactorData = await prisma.dailyFactorData.findMany({
      where: { stockAnalysisId: analysisId },
      orderBy: { date: 'desc' }
    });
    
    if (existingFactorData.length === 0) {
      console.error('❌ No factor data found. Cannot regenerate daily scoring without factor data.');
      return;
    }
    
    console.log(`📋 Using ${existingFactorData.length} days of existing factor data`);
    
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
    console.log(`📊 Summary:`);
    console.log(`   Total days: ${scoreSummary.totalDays}`);
    console.log(`   High score days: ${scoreSummary.highScoreDays}`);
    console.log(`   Success rate: ${scoreSummary.highScorePercentage.toFixed(1)}%`);
    console.log(`   Average score: ${scoreSummary.averageScore.toFixed(3)}`);
    console.log(`   Score range: ${scoreSummary.minScore.toFixed(3)} - ${scoreSummary.maxScore.toFixed(3)}`);
    
    console.log('\n🎉 Daily scoring data regeneration completed!');
    
  } catch (error) {
    console.error('❌ Error regenerating daily scoring data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get analysis ID from command line arguments
const analysisId = parseInt(process.argv[2]);
if (isNaN(analysisId)) {
  console.log('Usage: npx tsx regenerate-daily-scoring.ts <analysisId>');
  console.log('Available analyses:');
  
  // List available analyses
  const analyses = await prisma.stockAnalysis.findMany({
    select: { id: true, symbol: true, createdAt: true },
    orderBy: { id: 'desc' }
  });
  
  analyses.forEach(a => {
    console.log(`  ID: ${a.id}, Symbol: ${a.symbol}`);
  });
  
  await prisma.$disconnect();
  process.exit(1);
}

regenerateDailyScoring(analysisId);
