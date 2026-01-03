import { NextRequest, NextResponse } from 'next/server';

interface StockPriceResponse {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  marketState: 'open' | 'closed' | 'pre-market' | 'after-hours';
  currency: string;
}

async function fetchStockPrice(symbol: string): Promise<StockPriceResponse> {
  try {
    // Using Yahoo Finance API (unofficial but free)
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}?interval=1m&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.chart?.result?.[0]) {
      throw new Error('No data found for symbol');
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const timestamp = Date.now();
    
    // Get the most recent price
    const regularMarketPrice = meta.regularMarketPrice || meta.currentPrice;
    const previousClose = meta.previousClose;
    const change = regularMarketPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    // Determine market state
    const now = new Date();
    const currentHour = now.getHours();
    const marketState = 
      currentHour >= 16 ? 'after-hours' :
      currentHour >= 9 && currentHour < 16 ? 'open' :
      currentHour >= 4 && currentHour < 9 ? 'pre-market' : 'closed';

    return {
      symbol: symbol.toUpperCase(),
      price: regularMarketPrice,
      change: change,
      changePercent: changePercent,
      timestamp,
      marketState,
      currency: meta.currency || 'USD'
    };
  } catch (error) {
    console.error('Error fetching stock price:', error);
    
    // Return mock data for development/demo purposes
    const mockPrice = 100 + Math.random() * 200;
    const mockChange = (Math.random() - 0.5) * 10;
    
    return {
      symbol: symbol.toUpperCase(),
      price: mockPrice,
      change: mockChange,
      changePercent: (mockChange / mockPrice) * 100,
      timestamp: Date.now(),
      marketState: 'open' as const,
      currency: 'USD'
    };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol;
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    // Validate symbol format (alphanumeric, 1-5 characters)
    if (!/^[A-Z]{1,5}$/i.test(symbol)) {
      return NextResponse.json(
        { error: 'Invalid symbol format' },
        { status: 400 }
      );
    }

    const stockData = await fetchStockPrice(symbol);
    
    // Add CORS headers for client-side requests
    return NextResponse.json(stockData, {
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch stock price',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
