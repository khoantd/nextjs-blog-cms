import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG, getApiUrl } from '@/lib/api-config';
import { getVnstockToken } from '@/lib/vnstock-auth';
import { priceBoardToStockPrice } from '@/lib/vnstock-api';
import type { PriceBoardResponse } from '@/lib/types/vnstock';

const VNSTOCK_API_URL = process.env.NEXT_PUBLIC_VNSTOCK_API_URL || 'http://72.60.233.159:8002';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const { searchParams } = new URL(request.url);
    const country = (searchParams.get('country') as 'US' | 'VN') || 'US';
    
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

    // For Vietnamese stocks, try vnstock API first
    if (country === 'VN') {
      try {
        const token = await getVnstockToken();
        
        if (token) {
          // Use vnstock price board API
          const vnstockResponse = await fetch(`${VNSTOCK_API_URL}/api/v1/trading/price-board`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              symbols_list: [symbol.toUpperCase()],
              source: 'vci',
            }),
          });

          if (vnstockResponse.ok) {
            const vnstockData: PriceBoardResponse = await vnstockResponse.json();
            
            if (vnstockData.data && vnstockData.data[symbol.toUpperCase()]) {
              const stockPriceData = priceBoardToStockPrice(symbol.toUpperCase(), vnstockData);
              
              // Transform to match expected format
              const transformedData = {
                symbol: stockPriceData.symbol,
                price: stockPriceData.price,
                change: stockPriceData.change,
                changePercent: typeof stockPriceData.changePercent === 'number' 
                  ? `${stockPriceData.changePercent.toFixed(2)}%`
                  : stockPriceData.changePercent,
                volume: stockPriceData.volume,
                latestTradingDay: stockPriceData.lastUpdate.split('T')[0],
                currency: 'VND',
              };

              return NextResponse.json(transformedData, {
                headers: {
                  'Cache-Control': 'public, max-age=10',
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'GET',
                  'Access-Control-Allow-Headers': 'Content-Type',
                },
              });
            }
          }
        }
      } catch (vnstockError) {
        console.warn('Vnstock API failed, falling back to backend:', vnstockError);
        // Fall through to backend API
      }
    }

    // Fallback to backend API (for US stocks or if vnstock fails)
    const queryParams = new URLSearchParams({ symbol, country });
    const url = getApiUrl(`${API_CONFIG.ENDPOINTS.STOCK_PRICE}?${queryParams}`);
    
    // Extract cookies from the incoming Next.js request
    const cookieHeader = request.headers.get('cookie') || '';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader && { 'Cookie': cookieHeader }),
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      // Forward the status code from backend (400, 404, 500, etc.)
      return NextResponse.json(
        { 
          error: errorData.error?.message || errorData.error || 'Failed to fetch stock price',
          message: errorData.error?.message || errorData.error || `HTTP ${response.status}`,
          code: errorData.code || errorData.error?.code
        },
        { status: response.status }
      );
    }
    
    const stockData = await response.json();
    
    // Add CORS headers for client-side requests
    return NextResponse.json(stockData, {
      headers: {
        'Cache-Control': 'public, max-age=10', // Cache for 10 seconds to ensure fresh data
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
