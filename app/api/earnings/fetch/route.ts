import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { earningsService } from '@/lib/earnings-service';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      );
    }

    const results = [];
    
    for (const symbol of symbols) {
      try {
        // Fetch earnings data from Alpha Vantage
        const earningsData = await earningsService.getEarningsData(symbol);
        
        // Store in database
        for (const earning of earningsData) {
          const existingRecord = await prisma.earningsData.findUnique({
            where: {
              symbol_earningsDate: {
                symbol: earning.symbol,
                earningsDate: earning.earningsDate,
              },
            },
          });

          if (!existingRecord) {
            await prisma.earningsData.create({
              data: {
                symbol: earning.symbol,
                company: earning.company,
                earningsDate: earning.earningsDate,
                reportType: earning.reportType,
                expectedEPS: earning.expectedEPS,
                actualEPS: earning.actualEPS,
                surprise: earning.surprise,
                revenue: earning.revenue,
                expectedRevenue: earning.expectedRevenue,
              },
            });
          }
        }

        results.push({
          symbol,
          status: 'success',
          dataCount: earningsData.length,
        });
      } catch (error) {
        console.error(`Failed to process ${symbol}:`, error);
        results.push({
          symbol,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: 'Earnings data fetch completed',
    });
  } catch (error) {
    console.error('Earnings fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch earnings data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to fetch earnings data',
    usage: {
      method: 'POST',
      body: {
        symbols: ['AAPL', 'GOOGL', 'MSFT'],
      },
    },
  });
}
