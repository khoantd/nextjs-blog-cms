#!/usr/bin/env tsx

/**
 * Fix SNAP factor analysis by regenerating with corrected technical indicators
 */

import { PrismaClient } from '@prisma/client';
import { saveFactorAnalysisToDatabase } from '../lib/services/stock-factor-service';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

async function fixSnapFactors() {
  try {
    console.log('🔧 Fixing SNAP factor analysis...');
    
    // Get SNAP analysis with data
    const snapAnalysis = await prisma.stockAnalysis.findFirst({
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
    
    // Clear existing factor data for this analysis
    console.log('🧹 Clearing existing factor data...');
    await prisma.dailyFactorData.deleteMany({
      where: { stockAnalysisId: snapAnalysis.id }
    });
    
    await prisma.dailyScore.deleteMany({
      where: { stockAnalysisId: snapAnalysis.id }
    });
    
    await prisma.factorTable.deleteMany({
      where: { stockAnalysisId: snapAnalysis.id }
    });
    
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
    
    // Verify the results
    const factorData = await prisma.dailyFactorData.findMany({
      where: { stockAnalysisId: snapAnalysis.id },
      take: 5
    });
    
    console.log('\n📋 Sample factor data:');
    factorData.forEach((data: any) => {
      console.log(`${data.date}: Volume=${data.volume}, MA50=${data.ma50?.toFixed(2)}, MA200=${data.ma200?.toFixed(2)}, RSI=${data.rsi?.toFixed(2)}`);
      console.log(`  Factors: VolumeSpike=${data.volumeSpike}, BreakMA50=${data.breakMa50}, BreakMA200=${data.breakMa200}, RSI>60=${data.rsiOver60}`);
    });
    
    const scores = await prisma.dailyScore.findMany({
      where: { stockAnalysisId: snapAnalysis.id },
      take: 5
    });
    
    console.log('\n📊 Sample daily scores:');
    scores.forEach((score: any) => {
      console.log(`${score.date}: Score=${score.score.toFixed(3)}, Factors=${score.factorCount}, AboveThreshold=${score.aboveThreshold}`);
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
