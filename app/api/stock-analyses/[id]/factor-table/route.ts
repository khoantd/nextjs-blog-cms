import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { canViewStockAnalyses } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import type { StockAnalysis } from "@prisma/client";

/**
 * GET /api/stock-analyses/[id]/factor-table
 * Retrieve stored factor table for a stock analysis
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const analysisId = parseInt(params.id);
    if (isNaN(analysisId)) {
      return NextResponse.json(
        { error: "Invalid analysis ID" },
        { status: 400 }
      );
    }

    // Get the stock analysis with factor tables from database
    const stockAnalysis = await prisma.stockAnalysis.findUnique({
      where: { id: analysisId },
      include: {
        factorTables: {
          orderBy: { transactionId: 'asc' }
        }
      }
    }) as StockAnalysis & {
      factorTables: Array<{
        id: number;
        stockAnalysisId: number;
        transactionId: number;
        date: string;
        factorData: string;
        createdAt: Date;
        updatedAt: Date;
      }>;
    };

    if (!stockAnalysis) {
      return NextResponse.json(
        { error: "Stock analysis not found" },
        { status: 404 }
      );
    }

    // Check if factor table data exists
    if (!stockAnalysis.factorTables || stockAnalysis.factorTables.length === 0) {
      return NextResponse.json(
        { 
          error: "No factor table data found for this analysis",
          suggestion: "Use POST endpoint to generate factor table first"
        },
        { status: 404 }
      );
    }

    // Parse and return cached data
    const factorData = stockAnalysis.factorTables.map((ft) => ({
      Tx: ft.transactionId,
      Date: ft.date,
      ...JSON.parse(ft.factorData)
    }));
    
    console.log(`Retrieved factor table with ${factorData.length} transactions from database`);

    return NextResponse.json({ 
      success: true, 
      data: factorData,
      fromCache: true,
      count: factorData.length,
      analysisId: stockAnalysis.id,
      symbol: stockAnalysis.symbol,
      message: `Retrieved ${factorData.length} transactions from database`
    });

  } catch (error) {
    console.error("Error retrieving factor table:", error);
    return NextResponse.json(
      { error: "Failed to retrieve factor table" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stock-analyses/[id]/factor-table
 * Generate and store factor table for an existing stock analysis
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const analysisId = parseInt(params.id);
    if (isNaN(analysisId)) {
      return NextResponse.json(
        { error: "Invalid analysis ID" },
        { status: 400 }
      );
    }

    // Get the stock analysis from database
    const stockAnalysis = await prisma.stockAnalysis.findUnique({
      where: { id: analysisId },
      include: {
        factorTables: {
          orderBy: { transactionId: 'asc' }
        }
      }
    }) as StockAnalysis & {
      factorTables: Array<{
        id: number;
        stockAnalysisId: number;
        transactionId: number;
        date: string;
        factorData: string;
        createdAt: Date;
        updatedAt: Date;
      }>;
    };

    if (!stockAnalysis) {
      return NextResponse.json(
        { error: "Stock analysis not found" },
        { status: 404 }
      );
    }

    // Check if factor table already exists (cache)
    if (stockAnalysis.factorTables.length > 0) {
      console.log(`Returning cached factor table with ${stockAnalysis.factorTables.length} transactions`);
      
      // Parse and return cached data
      const cachedData = stockAnalysis.factorTables.map(ft => ({
        Tx: ft.transactionId,
        Date: ft.date,
        ...JSON.parse(ft.factorData)
      }));
      
      return NextResponse.json({ 
        success: true, 
        data: cachedData,
        fromCache: true,
        message: `Loaded ${cachedData.length} transactions from database cache`
      });
    }

    // Parse the analysis results to get the data
    const analysisResults = stockAnalysis.analysisResults;
    
    if (!analysisResults) {
      return NextResponse.json(
        { error: "No analysis results found for this stock analysis" },
        { status: 404 }
      );
    }
    
    // Create factor table from analysis results
    console.log('Creating factor table from analysis results with minPctChange:', stockAnalysis.minPctChange || 4.0);
    
    // Parse the analysis results to get transaction data
    const results = JSON.parse(analysisResults);
    
    if (!results.transactions || !Array.isArray(results.transactions)) {
      return NextResponse.json(
        { error: "No transaction data found in analysis results" },
        { status: 400 }
      );
    }
    
    // Create factor data from existing transactions
    const factorData = results.transactions.map((tx: any, index: number) => {
      try {
        // Extract factors from the transaction if available, otherwise create basic structure
        const factors = tx.factors || [];
        
        // Map existing factors to our factor structure
        const factorMap: Record<string, number | null> = {
          "volume_spike": factors.includes('volume_spike') ? 1 : 0,
          "break_ma50": factors.includes('break_ma50') ? 1 : 0,
          "break_ma200": factors.includes('break_ma200') ? 1 : 0,
          "rsi_over_60": factors.includes('rsi_over_60') ? 1 : 0,
          // AI-powered factors (null for now, will be populated by AI later)
          "market_up": null,
          "sector_up": null,
          "earnings_window": null,
          "news_positive": null,
          "short_covering": null,
          "macro_tailwind": null
        };
        
        return {
          "Tx": tx.tx || index + 1,
          "Date": tx.date,
          ...factorMap
        };
      } catch (error) {
        console.error(`Error processing transaction ${index}:`, error);
        // Return a safe default structure
        return {
          "Tx": tx.tx || index + 1,
          "Date": tx.date || `Unknown-${index}`,
          "volume_spike": 0,
          "break_ma50": 0,
          "break_ma200": 0,
          "rsi_over_60": 0,
          "market_up": null,
          "sector_up": null,
          "earnings_window": null,
          "news_positive": null,
          "short_covering": null,
          "macro_tailwind": null
        };
      }
    });
    
    // Save factor table data to database
    console.log(`Saving factor table with ${factorData.length} transactions to database`);
    
    // Prepare data for bulk insert
    const factorTableData = factorData.map((row: any) => {
      const { Tx, Date, ...factorValues } = row;
      return {
        stockAnalysisId: analysisId,
        transactionId: Tx,
        date: Date,
        factorData: JSON.stringify(factorValues)
      };
    });
    
    // Bulk insert to database using upsert to handle duplicates
    for (const row of factorTableData) {
      await prisma.factorTable.upsert({
        where: {
          stockAnalysisId_transactionId: {
            stockAnalysisId: row.stockAnalysisId,
            transactionId: row.transactionId
          }
        },
        update: {
          date: row.date,
          factorData: row.factorData,
          updatedAt: new Date()
        },
        create: row
      });
    }
    
    console.log(`Successfully saved ${factorTableData.length} factor table rows to database`);
    
    const result = { 
      success: true, 
      data: factorData,
      fromCache: false,
      message: `Generated and saved ${factorData.length} transactions to database`
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating factor table:", error);
    return NextResponse.json(
      { error: "Failed to generate factor table" },
      { status: 500 }
    );
  }
}
