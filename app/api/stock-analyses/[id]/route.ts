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
    const excludeData = searchParams.get('excludeData') === 'true';
    
    // Debug: Log cookie forwarding
    const cookieHeader = request.headers.get('cookie');
    console.log('Frontend API [id] - Forwarding request to backend');
    console.log('Frontend API [id] - Cookies present:', !!cookieHeader);
    if (cookieHeader) {
      const hasNextAuthCookie = cookieHeader.includes('next-auth.session-token') || cookieHeader.includes('__Secure-next-auth.session-token');
      console.log('Frontend API [id] - NextAuth cookie present:', hasNextAuthCookie);
    }
    
    // Forward the request to backend API with cookies
    const endpoint = `/api/stock-analyses/${numericId}${excludeData ? '?excludeData=true' : ''}`;
    const data = await serverApiRequestWithCookies(
      endpoint,
      request
    );
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Stock Analysis [id] API Error:', error);
    console.error('Stock Analysis [id] API Error Details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch stock analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: error instanceof Error && error.message.includes('401') ? 401 : 500 }
    );
  }
}

export async function PATCH(
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
    
    // Get request body
    const body = await request.json();
    
    // Forward the request to backend API with cookies
    const endpoint = `/api/stock-analyses/${numericId}`;
    const data = await serverApiRequestWithCookies(
      endpoint,
      request,
      { 
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    );
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Stock Analysis PATCH API Error:', error);
    console.error('Stock Analysis PATCH API Error Details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to update stock analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: error instanceof Error && error.message.includes('401') ? 401 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string | undefined;
  let numericId: number | undefined;
  
  try {
    const paramsData = await params;
    id = paramsData.id;
    
    // Validate id parameter
    if (!id || id === 'undefined' || id === 'null' || id === 'NaN') {
      return NextResponse.json(
        { error: 'Invalid stock analysis ID' },
        { status: 400 }
      );
    }

    numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      return NextResponse.json(
        { error: 'Invalid stock analysis ID' },
        { status: 400 }
      );
    }
    
    // Forward the request to backend API with cookies
    const endpoint = `/api/stock-analyses/${numericId}`;
    const data = await serverApiRequestWithCookies(
      endpoint,
      request,
      { method: 'DELETE' }
    );
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[DELETE /api/stock-analyses/[id]] Error:', error);
    
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
    
    // Handle authentication errors
    if (errorStatus === 401 || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Authentication required. Please sign in.',
        },
        { status: 401 }
      );
    }
    
    // Handle permission errors
    if (errorStatus === 403 || errorMessage.includes('403') || errorMessage.includes('permission')) {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions',
          message: 'Only admins can delete stock analyses.',
        },
        { status: 403 }
      );
    }
    
    // Handle not found errors
    if (errorStatus === 404 || errorMessage.includes('404') || errorMessage.includes('not found')) {
      return NextResponse.json(
        { 
          error: 'Stock analysis not found',
          message: id ? `No stock analysis found with ID ${id}` : 'No stock analysis found',
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to delete stock analysis',
        message: errorMessage,
        details: (error as any)?.details || {},
      },
      { status: errorStatus }
    );
  }
}

