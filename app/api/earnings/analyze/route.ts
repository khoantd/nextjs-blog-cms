import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { earningsAnalysisService } from '@/lib/earnings-analysis';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { earningsIds, symbols } = body;

    let targetIds: number[] = [];

    if (earningsIds && Array.isArray(earningsIds)) {
      targetIds = earningsIds;
    } else if (symbols && Array.isArray(symbols)) {
      // Find earnings records for these symbols
      const earningsRecords = await prisma.earningsData.findMany({
        where: {
          symbol: {
            in: symbols,
          },
          aiSummary: null, // Only analyze those without AI analysis
        },
        select: {
          id: true,
        },
      });
      
      targetIds = earningsRecords.map(record => record.id);
    } else {
      // Analyze all earnings without AI analysis
      const earningsRecords = await prisma.earningsData.findMany({
        where: {
          aiSummary: null,
        },
        select: {
          id: true,
        },
        take: 10, // Limit to prevent excessive API calls
      });
      
      targetIds = earningsRecords.map(record => record.id);
    }

    if (targetIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No earnings data found for analysis',
        analyzed: 0,
      });
    }

    const results = [];
    
    for (const id of targetIds) {
      try {
        await earningsAnalysisService.updateEarningsWithAI(id);
        results.push({
          earningsId: id,
          status: 'success',
        });
      } catch (error) {
        console.error(`Failed to analyze earnings ${id}:`, error);
        results.push({
          earningsId: id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Earnings analysis completed',
      analyzed: results.length,
      results,
    });
  } catch (error) {
    console.error('Earnings analysis error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze earnings data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get statistics about earnings analysis
    const totalEarnings = await prisma.earningsData.count();
    const analyzedEarnings = await prisma.earningsData.count({
      where: {
        aiSummary: {
          not: null,
        },
      },
    });
    
    const pendingAnalysis = totalEarnings - analyzedEarnings;

    return NextResponse.json({
      success: true,
      statistics: {
        total: totalEarnings,
        analyzed: analyzedEarnings,
        pending: pendingAnalysis,
        completionRate: totalEarnings > 0 ? (analyzedEarnings / totalEarnings * 100).toFixed(1) : '0',
      },
      usage: {
        method: 'POST',
        body: {
          earningsIds: [1, 2, 3], // Analyze specific earnings by ID
          symbols: ['AAPL', 'GOOGL'], // Analyze all earnings for symbols without AI analysis
          // or no body to analyze pending earnings (limit 10)
        },
      },
    });
  } catch (error) {
    console.error('Statistics error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
