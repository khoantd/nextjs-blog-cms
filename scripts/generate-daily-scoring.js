#!/usr/bin/env node

/**
 * Script to generate daily scoring data for SNAP analysis
 * This bypasses authentication for testing purposes
 */

const { PrismaClient } = require('@prisma/client');
const { performFactorAnalysis, parseStockCSV, calculatePctChanges } = require('../lib/services/stock-factor-service');
const { readFileSync } = require('fs');
const { join } = require('path');

const prisma = new PrismaClient();

async function generateDailyScoring() {
  try {
    console.log('🎯 Generating daily scoring data for SNAP...\n');

    // Get the latest SNAP analysis
    const stockAnalysis = await prisma.stockAnalysis.findFirst({
      where: { symbol: 'SNAP' },
      orderBy: { id: 'desc' }
    });

    if (!stockAnalysis) {
      console.error('❌ No SNAP analysis found');
      process.exit(1);
    }

    console.log(`📊 Found analysis: ID=${stockAnalysis.id}, symbol=${stockAnalysis.symbol}`);

    // Check if daily scoring data already exists
    const existingScores = await prisma.dailyScore.findMany({
      where: { stockAnalysisId: stockAnalysis.id }
    });

    if (existingScores.length > 0) {
      console.log(`✅ Daily scoring data already exists (${existingScores.length} days)`);
      const highScoreDays = existingScores.filter(s => s.aboveThreshold).length;
      console.log(`   High score days: ${highScoreDays}/${existingScores.length}`);
      process.exit(0);
    }

    // Check if factor data exists
    const existingFactorData = await prisma.dailyFactorData.findMany({
      where: { stockAnalysisId: stockAnalysis.id }
    });

    let factorData = existingFactorData;

    if (existingFactorData.length === 0) {
      console.log('🔄 Generating factor data from CSV...');
      
      if (!stockAnalysis.csvFilePath) {
        console.error('❌ No CSV file found for this analysis');
        process.exit(1);
      }

      // Read and parse CSV
      const csvPath = join(process.cwd(), stockAnalysis.csvFilePath);
      const csvContent = readFileSync(csvPath, 'utf-8');
      const stockData = parseStockCSV(csvContent);
      const dataWithPctChange = calculatePctChanges(stockData);

      console.log(`📈 Parsed ${stockData.length} days of stock data`);

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
      const factorDataToSave = factorAnalysis.enrichedData.map((day) => ({
        stockAnalysisId: stockAnalysis.id,
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
      console.log(`✅ Generated and saved ${factorData.length} days of factor data`);
    } else {
      console.log(`📋 Using existing factor data (${existingFactorData.length} days)`);
    }

    // Generate daily scoring data
    console.log('🔄 Generating daily scoring data...');
    
    const { dailyScores, scoreSummary } = performFactorAnalysis(
      factorData.map((day) => ({
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
    const dailyScoresToSave = dailyScores.map((score) => ({
      stockAnalysisId: stockAnalysis.id,
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

    console.log(`✅ Generated and saved ${dailyScoresToSave.length} daily scores`);
    console.log(`📊 Summary:`);
    console.log(`   Total days: ${scoreSummary.totalDays}`);
    console.log(`   High score days: ${scoreSummary.highScoreDays}`);
    console.log(`   Success rate: ${scoreSummary.highScorePercentage.toFixed(1)}%`);
    console.log(`   Average score: ${scoreSummary.averageScore.toFixed(3)}`);
    console.log(`   Score range: ${scoreSummary.minScore.toFixed(3)} - ${scoreSummary.maxScore.toFixed(3)}`);

    console.log('\n🎉 Daily scoring data generation completed!');

  } catch (error) {
    console.error('❌ Error generating daily scoring data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateDailyScoring();
