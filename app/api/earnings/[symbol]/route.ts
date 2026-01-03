import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const normalizedSymbol = symbol.toUpperCase();

    const earningsHistory = await prisma.earningsData.findMany({
      where: {
        symbol: normalizedSymbol,
      },
      orderBy: {
        earningsDate: 'desc',
      },
      take: 20, // Limit to last 20 earnings reports
    });

    if (earningsHistory.length === 0) {
      return NextResponse.json({
        success: true,
        symbol,
        message: 'No earnings data found for this symbol',
        data: [],
      });
    }

    // Format the response
    const formattedData = earningsHistory.map((earning: any) => ({
      id: earning.id,
      symbol: earning.symbol,
      company: earning.company,
      earningsDate: earning.earningsDate,
      reportType: earning.reportType,
      expectedEPS: earning.expectedEPS,
      actualEPS: earning.actualEPS,
      surprise: earning.surprise,
      revenue: earning.revenue,
      expectedRevenue: earning.expectedRevenue,
      aiAnalysis: earning.aiSummary ? {
        summary: earning.aiSummary,
        sentiment: earning.aiSentiment,
        keyPoints: earning.aiKeyPoints ? JSON.parse(earning.aiKeyPoints) : [],
      } : null,
      createdAt: earning.createdAt,
      updatedAt: earning.updatedAt,
    }));

    // Calculate summary statistics
    const totalEarnings = formattedData.length;
    const analyzedEarnings = formattedData.filter(e => e.aiAnalysis).length;
    const positiveSurprises = formattedData.filter(e => e.surprise && e.surprise > 0).length;
    const negativeSurprises = formattedData.filter(e => e.surprise && e.surprise < 0).length;
    
    const avgSurprise = formattedData
      .filter(e => e.surprise !== null && e.surprise !== undefined)
      .reduce((sum, e) => sum + e.surprise!, 0) / 
      formattedData.filter(e => e.surprise !== null && e.surprise !== undefined).length;

    return NextResponse.json({
      success: true,
      symbol,
      summary: {
        totalEarnings,
        analyzedEarnings,
        positiveSurprises,
        negativeSurprises,
        avgSurprise: avgSurprise ? (avgSurprise * 100).toFixed(2) + '%' : 'N/A',
        analysisCompletionRate: totalEarnings > 0 ? (analyzedEarnings / totalEarnings * 100).toFixed(1) + '%' : '0%',
      },
      data: formattedData,
    });
  } catch (error) {
    console.error('Earnings history error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch earnings history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
