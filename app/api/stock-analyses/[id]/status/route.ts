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
    
    // Forward the request to backend API with cookies
    const endpoint = `/api/stock-analyses/${numericId}/status`;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://72.60.233.159:3050';
    
    // Log which backend is being used (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[GET /api/stock-analyses/[id]/status] Forwarding to backend: ${backendUrl}${endpoint}`);
    }
    
    const data = await serverApiRequestWithCookies(
      endpoint,
      request
    );
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GET /api/stock-analyses/[id]/status] Error:', error);
    
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
        error: 'Failed to fetch stock analysis status',
        message: errorMessage,
        details: (error as any)?.details || {},
      },
      { status: errorStatus }
    );
  }
}
