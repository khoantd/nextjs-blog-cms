import { NextRequest, NextResponse } from 'next/server';

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

    // Get backend URL from environment - defaults to remote backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://72.60.233.159:3050';
    const supplementEndpoint = `${backendUrl}/api/stock-analyses/${numericId}/supplement`;
    const isLocalhost = backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1');
    
    // Debug: Log cookie forwarding
    const cookieHeader = request.headers.get('cookie');
    console.log('[POST /api/stock-analyses/[id]/supplement] Forwarding request to backend');
    console.log('[POST /api/stock-analyses/[id]/supplement] Backend URL:', backendUrl);
    console.log('[POST /api/stock-analyses/[id]/supplement] Analysis ID:', numericId);
    console.log('[POST /api/stock-analyses/[id]/supplement] Cookies present:', !!cookieHeader);
    console.log('[POST /api/stock-analyses/[id]/supplement] Using remote backend:', !isLocalhost);
    
    if (isLocalhost) {
      console.warn('[POST /api/stock-analyses/[id]/supplement] WARNING: Using localhost backend. Set NEXT_PUBLIC_API_URL=http://72.60.233.159:3050 to use remote backend.');
    }
    
    // Get the request body as a stream and forward it directly to backend
    // This preserves the multipart/form-data encoding
    const requestBody = request.body;
    
    if (!requestBody) {
      return NextResponse.json(
        { error: 'No request body provided' },
        { status: 400 }
      );
    }
    
    // Get Content-Type header from original request to preserve multipart boundary
    const contentType = request.headers.get('content-type') || 'multipart/form-data';
    
    // Forward cookies to backend
    const headers: HeadersInit = {
      'Content-Type': contentType,
      ...(cookieHeader && { 'Cookie': cookieHeader }),
    };
    
    // Forward the request stream directly to backend API
    // This preserves the multipart/form-data encoding and file stream
    const response = await fetch(supplementEndpoint, {
      method: 'POST',
      body: requestBody,
      headers,
      // @ts-ignore - duplex is needed for streaming request body
      duplex: 'half',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = errorData.error?.message || errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      
      console.error('[POST /api/stock-analyses/[id]/supplement] Backend error:', {
        status: response.status,
        error: errorMessage,
        backendUrl: supplementEndpoint,
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to supplement CSV',
          message: errorMessage
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[POST /api/stock-analyses/[id]/supplement] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = 
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('network');
    
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://72.60.233.159:3050';
    
    if (isConnectionError) {
      return NextResponse.json(
        {
          error: 'Backend service unavailable',
          message: `Cannot connect to backend at ${backendUrl}. Please ensure the backend is running and NEXT_PUBLIC_API_URL is set correctly in .env.local`,
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to supplement CSV',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}
