import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { canViewStockAnalyses } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Get the stock analysis from database
    const stockAnalysis = await prisma.stockAnalysis.findUnique({
      where: { id: analysisId },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        analysisResults: true,
        aiInsights: true,
      }
    });

    if (!stockAnalysis) {
      return NextResponse.json(
        { error: "Stock analysis not found" },
        { status: 404 }
      );
    }

    // Calculate progress based on status and available data
    let progress = 0;
    let message = "";

    switch (stockAnalysis.status) {
      case "draft":
        progress = 0;
        message = "Analysis ready to begin";
        break;
      case "analyzing":
        progress = 25;
        message = "Analyzing stock data...";
        break;
      case "processing":
        progress = 50;
        message = "Processing factors and indicators...";
        break;
      case "ai_processing":
        progress = 75;
        message = "Running AI analysis...";
        break;
      case "ai_completed":
        progress = 90;
        message = "AI analysis completed";
        break;
      case "completed":
        progress = 100;
        message = "Analysis complete";
        break;
      case "factor_failed":
        progress = 45;
        message = "Factor generation failed";
        break;
      case "failed":
        progress = 0;
        message = "Analysis failed";
        break;
      default:
        progress = 0;
        message = "Unknown status";
    }

    // Check if factor data exists to refine progress
    if (stockAnalysis.status === "completed" || stockAnalysis.status === "ai_completed") {
      const factorTableCount = await prisma.factorTable.count({
        where: { stockAnalysisId: analysisId }
      });
      
      const dailyScoreCount = await prisma.dailyScore.count({
        where: { stockAnalysisId: analysisId }
      });

      if (factorTableCount === 0) {
        progress = Math.max(progress - 20, 60);
        message = "Analysis complete - factor generation pending";
      } else if (dailyScoreCount === 0) {
        progress = Math.max(progress - 10, 80);
        message = "Analysis complete - daily scoring pending";
      }
    }

    return NextResponse.json({
      status: stockAnalysis.status,
      lastUpdated: stockAnalysis.updatedAt,
      progress,
      message,
      hasResults: !!stockAnalysis.analysisResults,
      hasInsights: !!stockAnalysis.aiInsights,
    });

  } catch (error) {
    console.error("Error fetching status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
