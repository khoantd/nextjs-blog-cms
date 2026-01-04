const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function reanalyzeAllSymbols() {
  try {
    const symbols = ['SSI', 'MBB', 'VPB', 'TCB', 'BID'];
    
    for (const symbol of symbols) {
      console.log(`\n=== Processing ${symbol} ===`);
      
      // Find the analysis
      const analysis = await prisma.stockAnalysis.findFirst({
        where: { symbol: symbol }
      });

      if (!analysis) {
        console.log(`❌ ${symbol}: Analysis not found`);
        continue;
      }

      console.log(`✅ ${symbol}: Found analysis ID ${analysis.id}`);
      console.log(`   Current path: ${analysis.csvFilePath}`);

      // Check if CSV file exists
      const fs = require('fs');
      if (!fs.existsSync(analysis.csvFilePath)) {
        console.log(`❌ ${symbol}: CSV file not found at ${analysis.csvFilePath}`);
        
        // Try to find the correct CSV file
        const path = require('path');
        const csvDir = path.join(process.cwd(), 'uploads/stock-csvs');
        const files = fs.readdirSync(csvDir).filter(f => f.startsWith(symbol));
        
        if (files.length > 0) {
          const newFilePath = path.join(csvDir, files[0]);
          console.log(`🔧 ${symbol}: Updating path to ${newFilePath}`);
          
          await prisma.stockAnalysis.update({
            where: { id: analysis.id },
            data: { csvFilePath: newFilePath }
          });
          
          console.log(`✅ ${symbol}: Path updated successfully`);
        } else {
          console.log(`❌ ${symbol}: No CSV files found for ${symbol}`);
          continue;
        }
      }

      // Trigger re-analysis via API call
      const response = await fetch('http://localhost:3000/api/debug/reanalyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysisId: analysis.id })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`🎉 ${symbol}: Re-analysis successful!`);
        console.log(`   Total days: ${result.analysis.totalDays}`);
        console.log(`   Transactions: ${result.analysis.transactionsFound}`);
      } else {
        console.log(`❌ ${symbol}: Re-analysis failed - ${response.status}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reanalyzeAllSymbols();
