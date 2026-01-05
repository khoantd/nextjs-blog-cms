#!/usr/bin/env tsx

/**
 * Script to fix all stock data by loading from CSV files into database
 * and regenerating factor analysis for all symbols
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
  ticket?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fixAllStockData() {
  try {
    console.log('🔧 Fixing all stock data...');
    
    // Get all stock analyses
    const stockAnalyses = await prisma.stockAnalysis.findMany({
      where: { status: 'completed' }
    });

    console.log(`📊 Found ${stockAnalyses.length} stock analyses to process`);

    // Get available CSV files
    const csvDir = '/Volumes/Data/Nodejs/inngest-example-1/nextjs-blog-cms/uploads/stock-csvs';
    const csvFiles = fs.readdirSync(csvDir).filter(file => file.endsWith('.csv'));
    
    // Create a map of symbol to CSV file path
    const symbolToCsvMap = new Map<string, string>();
    for (const csvFile of csvFiles) {
      const symbol = csvFile.split('_')[0];
      if (!symbolToCsvMap.has(symbol)) {
        symbolToCsvMap.set(symbol, path.join(csvDir, csvFile));
      }
    }

    console.log(`📁 Found CSV files for symbols: ${Array.from(symbolToCsvMap.keys()).join(', ')}`);

    for (const stockAnalysis of stockAnalyses) {
      const { id, symbol, name } = stockAnalysis;
      console.log(`\n🔄 Processing ${symbol} (${name})...`);

      // Check if we have a CSV file for this symbol
      const csvPath = symbolToCsvMap.get(symbol);
      
      if (!csvPath) {
        console.log(`⚠️ No CSV file found for ${symbol}, skipping...`);
        continue;
      }

      if (!fs.existsSync(csvPath)) {
        console.log(`❌ CSV file not found: ${csvPath}`);
        continue;
      }

      try {
        await processStockData(id, symbol, csvPath);
        console.log(`✅ Successfully processed ${symbol}`);
      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error);
      }
    }

    console.log('\n🎉 All stock data fix completed!');

  } catch (error) {
    console.error('❌ Error in fixAllStockData:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function processStockData(stockAnalysisId: number, symbol: string, csvPath: string) {
  console.log(`📊 Loading ${symbol} data from CSV...`);

  // Read and parse CSV
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records: CSVData[] = await new Promise((resolve, reject) => {
    parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      cast: false,
      trim: true
    }, (err, data: any) => {
      if (err) reject(err);
      else {
        // Handle different CSV formats
        const processedData = data.map((row: any) => {
          // Try different column name variations
          const date = row.date || row.Date || row.DATE;
          const ticket = row.ticket || row.Ticket || row.TICKET || row.symbol || row.Symbol || row.SYMBOL || symbol;
          const open = parseFloat(row.open || row.Open || row.OPEN) || 0;
          const high = parseFloat(row.high || row.High || row.HIGH) || 0;
          const low = parseFloat(row.low || row.Low || row.LOW) || 0;
          const close = parseFloat(row.close || row.Close || row.CLOSE) || 0;
          const volume = parseInt(row.volume || row.Volume || row.VOLUME) || 0;

          return {
            date,
            ticket,
            open,
            high,
            low,
            close,
            volume
          };
        }).filter((row: any) => row.date && !isNaN(row.close) && row.close > 0);
        resolve(processedData);
      }
    });
  });

  console.log(`📁 Loaded ${records.length} valid records from CSV`);

  if (records.length === 0) {
    console.log(`⚠️ No valid records found in CSV for ${symbol}`);
    return;
  }

  // Convert date format and sort
  const processedData = records
    .map(record => {
      let formattedDate = record.date;
      
      // Handle different date formats
      if (record.date.includes('/')) {
        // MM/DD/YYYY format
        const [month, day, year] = record.date.split('/');
        formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (record.date.includes('-')) {
        // Already in YYYY-MM-DD format
        formattedDate = record.date;
      }
      
      return {
        ...record,
        date: formattedDate,
        stockAnalysisId
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date)); // Chronological order

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
    where: { stockAnalysisId }
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
    where: { stockAnalysisId },
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
    where: { stockAnalysisId }
  });

  for (const score of dailyScores) {
    await prisma.dailyScore.create({
      data: {
        stockAnalysisId,
        date: score.date,
        score: score.score,
        factorCount: score.factorCount,
        aboveThreshold: score.aboveThreshold,
        breakdown: JSON.stringify(score.breakdown)
      }
    });
  }

  console.log(`📈 ${symbol} Summary: ${scoreSummary.highScoreDays} high-score days out of ${dailyScores.length} total days`);
  console.log(`📊 Average score: ${scoreSummary.averageScore.toFixed(3)}`);
  console.log(`🎯 Success rate: ${scoreSummary.highScorePercentage.toFixed(1)}%`);
}

// Run the script
fixAllStockData();
