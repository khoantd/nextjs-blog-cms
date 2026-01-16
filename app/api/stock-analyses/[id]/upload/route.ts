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

    // Get backend URL from environment - defaults to remote backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://72.60.233.159:3050';
    const uploadEndpoint = `${backendUrl}/api/stock-analyses/${numericId}/upload`;
    const isLocalhost = backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1');
    
    // Debug: Log cookie forwarding and backend URL
    const cookieHeader = request.headers.get('cookie');
    console.log('[POST /api/stock-analyses/[id]/upload] Forwarding request to backend');
    console.log('[POST /api/stock-analyses/[id]/upload] Backend URL:', backendUrl);
    console.log('[POST /api/stock-analyses/[id]/upload] Upload endpoint:', uploadEndpoint);
    console.log('[POST /api/stock-analyses/[id]/upload] Analysis ID:', numericId);
    console.log('[POST /api/stock-analyses/[id]/upload] Cookies present:', !!cookieHeader);
    console.log('[POST /api/stock-analyses/[id]/upload] Using remote backend:', !isLocalhost);
    
    if (isLocalhost) {
      console.warn('[POST /api/stock-analyses/[id]/upload] WARNING: Using localhost backend. Set NEXT_PUBLIC_API_URL=http://72.60.233.159:3050 to use remote backend.');
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
    console.log('[POST /api/stock-analyses/[id]/upload] Attempting to connect to:', uploadEndpoint);
    
    let response: Response;
    try {
      response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: requestBody,
        headers,
        // @ts-ignore - duplex is needed for streaming request body
        duplex: 'half',
      });
      console.log('[POST /api/stock-analyses/[id]/upload] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });
    } catch (fetchError: any) {
      const errorMessage = fetchError?.message || fetchError?.toString() || 'Unknown fetch error';
      console.error('[POST /api/stock-analyses/[id]/upload] Fetch failed:', {
        uploadEndpoint,
        backendUrl,
        error: errorMessage,
        errorType: fetchError?.name || typeof fetchError,
      });
      
      const isConnectionError = 
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('network') ||
        errorMessage.includes('Failed to fetch');
      
      if (isConnectionError) {
        return NextResponse.json(
          {
            error: 'Backend connection failed',
            message: `Cannot connect to backend at ${uploadEndpoint}. Please ensure the backend server is running and accessible.`,
            backendUrl: backendUrl,
            uploadEndpoint: uploadEndpoint,
          },
          { status: 503 }
        );
      }
      
      throw fetchError;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = errorData.error?.message || errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      
      console.error('[POST /api/stock-analyses/[id]/upload] Backend error:', {
        status: response.status,
        error: errorMessage,
        backendUrl: uploadEndpoint,
        fullErrorData: errorData,
      });
      
      // Check if error is about file path resolution
      if (errorMessage.includes('ENOENT') || errorMessage.includes('no such file')) {
        console.error('[POST /api/stock-analyses/[id]/upload] File path error detected. This suggests the backend needs the updated path resolution code.');
        console.error('[POST /api/stock-analyses/[id]/upload] Backend URL being used:', backendUrl);
        console.error('[POST /api/stock-analyses/[id]/upload] This error indicates the remote backend is receiving the request but has path resolution issues.');
        console.error('[POST /api/stock-analyses/[id]/upload] The backend code needs to be updated with absolute path resolution fixes.');
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to upload CSV',
          message: errorMessage,
          backendUrl: backendUrl, // Include backend URL in response for debugging
          uploadEndpoint: uploadEndpoint,
          note: errorMessage.includes('ENOENT') 
            ? 'The backend received the request but failed to resolve the file path. The backend code needs to be updated with absolute path resolution.'
            : undefined,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[POST /api/stock-analyses/[id]/upload] Error:', error);
    
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
        error: 'Failed to upload CSV',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}
