import { NextRequest, NextResponse } from 'next/server';
import { serverApiRequestWithCookies } from '@/lib/api-config';

export async function POST(
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

    // Forward the request to backend API with cookies
    const data = await serverApiRequestWithCookies(
      `/api/stock-analyses/${numericId}/import`,
      request,
      {
        method: 'POST',
      }
    );
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[POST /api/stock-analyses/[id]/import] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStatus = (error as any)?.status || 500;
    
    return NextResponse.json(
      { 
        error: 'Failed to import stock analysis data',
        message: errorMessage
      },
      { status: errorStatus }
    );
  }
}
