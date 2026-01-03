#!/usr/bin/env node

/**
 * Direct SNAP factor generation using the service functions
 */

const { PrismaClient } = require('@prisma/client');
const { readFileSync } = require('fs');
const path = require('path');

// Import the service functions directly
const stockFactorServicePath = path.join(__dirname, '../lib/services/stock-factor-service.ts');

async function generateSnapFactors() {
  let prisma;
  
  try {
    console.log('🔄 Generating SNAP factors directly...');
    
    // Initialize Prisma
    prisma = new PrismaClient();
    
    // Get SNAP analysis
    const snapAnalysis = await prisma.stockAnalyses.findFirst({
      where: { symbol: 'SNAP' },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!snapAnalysis) {
      console.error('❌ No SNAP analysis found');
      process.exit(1);
    }
    
    console.log(`📊 Found SNAP analysis ID: ${snapAnalysis.id}`);
    
    // Read CSV file
    if (!snapAnalysis.csvFilePath) {
      console.error('❌ No CSV file path found');
      process.exit(1);
    }
    
    const csvContent = readFileSync(snapAnalysis.csvFilePath, 'utf-8');
    console.log(`📁 Loaded CSV: ${snapAnalysis.csvFilePath}`);
    
    // Parse analysis results
    const analysisResults = snapAnalysis.analysisResults 
      ? JSON.parse(snapAnalysis.analysisResults) 
      : null;
    
    if (!analysisResults) {
      console.error('❌ No analysis results found');
      process.exit(1);
    }
    
    console.log(`📈 Analysis has ${analysisResults.transactionsFound} transactions`);
    
    // Import the service dynamically
    const { saveFactorAnalysisToDatabase } = await import('../lib/services/stock-factor-service');
    
    // Generate factor analysis
    console.log('🔄 Generating factor analysis...');
    const result = await saveFactorAnalysisToDatabase(
      snapAnalysis.id,
      csvContent,
      analysisResults
    );
    
    console.log('✅ Successfully generated factor analysis:');
    console.log(`  - Daily factor data: ${result.dailyFactorDataCount} days`);
    console.log(`  - Daily scores: ${result.dailyScoresCount} scores`);
    console.log(`  - Factor table: ${result.factorTableCount} transactions`);
    
    // Verify the results
    const factorData = await prisma.$queryRaw`
      SELECT date, volume, ma50, ma200, rsi, volume_spike, break_ma50, break_ma200, rsi_over_60
      FROM daily_factor_data 
      WHERE stock_analysis_id = ${snapAnalysis.id} 
      LIMIT 5
    `;
    
    console.log('\n📋 Sample factor data:');
    factorData.forEach(data => {
      console.log(`${data.date}: Volume=${data.volume}, MA50=${data.ma50?.toFixed(2)}, MA200=${data.ma200?.toFixed(2)}, RSI=${data.rsi?.toFixed(2)}`);
      console.log(`  Factors: VolumeSpike=${data.volume_spike}, BreakMA50=${data.break_ma50}, BreakMA200=${data.break_ma200}, RSI>60=${data.rsi_over_60}`);
    });
    
    const scores = await prisma.$queryRaw`
      SELECT date, score, factor_count, above_threshold
      FROM daily_scores 
      WHERE stock_analysis_id = ${snapAnalysis.id} 
      LIMIT 5
    `;
    
    console.log('\n📊 Sample daily scores:');
    scores.forEach(score => {
      console.log(`${score.date}: Score=${score.score.toFixed(3)}, Factors=${score.factor_count}, AboveThreshold=${score.above_threshold}`);
    });
    
    // Check if we have any active factors
    const activeFactors = await prisma.$queryRaw`
      SELECT 
        SUM(CASE WHEN volume_spike = 1 THEN 1 ELSE 0 END) as volume_spike_count,
        SUM(CASE WHEN break_ma50 = 1 THEN 1 ELSE 0 END) as break_ma50_count,
        SUM(CASE WHEN break_ma200 = 1 THEN 1 ELSE 0 END) as break_ma200_count,
        SUM(CASE WHEN rsi_over_60 = 1 THEN 1 ELSE 0 END) as rsi_over_60_count
      FROM daily_factor_data 
      WHERE stock_analysis_id = ${snapAnalysis.id}
    `;
    
    console.log('\n📈 Active factor counts:');
    console.log(`  Volume Spike: ${activeFactors[0].volume_spike_count}`);
    console.log(`  Break MA50: ${activeFactors[0].break_ma50_count}`);
    console.log(`  Break MA200: ${activeFactors[0].break_ma200_count}`);
    console.log(`  RSI > 60: ${activeFactors[0].rsi_over_60_count}`);
    
    console.log('\n🎉 SNAP factor generation completed!');
    
  } catch (error) {
    console.error('❌ Error generating SNAP factors:', error);
    process.exit(1);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

// Run the generation
generateSnapFactors();
