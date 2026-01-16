import { NextRequest, NextResponse } from 'next/server';
import { serverApiRequestWithCookies, API_CONFIG } from '@/lib/api-config';

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
    const orderBy = searchParams.get('orderBy') || 'date';
    const order = searchParams.get('order') || 'desc';
    
    // Get backend URL from API_CONFIG - defaults to remote backend (http://72.60.233.159:3050)
    const backendUrl = API_CONFIG.BASE_URL;
    const isLocalhost = backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1');
    
    // Debug logging to confirm backend URL
    console.log('[GET /api/stock-analyses/[id]/daily-scores] Forwarding request to backend');
    console.log('[GET /api/stock-analyses/[id]/daily-scores] Backend URL:', backendUrl);
    console.log('[GET /api/stock-analyses/[id]/daily-scores] Using remote backend:', !isLocalhost);
    
    if (isLocalhost) {
      console.warn('[GET /api/stock-analyses/[id]/daily-scores] WARNING: Using localhost backend. Set NEXT_PUBLIC_API_URL=http://72.60.233.159:3050 to use remote backend.');
    }
    
    // Forward the request to backend API with cookies, including all query parameters
    const endpoint = `/api/stock-analyses/${numericId}/daily-scores?page=${page}&limit=${limit}&orderBy=${orderBy}&order=${order}`;
    const data = await serverApiRequestWithCookies(
      endpoint,
      request
    );
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GET /api/stock-analyses/[id]/daily-scores] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStatus = (error as any)?.status || 500;
    const isConnectionError = (error as any)?.isConnectionError || false;
    const backendUrl = API_CONFIG.BASE_URL;
    
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
        error: 'Failed to fetch daily scores',
        message: errorMessage,
        details: (error as any)?.details || {},
      },
      { status: errorStatus }
    );
  }
}
