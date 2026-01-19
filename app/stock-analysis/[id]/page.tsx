import { StockAnalysisDetail } from "@/components/stock-analysis-detail";
import { notFound } from "next/navigation";
import type { StockAnalysis } from "@/lib/types/stock-analysis";
import { getStockAnalysisServer } from "@/lib/stock-api";
import { getCurrentUser } from "@/lib/auth-utils";
import { canViewStockAnalyses } from "@/lib/client-auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

async function loadStockAnalysis(id: string): Promise<StockAnalysis | null> {
  try {
    // Validate id parameter
    if (!id || id === 'undefined' || id === 'null' || id === 'NaN') {
      return null;
    }

    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      return null;
    }

    const user = await getCurrentUser();

    if (!user) {
      redirect('/auth/signin');
    }

    if (!canViewStockAnalyses(user.role)) {
      redirect('/unauthorized');
    }

    // Use server-side API function which forwards cookies properly
    const response = await getStockAnalysisServer(numericId);
    
    if (!response?.data?.stockAnalysis) {
      return null;
    }

    return response.data.stockAnalysis;
  } catch (error) {
    console.error("Error loading stock analysis:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Stock Analysis #${id}`,
    description: `View detailed stock analysis for ID ${id}`,
  };
}

export default async function StockAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    const { id } = await params;
    
    if (!id) {
      return notFound();
    }

    const analysis = await loadStockAnalysis(id);

    if (!analysis) {
      return notFound();
    }

    return (
      <div className="container mx-auto p-6">
        <StockAnalysisDetail analysis={analysis} />
      </div>
    );
  } catch (error) {
    console.error("Error in StockAnalysisPage:", error);
    return notFound();
  }
}
