#!/usr/bin/env tsx

/**
 * Script to fix VND stock data by loading from CSV into database
 * and regenerating factor analysis
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { calculateMA, calculateRSI } from '../lib/stock-factors';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

interface CSVData {
  date: string;
  ticket: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fixVNDData() {
  try {
    console.log('🔧 Fixing VND stock data...');
    
    // Find VND stock analysis
    const stockAnalysis = await prisma.stockAnalysis.findFirst({
      where: { symbol: 'VND' }
    });

    if (!stockAnalysis) {
      console.error('❌ VND stock analysis not found');
      return;
    }

    console.log(`📊 Found VND analysis: ${stockAnalysis.name} (ID: ${stockAnalysis.id})`);

    // Read CSV file
    const csvPath = '/Volumes/Data/Nodejs/inngest-example-1/nextjs-blog-cms/uploads/stock-csvs/VND_1767442458341.csv';
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found:', csvPath);
      return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records: CSVData[] = await new Promise((resolve, reject) => {
      parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        cast: false, // Disable automatic casting
        trim: true
      }, (err, data: any) => {
        if (err) reject(err);
        else {
          // Manually cast the data
          const processedData = data.map((row: any) => ({
            date: row.date,
            ticket: row.ticket,
            open: parseFloat(row.open) || 0,
            high: parseFloat(row.high) || 0,
            low: parseFloat(row.low) || 0,
            close: parseFloat(row.close) || 0,
            volume: parseInt(row.volume) || 0
          }));
          resolve(processedData);
        }
      });
    });

    console.log(`📁 Loaded ${records.length} records from CSV`);

    // Convert date format from MM/DD/YYYY to YYYY-MM-DD
    const processedData = records.map(record => {
      const [month, day, year] = record.date.split('/');
      const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      return {
        ...record,
        date: formattedDate,
        stockAnalysisId: stockAnalysis.id
      };
    }).reverse(); // Reverse to chronological order

    console.log('🔄 Processing data and calculating technical indicators...');

    // Calculate technical indicators
    const dataWithIndicators = processedData.map((record, index) => {
      const closes = processedData.slice(0, index + 1).map(r => r.close);
      const volumes = processedData.slice(0, index + 1).map(r => r.volume);
      
      const pctChange = index > 0 ? ((record.close - processedData[index - 1].close) / processedData[index - 1].close) * 100 : 0;
      
      const ma20Result = Array.isArray(closes) && closes.length >= 20 ? calculateMA(closes, 20) : null;
      const ma50Result = Array.isArray(closes) && closes.length >= 50 ? calculateMA(closes, 50) : null;
      const ma200Result = Array.isArray(closes) && closes.length >= 200 ? calculateMA(closes, 200) : null;
      const rsiResult = Array.isArray(closes) && closes.length >= 14 ? calculateRSI(closes, 14) : null;
      
      return {
        ...record,
        pctChange,
        ma20: ma20Result && ma20Result.length > 0 ? ma20Result[ma20Result.length - 1] : null,
        ma50: ma50Result && ma50Result.length > 0 ? ma50Result[ma50Result.length - 1] : null,
        ma200: ma200Result && ma200Result.length > 0 ? ma200Result[ma200Result.length - 1] : null,
        rsi: rsiResult && rsiResult.length > 0 ? rsiResult[rsiResult.length - 1] : null,
      };
    });

    // Clear existing factor data
    console.log('🗑️ Clearing existing factor data...');
    await prisma.dailyFactorData.deleteMany({
      where: { stockAnalysisId: stockAnalysis.id }
    });

    // Insert new factor data
    console.log('💾 Inserting new factor data...');
    for (const record of dataWithIndicators) {
      await prisma.dailyFactorData.create({
        data: {
          stockAnalysisId: record.stockAnalysisId,
          date: record.date,
          open: record.open,
          high: record.high,
          low: record.low,
          close: record.close,
          volume: record.volume,
          pctChange: record.pctChange,
          ma20: record.ma20,
          ma50: record.ma50,
          ma200: record.ma200,
          rsi: record.rsi,
          // Initialize factors as 0, will be calculated later
          volumeSpike: false,
          marketUp: false,
          earningsWindow: false,
          breakMa50: false,
          rsiOver60: false,
          sectorUp: false,
          breakMa200: false,
          newsPositive: false,
          shortCovering: false,
          macroTailwind: false,
        }
      });
    }

    console.log(`✅ Successfully loaded ${dataWithIndicators.length} records into database`);

    // Now run factor analysis
    console.log('🔍 Running factor analysis...');
    const { performFactorAnalysis } = await import('../lib/services/stock-factor-service');
    
    const factorData = await prisma.dailyFactorData.findMany({
      where: { stockAnalysisId: stockAnalysis.id },
      orderBy: { date: 'asc' }
    });

    const stockData = factorData.map(day => ({
      Date: day.date,
      Close: day.close,
      Open: day.open || 0,
      High: day.high || 0,
      Low: day.low || 0,
      Volume: day.volume || 0,
      pct_change: day.pctChange || 0,
      ma20: day.ma20 || undefined,
      ma50: day.ma50 || undefined,
      ma200: day.ma200 || undefined,
      rsi: day.rsi || undefined,
      volume_spike: day.volumeSpike || false,
      market_up: day.marketUp || false,
      earnings_window: day.earningsWindow || false,
      break_ma50: day.breakMa50 || false,
      break_ma200: day.breakMa200 || false,
      rsi_over_60: day.rsiOver60 || false,
      sector_up: day.sectorUp || false,
      news_positive: day.newsPositive || false,
      short_covering: day.shortCovering || false,
      macro_tailwind: day.macroTailwind || false
    }));

    const { dailyScores, scoreSummary } = performFactorAnalysis(stockData);

    // Update factor data with calculated factors
    console.log('📊 Updating factor data with calculated factors...');
    for (let i = 0; i < factorData.length; i++) {
      const day = factorData[i];
      const analysis = stockData[i];
      
      await prisma.dailyFactorData.update({
        where: {
          stockAnalysisId_date: {
            stockAnalysisId: day.stockAnalysisId,
            date: day.date
          }
        },
        data: {
          volumeSpike: analysis.volume_spike,
          marketUp: analysis.market_up,
          earningsWindow: analysis.earnings_window,
          breakMa50: analysis.break_ma50,
          rsiOver60: analysis.rsi_over_60,
          sectorUp: analysis.sector_up,
          breakMa200: analysis.break_ma200,
          newsPositive: analysis.news_positive,
          shortCovering: analysis.short_covering,
          macroTailwind: analysis.macro_tailwind,
        }
      });
    }

    // Clear and regenerate daily scores
    console.log('🔄 Regenerating daily scores...');
    await prisma.dailyScore.deleteMany({
      where: { stockAnalysisId: stockAnalysis.id }
    });

    for (const score of dailyScores) {
      await prisma.dailyScore.create({
        data: {
          stockAnalysisId: stockAnalysis.id,
          date: score.date,
          score: score.score,
          factorCount: score.factorCount,
          aboveThreshold: score.aboveThreshold,
          breakdown: JSON.stringify(score.breakdown)
        }
      });
    }

    console.log('✅ VND data fix completed successfully!');
    console.log(`📈 Summary: ${scoreSummary.highScoreDays} high-score days out of ${dailyScores.length} total days`);
    console.log(`📊 Average score: ${scoreSummary.averageScore.toFixed(3)}`);
    console.log(`🎯 Success rate: ${scoreSummary.highScorePercentage.toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error fixing VND data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixVNDData();
