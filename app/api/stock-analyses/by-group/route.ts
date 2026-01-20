import { NextRequest, NextResponse } from 'next/server';
import { serverApiRequestWithCookies } from '@/lib/api-config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const group = searchParams.get('group');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const minIncrease = searchParams.get('minIncrease');
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    
    // Validate required parameters
    if (!group || !dateFrom || !dateTo || !minIncrease) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          message: 'group, dateFrom, dateTo, and minIncrease are required',
        },
        { status: 400 }
      );
    }
    
    // Build query string
    const queryParams = new URLSearchParams({
      group,
      dateFrom,
      dateTo,
      minIncrease,
      page,
      limit,
    });
    
    // Forward the request to backend API with cookies
    const endpoint = `/api/stock-analyses/by-group?${queryParams.toString()}`;
    const data = await serverApiRequestWithCookies(
      endpoint,
      request
    );
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Stock Analyses by-group API Error:', error);
    
    const isConnectionError = (error as any)?.isConnectionError || false;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://72.60.233.159:3050';
    
    if (isConnectionError) {
      return NextResponse.json(
        {
          error: 'Backend connection failed',
          message: `Cannot connect to backend at ${backendUrl}`,
          backendUrl,
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Failed to fetch stocks by group',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
