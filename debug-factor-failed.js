const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

// Import the service dynamically
async function importService() {
  const { saveFactorAnalysisToDatabase } = await import('./lib/services/stock-factor-service.ts');
  return { saveFactorAnalysisToDatabase };
}

async function debugFactorFailure() {
  try {
    // Import the service
    const { saveFactorAnalysisToDatabase } = await importService();

    // Get the most recent factor_failed analysis
    const failedAnalysis = await prisma.stockAnalysis.findFirst({
      where: { status: 'factor_failed' },
      orderBy: { created_at: 'desc' }
    });

    if (!failedAnalysis) {
      console.log('No factor_failed analyses found');
      return;
    }

    console.log(`Debugging analysis ID: ${failedAnalysis.id}, Symbol: ${failedAnalysis.symbol}`);
    console.log(`CSV file path: ${failedAnalysis.csv_file_path}`);

    // Check if CSV file exists
    if (!fs.existsSync(failedAnalysis.csv_file_path)) {
      console.error('❌ CSV file does not exist!');
      return;
    }

    console.log('✅ CSV file exists');

    // Read CSV content
    const csvContent = fs.readFileSync(failedAnalysis.csv_file_path, 'utf8');
    console.log(`✅ CSV file read, size: ${csvContent.length} characters`);

    // Parse analysis results
    const analysisResult = JSON.parse(failedAnalysis.analysis_results);
    console.log(`✅ Analysis results parsed, transactions: ${analysisResult.transactions?.length || 0}`);

    // Try to run factor analysis
    console.log('🔄 Attempting factor analysis...');
    const result = await saveFactorAnalysisToDatabase(
      failedAnalysis.id,
      csvContent,
      analysisResult
    );

    console.log('✅ Factor analysis succeeded:', result);

    // Update status to completed
    await prisma.stockAnalysis.update({
      where: { id: failedAnalysis.id },
      data: { status: 'completed' }
    });

    console.log('✅ Status updated to completed');

  } catch (error) {
    console.error('❌ Error during factor analysis:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugFactorFailure();
