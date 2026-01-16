import { NextRequest, NextResponse } from 'next/server';
import { serverApiRequestWithCookies } from '@/lib/api-config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate id parameter
    if (!id || id === 'undefined' || id === 'null' || id === 'NaN') {
      return NextResponse.json(
        { error: 'Invalid stock analysis ID' },
        { status: 400 }
      );
    }

    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      return NextResponse.json(
        { error: 'Invalid stock analysis ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '50';
    
    // Forward the request to backend API with cookies
    const endpoint = `/api/stock-analyses/${numericId}/daily-factor-data?page=${page}&limit=${limit}`;
    const data = await serverApiRequestWithCookies(
      endpoint,
      request
    );
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GET /api/stock-analyses/[id]/daily-factor-data] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStatus = (error as any)?.status || 500;
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch daily factor data',
        message: errorMessage
      },
      { status: errorStatus }
    );
  }
}
