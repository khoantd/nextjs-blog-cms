import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { canViewStockAnalyses, canDeleteStockAnalysis } from "@/lib/auth";

/**
 * GET /api/stock-analyses/[id]
 * Get a specific stock analysis by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!canViewStockAnalyses(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to view stock analyses" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const stockAnalysis = await prisma.stockAnalysis.findUnique({
      where: { id: parseInt(id) }
    });

    if (!stockAnalysis) {
      return NextResponse.json(
        { error: "Stock analysis not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { stockAnalysis } });
  } catch (error) {
    console.error("Error fetching stock analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock analysis" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stock-analyses/[id]
 * Delete a stock analysis
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!canDeleteStockAnalysis(user.role)) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions to delete stock analyses" },
        { status: 403 }
      );
    }

    const { id } = await params;

    await prisma.stockAnalysis.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting stock analysis:", error);
    return NextResponse.json(
      { error: "Failed to delete stock analysis" },
      { status: 500 }
    );
  }
}
