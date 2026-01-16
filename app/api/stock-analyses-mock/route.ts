import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Mock data for testing
    const mockAnalyses = [
      {
        id: 1,
        symbol: 'AAPL',
        name: 'Apple Inc.',
        status: 'completed',
        latestPrice: 195.89,
        priceChange: 2.45,
        priceChangePercent: 1.27,
        buyPrice: 190.00,
        sellPrice: 200.00,
        favorite: true,
        analysisResults: JSON.stringify({
          totalDays: 252,
          transactionsFound: 15,
          minPctChange: 5.0
        }),
        createdAt: new Date('2024-01-05').toISOString(),
        updatedAt: new Date('2024-01-05').toISOString()
      },
      {
        id: 2,
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        status: 'analyzing',
        latestPrice: 142.56,
        priceChange: -1.23,
        priceChangePercent: -0.85,
        buyPrice: null,
        sellPrice: null,
        favorite: false,
        analysisResults: null,
        createdAt: new Date('2024-01-04').toISOString(),
        updatedAt: new Date('2024-01-04').toISOString()
      }
    ];
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = mockAnalyses.slice(startIndex, endIndex);
    
    return NextResponse.json({
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: mockAnalyses.length,
        totalPages: Math.ceil(mockAnalyses.length / limit)
      }
    });
  } catch (error) {
    console.error('Stock Analyses Mock API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch stock analyses',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
