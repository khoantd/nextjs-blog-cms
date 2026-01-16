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
    const endpoint = `/api/stock-analyses/${numericId}`;
    const data = await serverApiRequestWithCookies(
      endpoint,
      request,
      { method: 'DELETE' }
    );
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Stock Analysis DELETE API Error:', error);
    console.error('Stock Analysis DELETE API Error Details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to delete stock analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: error instanceof Error && error.message.includes('401') ? 401 : 500 }
    );
  }
}

