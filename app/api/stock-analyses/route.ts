import { NextRequest, NextResponse } from 'next/server';
import { serverApiRequestWithCookies } from '@/lib/api-config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    
    // Get backend URL from environment - defaults to remote backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://72.60.233.159:3050';
    
    // Debug: Log cookie forwarding
    const cookieHeader = request.headers.get('cookie');
    const isLocalhost = backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1');
    
    console.log('[GET /api/stock-analyses] Forwarding request to backend');
    console.log('[GET /api/stock-analyses] Backend URL:', backendUrl);
    console.log('[GET /api/stock-analyses] Cookies present:', !!cookieHeader);
    console.log('[GET /api/stock-analyses] Using remote backend:', !isLocalhost);
    
    if (isLocalhost) {
      console.warn('[GET /api/stock-analyses] WARNING: Using localhost backend. Set NEXT_PUBLIC_API_URL=http://72.60.233.159:3050 to use remote backend.');
    }
    
    if (cookieHeader) {
      const hasNextAuthCookie = cookieHeader.includes('next-auth.session-token') || cookieHeader.includes('__Secure-next-auth.session-token');
      console.log('[GET /api/stock-analyses] NextAuth cookie present:', hasNextAuthCookie);
    } else {
      console.warn('[GET /api/stock-analyses] No cookies found in request! User may not be authenticated.');
    }
    
    // Forward the request to backend API with cookies
    const data = await serverApiRequestWithCookies(
      `/api/stock-analyses?page=${page}&limit=${limit}`,
      request
    );
    
    return NextResponse.json(data);
  } catch (error) {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://72.60.233.159:3050';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const backendError = (error as any)?.backendError || (error as any)?.details;
    
    // Get error status from error object (set by serverApiRequestWithCookies)
    const errorStatus = (error as any)?.status;
    
    // Log full error object for debugging
    console.error('[GET /api/stock-analyses] Error:', errorMessage);
    console.error('[GET /api/stock-analyses] Error Status:', errorStatus);
    console.error('[GET /api/stock-analyses] Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('[GET /api/stock-analyses] Error Details:', {
      message: errorMessage,
      status: errorStatus,
      stack: errorStack,
      backendUrl,
      hasCookies: !!request.headers.get('cookie'),
      // Include full backend error details
      backendError: backendError,
      backendMessage: backendError?.message,
      backendErrorField: backendError?.error,
      backendStack: backendError?.stack,
      backendDetails: backendError?.details,
      // Include all error properties
      errorStatus: errorStatus,
      errorDetails: (error as any)?.details,
      // Check for common connection errors
      isConnectionError: errorMessage.includes('ECONNREFUSED') || 
                        errorMessage.includes('ENOTFOUND') || 
                        errorMessage.includes('fetch failed') ||
                        errorMessage.includes('network'),
    });
    
    // Check if it's an authentication error - check both error message and status code
    const errorMessageLower = errorMessage.toLowerCase();
    const backendErrorMessage = backendError?.message || backendError?.error || '';
    const backendErrorMessageLower = backendErrorMessage.toLowerCase();
    
    const isAuthError = errorStatus === 401 ||
                       errorMessageLower.includes('unauthorized') || 
                       errorMessageLower.includes('401') ||
                       backendErrorMessageLower.includes('unauthorized') ||
                       backendError?.error === 'Unauthorized';
    
    // Check if it's a connection error
    const isConnectionError = errorMessage.includes('ECONNREFUSED') || 
                             errorMessage.includes('ENOTFOUND') || 
                             errorMessage.includes('fetch failed') ||
                             errorMessage.includes('network');
    
    // Extract backend error message if available
    const finalBackendErrorMessage = backendError?.message || backendError?.error || errorMessage;
    const backendErrorDetails = backendError?.details || backendError;
    
    // Use error status if available, otherwise default to 500
    let statusCode = errorStatus || 500;
    let errorResponse: any = {
      error: 'Failed to fetch stock analyses',
      message: finalBackendErrorMessage,
      // Include backend details if available
      ...(backendErrorDetails && typeof backendErrorDetails === 'object' && { details: backendErrorDetails }),
      // Include backend stack for debugging
      ...(backendError?.stack && { stack: backendError.stack }),
    };
    
    if (isAuthError) {
      statusCode = 401;
      errorResponse = {
        error: 'Authentication failed',
        message: finalBackendErrorMessage || 'Unauthorized',
        details: backendErrorDetails || 'Please ensure you are logged in and your session is valid.',
      };
    } else if (isConnectionError) {
      statusCode = 503;
      errorResponse = {
        error: 'Backend service unavailable',
        message: `Cannot connect to backend at ${backendUrl}. Please ensure the backend is running and NEXT_PUBLIC_API_URL is set correctly in .env.local`,
        details: 'If you just updated .env.local, restart your Next.js dev server (NEXT_PUBLIC_* variables are embedded at build time).',
        backendUrl,
      };
    }
    
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[POST /api/stock-analyses] Request body:', body);
    
    // Forward the request to backend API with cookies
    const data = await serverApiRequestWithCookies(
      '/api/stock-analyses',
      request,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
    
    console.log('[POST /api/stock-analyses] Backend response:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[POST /api/stock-analyses] Error:', error);
    console.error('[POST /api/stock-analyses] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      status: (error as any)?.status,
      details: (error as any)?.details,
      backendError: (error as any)?.backendError,
    });
    
    const status = (error as any)?.status || 500;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const backendError = (error as any)?.backendError;
    
    return NextResponse.json(
      { 
        error: 'Failed to create stock analysis',
        message: backendError?.message || backendError?.error || errorMessage,
        details: backendError || (error as any)?.details,
      },
      { status }
    );
  }
}
