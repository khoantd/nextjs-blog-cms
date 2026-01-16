import { NextRequest, NextResponse } from 'next/server';
import { serverApiRequestWithCookies } from '@/lib/api-config';

/**
 * GET /api/earnings
 * Proxy to backend earnings list endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    
    // Build query string
    const queryParams = new URLSearchParams();
    if (symbol) queryParams.set('symbol', symbol);
    if (page) queryParams.set('page', page);
    if (limit) queryParams.set('limit', limit);
    
    const endpoint = `/api/earnings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    // Forward the request to backend API with cookies
    const data = await serverApiRequestWithCookies(
      endpoint,
      request,
      {
        method: 'GET',
      }
    );
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GET /api/earnings] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStatus = (error as any)?.status || 500;
    const isConnectionError = (error as any)?.isConnectionError || false;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://72.60.233.159:3050';
    
    // Provide more detailed error information for connection errors
    if (isConnectionError) {
      return NextResponse.json(
        { 
          error: 'Backend connection failed',
          message: `Cannot connect to backend at ${backendUrl}. Please check:\n1. Backend server is running\n2. NEXT_PUBLIC_API_URL is set correctly in .env.local\n3. Network connectivity is available`,
          backendUrl,
          details: (error as any)?.details || {},
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch earnings data',
        message: errorMessage,
        details: (error as any)?.details || {},
      },
      { status: errorStatus }
    );
  }
}
