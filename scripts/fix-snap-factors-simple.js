#!/usr/bin/env node

/**
 * Fix SNAP factor analysis by clearing data and triggering regeneration via API
 */

const { PrismaClient } = require('@prisma/client');
const { readFileSync } = require('fs');

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
    
    // Clear existing factor data for this analysis using raw SQL
    console.log('🧹 Clearing existing factor data...');
    await prisma.$executeRaw`DELETE FROM daily_factor_data WHERE stock_analysis_id = ${snapAnalysis.id}`;
    await prisma.$executeRaw`DELETE FROM daily_scores WHERE stock_analysis_id = ${snapAnalysis.id}`;
    await prisma.$executeRaw`DELETE FROM factor_tables WHERE stock_analysis_id = ${snapAnalysis.id}`;
    
    console.log('✅ Cleared existing factor data');
    console.log('\n📝 Next steps:');
    console.log('1. Go to the SNAP analysis page in the browser');
    console.log('2. Navigate to the "Factor Analysis" tab');
    console.log('3. Click "Generate Factors" to regenerate with corrected logic');
    console.log(`4. Analysis ID: ${snapAnalysis.id}`);
    
    console.log('\n🎉 SNAP factor data cleared. Ready for regeneration!');
    
  } catch (error) {
    console.error('❌ Error fixing SNAP factors:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixSnapFactors();
