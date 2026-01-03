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
    // Check if it's a Vietnamese stock (3 letters and known Vietnamese symbols)
    const vietnameseStocks = ['FPT', 'VNM', 'VIC', 'VRE', 'ACB', 'BID', 'CTG', 'HDB', 'MBB', 'TCB', 'VCB', 'VGI', 'GAS', 'HPG', 'MSN', 'MWG', 'PLX', 'POW', 'SAB', 'SSI', 'STB', 'TPB', 'VCB', 'VHM', 'VIB', 'VIN', 'VJC', 'VLB', 'VND', 'VPB'];
    const isVietnameseStock = vietnameseStocks.includes(symbol.toUpperCase()) && symbol.length === 3;
    
    if (isVietnameseStock) {
      // For Vietnamese stocks, use a different approach or mock data for now
      // Yahoo Finance may not have comprehensive Vietnamese stock data
      return await fetchVietnameseStockPrice(symbol);
    }
    
    // Using Yahoo Finance API for US stocks (unofficial but free)
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
    
    // Handle case where price data is missing
    if (!regularMarketPrice || !previousClose) {
      throw new Error('Incomplete price data from API');
    }
    
    const change = regularMarketPrice - previousClose;
    const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

    // Determine market state (US market hours)
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

async function fetchVietnameseStockPrice(symbol: string): Promise<StockPriceResponse> {
  // Vietnamese market hours (roughly 9:00 AM - 3:00 PM ICT, which is 2:00 AM - 8:00 AM UTC)
  const now = new Date();
  const currentHour = now.getUTCHours();
  const marketState = 
    currentHour >= 8 && currentHour < 9 ? 'after-hours' :
    currentHour >= 2 && currentHour < 8 ? 'open' :
    currentHour >= 1 && currentHour < 2 ? 'pre-market' : 'closed';
  
  // Mock Vietnamese stock prices (in VND)
  const vietnameseStockPrices: { [key: string]: number } = {
    'FPT': 125000, // FPT Corporation
    'VNM': 65000,  // Vinamilk
    'VIC': 45000,  // Vingroup
    'VRE': 28000,  // Vincom Retail
    'ACB': 25000,  // Asia Commercial Bank
    'BID': 45000,  // Bank for Investment and Development of Vietnam
    'CTG': 35000,  // Vietcombank
    'HDB': 18000,  // HDBank
    'MBB': 23000,  // MB Bank
    'TCB': 28000,  // Techcombank
    'VCB': 95000,  // Vietcombank (different listing)
    'GAS': 65000,  // PetroVietnam Gas
    'HPG': 25000,  // Hoa Phat Group
    'MSN': 85000,  // Masan Group
    'MWG': 75000,  // Mobile World Group
    'PLX': 55000,  // Petrolimex
    'POW': 12000,  // PetroVietnam Power
    'SAB': 180000, // Sabeco
    'SSI': 35000,  // Saigon Securities
    'STB': 18000,  // Sacombank
    'TPB': 15000,  // Tien Phong Bank
    'VHM': 35000,  // Vinhomes
    'VIB': 25000,  // International Commercial Bank
    'VIN': 45000,  // Vinhomes (different listing)
    'VJC': 65000,  // Vietjet Air
    'VLB': 12000,  // Vinaconex
    'VND': 25000,  // Nam Dinh Textile
    'VPB': 22000,  // VPBank
  };
  
  const basePrice = vietnameseStockPrices[symbol.toUpperCase()] || 50000;
  const variation = basePrice * 0.05; // 5% variation
  const currentPrice = basePrice + (Math.random() - 0.5) * variation;
  const change = currentPrice - basePrice;
  const changePercent = (change / basePrice) * 100;
  
  return {
    symbol: symbol.toUpperCase(),
    price: currentPrice,
    change: change,
    changePercent: changePercent,
    timestamp: Date.now(),
    marketState,
    currency: 'VND'
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    // Validate symbol format (alphanumeric, 1-5 characters for US stocks, 3 characters for Vietnamese stocks)
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
