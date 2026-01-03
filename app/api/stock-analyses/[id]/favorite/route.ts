import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { canCreateStockAnalysis } from "@/lib/auth";

/**
 * PUT /api/stock-analyses/[id]/favorite
 * Toggle favorite status of a stock analysis
 */
export async function PUT(
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

    if (!canCreateStockAnalysis(user.role)) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions to favorite stock analyses" },
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

    // Get current favorite status
    const analysis = await prisma.stockAnalysis.findUnique({
      where: { id: analysisId },
      select: { favorite: true }
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Stock analysis not found" },
        { status: 404 }
      );
    }

    // Toggle favorite status
    const updatedAnalysis = await prisma.stockAnalysis.update({
      where: { id: analysisId },
      data: { favorite: !analysis.favorite },
      select: {
        id: true,
        symbol: true,
        favorite: true,
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedAnalysis,
      message: `Stock analysis ${updatedAnalysis.favorite ? 'favorited' : 'unfavorited'} successfully`
    });
  } catch (error) {
    console.error("Error toggling favorite status:", error);
    return NextResponse.json(
      { error: "Failed to update favorite status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stock-analyses/[id]/favorite
 * Set favorite status to true
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

    if (!canCreateStockAnalysis(user.role)) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions to favorite stock analyses" },
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

    const updatedAnalysis = await prisma.stockAnalysis.update({
      where: { id: analysisId },
      data: { favorite: true },
      select: {
        id: true,
        symbol: true,
        favorite: true,
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedAnalysis,
      message: "Stock analysis favorited successfully"
    });
  } catch (error) {
    console.error("Error favoriting stock analysis:", error);
    return NextResponse.json(
      { error: "Failed to favorite stock analysis" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stock-analyses/[id]/favorite
 * Set favorite status to false
 */
export async function DELETE(
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

    if (!canCreateStockAnalysis(user.role)) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions to unfavorite stock analyses" },
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

    const updatedAnalysis = await prisma.stockAnalysis.update({
      where: { id: analysisId },
      data: { favorite: false },
      select: {
        id: true,
        symbol: true,
        favorite: true,
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedAnalysis,
      message: "Stock analysis unfavorited successfully"
    });
  } catch (error) {
    console.error("Error unfavoriting stock analysis:", error);
    return NextResponse.json(
      { error: "Failed to unfavorite stock analysis" },
      { status: 500 }
    );
  }
}
