#!/usr/bin/env node

/**
 * Test script to verify the improved factor data flow
 * This tests the unified factor generation for SNAP stock
 */

const { PrismaClient } = require('@prisma/client');
const { readFileSync } = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function testFactorDataFlow() {
  try {
    console.log('🧪 Testing improved factor data flow...\n');

    // 1. Check existing SNAP analyses
    console.log('📊 Checking existing SNAP analyses...');
    const snapAnalyses = await prisma.stockAnalysis.findMany({
      where: { symbol: 'SNAP' },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${snapAnalyses.length} SNAP analyses:`);
    snapAnalyses.forEach(analysis => {
      console.log(`  - ID: ${analysis.id}, Status: ${analysis.status}, CSV: ${analysis.csvFilePath || 'None'}`);
    });

    if (snapAnalyses.length === 0) {
      console.log('❌ No SNAP analyses found. Please create one first.');
      return;
    }

    // 2. Test the most recent analysis
    const latestAnalysis = snapAnalyses[0];
    console.log(`\n🔍 Testing analysis ID: ${latestAnalysis.id}`);

    // 3. Check factor data
    console.log('\n📈 Checking factor data...');
    const factorDataCount = await prisma.dailyFactorData.count({
      where: { stockAnalysisId: latestAnalysis.id }
    });
    console.log(`Daily factor data records: ${factorDataCount}`);

    const dailyScoresCount = await prisma.dailyScore.count({
      where: { stockAnalysisId: latestAnalysis.id }
    });
    console.log(`Daily scores records: ${dailyScoresCount}`);

    const factorTableCount = await prisma.factorTable.count({
      where: { stockAnalysisId: latestAnalysis.id }
    });
    console.log(`Factor table records: ${factorTableCount}`);

    // 4. Check for actual factor values
    if (factorDataCount > 0) {
      console.log('\n🔍 Checking factor values...');
      const sampleFactorData = await prisma.dailyFactorData.findFirst({
        where: { stockAnalysisId: latestAnalysis.id },
        orderBy: { date: 'asc' }
      });

      if (sampleFactorData) {
        console.log(`Sample factor data for ${sampleFactorData.date}:`);
        console.log(`  - Close: ${sampleFactorData.close}`);
        console.log(`  - MA20: ${sampleFactorData.ma20 || 'NULL'}`);
        console.log(`  - MA50: ${sampleFactorData.ma50 || 'NULL'}`);
        console.log(`  - MA200: ${sampleFactorData.ma200 || 'NULL'}`);
        console.log(`  - RSI: ${sampleFactorData.rsi || 'NULL'}`);
        console.log(`  - Volume Spike: ${sampleFactorData.volumeSpike}`);
        console.log(`  - Break MA50: ${sampleFactorData.breakMa50}`);
        console.log(`  - RSI > 60: ${sampleFactorData.rsiOver60}`);
        
        // Count active factors
        const activeFactors = [
          sampleFactorData.volumeSpike,
          sampleFactorData.marketUp,
          sampleFactorData.sectorUp,
          sampleFactorData.earningsWindow,
          sampleFactorData.breakMa50,
          sampleFactorData.breakMa200,
          sampleFactorData.rsiOver60,
          sampleFactorData.newsPositive,
          sampleFactorData.shortCovering,
          sampleFactorData.macroTailwind
        ].filter(Boolean).length;
        
        console.log(`  - Active factors: ${activeFactors}/10`);
      }
    }

    // 5. Check daily scores
    if (dailyScoresCount > 0) {
      console.log('\n📊 Checking daily scores...');
      const highScoreDays = await prisma.dailyScore.count({
        where: { 
          stockAnalysisId: latestAnalysis.id,
          aboveThreshold: true 
        }
      });
      console.log(`High-score days (above threshold): ${highScoreDays}/${dailyScoresCount}`);
      
      const avgScore = await prisma.dailyScore.aggregate({
        where: { stockAnalysisId: latestAnalysis.id },
        _avg: { score: true }
      });
      console.log(`Average score: ${avgScore._avg.score?.toFixed(3) || 'N/A'}`);
    }

    // 6. Summary
    console.log('\n📋 Summary:');
    console.log(`✅ Factor data flow test completed`);
    console.log(`📊 Analysis ID: ${latestAnalysis.id}`);
    console.log(`📈 Status: ${latestAnalysis.status}`);
    console.log(`🔢 Factor records: ${factorDataCount}`);
    console.log(`💯 Score records: ${dailyScoresCount}`);
    console.log(`📋 Table records: ${factorTableCount}`);

    if (factorDataCount === 0 || dailyScoresCount === 0) {
      console.log('\n⚠️  Factor data is missing. The improved flow should fix this.');
      console.log('💡 Try creating a new stock analysis to test the unified flow.');
    } else if (factorDataCount > 0 && latestAnalysis.status === 'completed') {
      console.log('\n🎉 Factor data flow is working correctly!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testFactorDataFlow();
