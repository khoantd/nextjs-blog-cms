import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { canCreateStockAnalysis } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !canCreateStockAnalysis(user.role)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const stockAnalysisId = parseInt(id);
    
    // Get the stock analysis
    const stockAnalysis = await prisma.stockAnalysis.findUnique({
      where: { id: stockAnalysisId }
    });

    if (!stockAnalysis) {
      return NextResponse.json(
        { error: "Stock analysis not found" },
        { status: 404 }
      );
    }

    // Parse analysis results from database
    if (!stockAnalysis.analysisResults) {
      return NextResponse.json(
        { error: "No analysis results found for this stock analysis" },
        { status: 404 }
      );
    }

    const analysisResult = JSON.parse(stockAnalysis.analysisResults);

    // Update status to processing
    await prisma.stockAnalysis.update({
      where: { id: stockAnalysisId },
      data: { status: 'processing' }
    });

    // Generate factor data from analysis results (same logic as factor-table POST)
    console.log(`[Regenerate Factors] Regenerating factors for analysis ID: ${stockAnalysisId}`);
    
    if (!analysisResult.transactions || !Array.isArray(analysisResult.transactions)) {
      throw new Error("No transaction data found in analysis results");
    }
    
    // Create factor data from existing transactions
    const factorData = analysisResult.transactions.map((tx: any, index: number) => {
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

    // Clear existing factor data for this analysis
    await prisma.factorTable.deleteMany({
      where: { stockAnalysisId }
    });

    // Save new factor data to database
    console.log(`Saving ${factorData.length} factor records to database`);
    
    // Prepare data for bulk insert
    const factorTableData = factorData.map((row: any) => {
      const { Tx, Date, ...factorValues } = row;
      return {
        stockAnalysisId,
        transactionId: Tx,
        date: Date,
        factorData: JSON.stringify(factorValues)
      };
    });
    
    // Bulk insert to database
    for (const row of factorTableData) {
      await prisma.factorTable.create({
        data: row
      });
    }

    // Update status to completed
    const updatedAnalysis = await prisma.stockAnalysis.update({
      where: { id: stockAnalysisId },
      data: { status: 'completed' }
    });

    console.log(`[Regenerate Factors] Successfully regenerated ${factorData.length} factors for analysis ID: ${stockAnalysisId}`);

    return NextResponse.json({
      success: true,
      data: factorData,
      fromCache: false,
      message: `Successfully regenerated ${factorData.length} factor records`
    });

  } catch (error) {
    const { id } = await params;
    const stockAnalysisId = parseInt(id);
    
    console.error(`[Regenerate Factors] Error regenerating factors for analysis ${id}:`, error);
    
    // Update status to factor_failed
    try {
      await prisma.stockAnalysis.update({
        where: { id: stockAnalysisId },
        data: { status: 'factor_failed' }
      });
    } catch (updateError) {
      console.error('Failed to update status to factor_failed:', updateError);
    }

    return NextResponse.json(
      { error: "Failed to regenerate factors", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}