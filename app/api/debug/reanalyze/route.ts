import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeStockDataFromCSV } from '@/lib/services/stock-analysis';
import { getCurrentUser } from '@/lib/auth-utils';
import { canCreateStockAnalysis } from '@/lib/auth';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canCreateStockAnalysis(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { analysisId } = await request.json();
    
    if (!analysisId) {
      return NextResponse.json({ error: "Analysis ID is required" }, { status: 400 });
    }

    // Get the stock analysis
    const stockAnalysis = await prisma.stockAnalysis.findUnique({
      where: { id: parseInt(analysisId) }
    });

    if (!stockAnalysis) {
      return NextResponse.json({ error: 'Stock analysis not found' }, { status: 404 });
    }

    if (!stockAnalysis.csvFilePath) {
      return NextResponse.json({ error: 'CSV file path not found' }, { status: 400 });
    }

    console.log("Re-analyzing stock data for:", stockAnalysis.symbol);

    // Read the original CSV file
    const csvContent = readFileSync(stockAnalysis.csvFilePath, 'utf-8');

    // Re-analyze the data
    const analysisResult = analyzeStockDataFromCSV(
      csvContent, 
      stockAnalysis.symbol, 
      stockAnalysis.minPctChange || 4.0,
      "us"
    );

    console.log("Re-analysis complete:", {
      totalDays: analysisResult.totalDays,
      transactionsFound: analysisResult.transactionsFound,
      hasTransactions: analysisResult.transactions && analysisResult.transactions.length > 0,
      hasFactorAnalysis: !!analysisResult.factorAnalysis
    });

    // Update the analysis with complete results
    const updatedAnalysis = await prisma.stockAnalysis.update({
      where: { id: parseInt(analysisId) },
      data: {
        analysisResults: JSON.stringify(analysisResult),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Stock analysis re-analyzed and updated successfully',
      analysis: {
        id: updatedAnalysis.id,
        symbol: updatedAnalysis.symbol,
        totalDays: analysisResult.totalDays,
        transactionsFound: analysisResult.transactionsFound,
        hasTransactions: analysisResult.transactions && analysisResult.transactions.length > 0,
        hasFactorAnalysis: !!analysisResult.factorAnalysis
      }
    });

  } catch (error) {
    console.error('Re-analysis error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to re-analyze stock data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
