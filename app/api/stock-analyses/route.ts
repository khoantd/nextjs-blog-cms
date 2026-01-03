import { NextResponse } from "next/server";
import type { CreateStockAnalysisInput } from "@/lib/types/stock-analysis";
import { analyzeStockDataFromCSV } from "@/lib/services/stock-analysis";
import { saveFactorAnalysisToDatabase } from "@/lib/services/stock-factor-service";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { canViewStockAnalyses, canCreateStockAnalysis } from "@/lib/auth";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

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
    const { symbol, name, csvContent, minPctChange = 4.0, overwrite = false } = body;

    if (!symbol || !csvContent) {
      return NextResponse.json(
        { error: "Symbol and CSV content are required" },
        { status: 400 }
      );
    }

    // Perform analysis
    console.log('[Stock Analysis] Analyzing data for symbol:', symbol);
    const analysisResult = analyzeStockDataFromCSV(csvContent, symbol, minPctChange);
    console.log('[Stock Analysis] Analysis complete, transactions found:', analysisResult.transactionsFound);

    // Save CSV file for future factor analysis
    const csvDir = join(process.cwd(), 'uploads', 'stock-csvs');
    mkdirSync(csvDir, { recursive: true });
    const csvFileName = `${symbol.toUpperCase()}_${Date.now()}.csv`;
    const csvFilePath = join(csvDir, csvFileName);
    writeFileSync(csvFilePath, csvContent);
    console.log('[Stock Analysis] CSV file saved to:', csvFilePath);

    // Check for duplicate: same symbol with same analysis results
    const existingAnalysis = await prisma.stockAnalysis.findFirst({
      where: {
        symbol: symbol.toUpperCase(),
        analysisResults: JSON.stringify(analysisResult),
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingAnalysis && !overwrite) {
      console.log('[Stock Analysis] Duplicate detected, asking user for confirmation. ID:', existingAnalysis.id);
      return NextResponse.json(
        {
          error: "Duplicate analysis detected",
          details: "This exact analysis for this symbol already exists.",
          existingId: existingAnalysis.id,
          requiresConfirmation: true
        },
        { status: 409 } // 409 Conflict
      );
    }

    let stockAnalysis;

    if (existingAnalysis && overwrite) {
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
          minPctChange
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
