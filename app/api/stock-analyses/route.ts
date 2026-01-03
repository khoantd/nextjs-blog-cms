import { NextResponse } from "next/server";
import type { CreateStockAnalysisInput } from "@/lib/types/stock-analysis";
import { analyzeStockDataFromCSV } from "@/lib/services/stock-analysis";
import { saveFactorAnalysisToDatabase } from "@/lib/services/stock-factor-service";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { canViewStockAnalyses, canCreateStockAnalysis } from "@/lib/auth";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// Helper function to fetch stock price
async function fetchStockPrice(symbol: string) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/stock-price/${symbol}`, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch stock price for ${symbol}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error);
    return null;
  }
}

/**
 * GET /api/stock-analyses
 * List all stock analyses
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has permission to view stock analyses
    if (!canViewStockAnalyses(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to view stock analyses" },
        { status: 403 }
      );
    }

    const stockAnalyses = await prisma.stockAnalysis.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      data: { stockAnalyses }
    });
  } catch (error) {
    console.error("Error fetching stock analyses:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock analyses" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stock-analyses
 * Create a new stock analysis
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!canCreateStockAnalysis(user.role)) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions to create stock analyses" },
        { status: 403 }
      );
    }

    const body: CreateStockAnalysisInput = await request.json();
    const { symbol, name, csvContent, minPctChange = 4.0, market = "us", overwrite = false } = body;

    if (!symbol || !csvContent) {
      return NextResponse.json(
        { error: "Symbol and CSV content are required" },
        { status: 400 }
      );
    }

    // Perform analysis
    console.log('[Stock Analysis] Analyzing data for symbol:', symbol, 'market:', market);
    const analysisResult = analyzeStockDataFromCSV(csvContent, symbol, minPctChange, market);
    console.log('[Stock Analysis] Analysis complete, transactions found:', analysisResult.transactionsFound);

    // Fetch latest stock price
    console.log('[Stock Analysis] Fetching latest stock price for symbol:', symbol);
    const stockPriceData = await fetchStockPrice(symbol);
    
    let latestPrice = null;
    let priceChange = null;
    let priceChangePercent = null;
    let priceUpdatedAt = null;
    
    if (stockPriceData) {
      latestPrice = stockPriceData.price;
      priceChange = stockPriceData.change;
      priceChangePercent = stockPriceData.changePercent;
      priceUpdatedAt = new Date();
      console.log('[Stock Analysis] Stock price fetched:', { latestPrice, priceChange, priceChangePercent });
    } else {
      console.log('[Stock Analysis] Failed to fetch stock price, using null values');
    }

    // Save CSV file for future factor analysis
    const csvDir = join(process.cwd(), 'uploads', 'stock-csvs');
    mkdirSync(csvDir, { recursive: true });
    const csvFileName = `${symbol.toUpperCase()}_${Date.now()}.csv`;
    const csvFilePath = join(csvDir, csvFileName);
    writeFileSync(csvFilePath, csvContent);
    console.log('[Stock Analysis] CSV file saved to:', csvFilePath);

    // Check for duplicate based on symbol + date range
    // Extract date range from the analysis result
    const analysisDates = analysisResult.transactions.map(tx => tx.date).sort();
    const dateRangeStart = analysisDates[0];
    const dateRangeEnd = analysisDates[analysisDates.length - 1];
    
    // Check for existing analysis with same symbol and overlapping date range
    const existingAnalysis = await prisma.stockAnalysis.findFirst({
      where: {
        symbol: symbol.toUpperCase(),
      },
      orderBy: { createdAt: 'desc' }
    });

    // If existing analysis found, check for date overlap
    let hasDateOverlap = false;
    if (existingAnalysis) {
      try {
        const existingResults = JSON.parse(existingAnalysis.analysisResults || '{}');
        const existingDates = existingResults.transactions?.map((tx: any) => tx.date) || [];
        const existingDateRange = existingDates.sort((a: string, b: string) => a.localeCompare(b));
        const existingStart = existingDateRange[0];
        const existingEnd = existingDateRange[existingDateRange.length - 1];
        
        // Check if date ranges overlap
        hasDateOverlap = !(
          dateRangeEnd < existingStart || 
          dateRangeStart > existingEnd
        );
        
        console.log('[Stock Analysis] Date overlap check:', {
          newRange: `${dateRangeStart} to ${dateRangeEnd}`,
          existingRange: `${existingStart} to ${existingEnd}`,
          hasOverlap: hasDateOverlap
        });
      } catch (parseError) {
        console.warn('[Stock Analysis] Failed to parse existing analysis results:', parseError);
        // If we can't parse existing results, treat as potential duplicate
        hasDateOverlap = true;
      }
    }

    if (hasDateOverlap && !overwrite) {
      console.log('[Stock Analysis] Overlapping data detected, asking user for confirmation. ID:', existingAnalysis?.id);
      return NextResponse.json(
        {
          error: "Overlapping data detected",
          details: `Data for ${symbol.toUpperCase()} from ${dateRangeStart} to ${dateRangeEnd} overlaps with existing analysis.`,
          existingId: existingAnalysis?.id,
          dateRange: { start: dateRangeStart, end: dateRangeEnd },
          requiresConfirmation: true
        },
        { status: 409 } // 409 Conflict
      );
    }

    let stockAnalysis;

    if (existingAnalysis && overwrite && hasDateOverlap) {
      // Update existing record
      console.log('[Stock Analysis] Overwriting existing record ID:', existingAnalysis.id);
      stockAnalysis = await prisma.stockAnalysis.update({
        where: { id: existingAnalysis.id },
        data: {
          symbol: symbol.toUpperCase(),
          name: name || null,
          status: 'processing',
          analysisResults: JSON.stringify(analysisResult),
          aiInsights: null,
          minPctChange,
          csvFilePath,
          latestPrice,
          priceChange,
          priceChangePercent,
          priceUpdatedAt,
          updatedAt: new Date()
        }
      });
      console.log('[Stock Analysis] Database record updated with ID:', stockAnalysis.id);
    } else {
      // Create new record
      console.log('[Stock Analysis] Creating new database record...');
      stockAnalysis = await prisma.stockAnalysis.create({
        data: {
          symbol: symbol.toUpperCase(),
          name: name || null,
          csvFilePath,
          status: 'processing',
          analysisResults: JSON.stringify(analysisResult),
          aiInsights: null,
          minPctChange,
          latestPrice,
          priceChange,
          priceChangePercent,
          priceUpdatedAt
        }
      });
      console.log('[Stock Analysis] Database record created with ID:', stockAnalysis.id);
    }

    // Generate and save complete factor analysis
    console.log('[Stock Analysis] Generating complete factor analysis...');
    try {
      await saveFactorAnalysisToDatabase(stockAnalysis.id, csvContent, analysisResult);
      
      // Update status to completed
      stockAnalysis = await prisma.stockAnalysis.update({
        where: { id: stockAnalysis.id },
        data: { status: 'completed' }
      });
      
      console.log('[Stock Analysis] Factor analysis completed successfully');
    } catch (factorError) {
      console.error('[Stock Analysis] Factor analysis failed:', factorError);
      // Update status to factor_failed
      stockAnalysis = await prisma.stockAnalysis.update({
        where: { id: stockAnalysis.id },
        data: { status: 'factor_failed' }
      });
    }

    return NextResponse.json(
      { data: { stockAnalysis } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Stock Analysis] Error creating stock analysis:", error);
    console.error("[Stock Analysis] Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      {
        error: "Failed to create stock analysis",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
