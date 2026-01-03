#!/usr/bin/env node

/**
 * Fix SNAP factor analysis by regenerating with corrected technical indicators
 */

const { PrismaClient } = require('@prisma/client');
const { readFileSync } = require('fs');
const path = require('path');

// Import the service functions
const { saveFactorAnalysisToDatabase } = require('../lib/services/stock-factor-service');

const prisma = new PrismaClient();

async function fixSnapFactors() {
  try {
    console.log('🔧 Fixing SNAP factor analysis...');
    
    // Get SNAP analysis with data
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
    
    // Clear existing factor data for this analysis using raw SQL
    console.log('🧹 Clearing existing factor data...');
    await prisma.$executeRaw`DELETE FROM daily_factor_data WHERE stock_analysis_id = ${snapAnalysis.id}`;
    await prisma.$executeRaw`DELETE FROM daily_scores WHERE stock_analysis_id = ${snapAnalysis.id}`;
    await prisma.$executeRaw`DELETE FROM factor_tables WHERE stock_analysis_id = ${snapAnalysis.id}`;
    
    // Regenerate factor analysis with corrected logic
    console.log('🔄 Regenerating factor analysis...');
    const result = await saveFactorAnalysisToDatabase(
      snapAnalysis.id,
      csvContent,
      analysisResults
    );
    
    console.log('✅ Successfully regenerated factor analysis:');
    console.log(`  - Daily factor data: ${result.dailyFactorDataCount} days`);
    console.log(`  - Daily scores: ${result.dailyScoresCount} scores`);
    console.log(`  - Factor table: ${result.factorTableCount} transactions`);
    
    // Verify the results using raw SQL
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
    
    console.log('\n🎉 SNAP factor analysis fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing SNAP factors:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixSnapFactors();
