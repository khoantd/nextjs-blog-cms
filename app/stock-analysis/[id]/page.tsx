import { StockAnalysisDetail } from "@/components/stock-analysis-detail";
import { notFound } from "next/navigation";
import type { StockAnalysis } from "@/lib/types/stock-analysis";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { canViewStockAnalyses } from "@/lib/client-auth";
import { redirect } from "next/navigation";

async function loadStockAnalysis(id: string): Promise<StockAnalysis | null> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      redirect('/auth/signin');
    }

    if (!canViewStockAnalyses(user.role)) {
      redirect('/unauthorized');
    }

    const stockAnalysis = await prisma.stockAnalysis.findUnique({
      where: { id: parseInt(id) }
    });

    if (!stockAnalysis) {
      return null;
    }

    return stockAnalysis as StockAnalysis;
  } catch (error) {
    console.error("Error loading stock analysis:", error);
    return null;
  }
}

export default async function StockAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const analysis = await loadStockAnalysis(id);

  if (!analysis) {
    return notFound();
  }

  return (
    <div className="container mx-auto p-6">
      <StockAnalysisDetail analysis={analysis} />
    </div>
  );
}
