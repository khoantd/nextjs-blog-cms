import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/api-config';

/**
 * Proxy route for /api/users/by-email
 * This avoids CORS issues by proxying client requests through Next.js server
 * The backend endpoint is public and doesn't require authentication
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Get backend URL - prefer configured URL, fallback to remote backend
    const configuredBackendUrl = API_CONFIG.BASE_URL;
    const remoteBackendUrl = 'http://72.60.233.159:3050';
    const isLocalhost = configuredBackendUrl.includes('localhost') || configuredBackendUrl.includes('127.0.0.1');
    
    // Try configured backend first, fallback to remote if localhost fails
    let backendUrl = configuredBackendUrl;
    let attemptRemote = false;
    
    if (isLocalhost) {
      console.log(`[Proxy] Using configured localhost backend: ${backendUrl}`);
      console.log(`[Proxy] Will fallback to remote backend if local fails: ${remoteBackendUrl}`);
    } else {
      console.log(`[Proxy] Using configured remote backend: ${backendUrl}`);
    }

    const backendEndpoint = `${backendUrl}/api/users/by-email?email=${encodeURIComponent(email)}`;
    console.log(`[Proxy] Proxying request to backend: ${backendEndpoint}`);

    let response: Response;
    let fetchError: any = null;

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      response = await fetch(backendEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
    } catch (error: any) {
      fetchError = error;
      const errorMessage = error?.message || String(error);
      const isConnectionError = 
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('aborted') ||
        error?.name === 'AbortError';

      // If localhost fails with connection error, try remote backend
      if (isLocalhost && isConnectionError) {
        console.warn(`[Proxy] ⚠️ Local backend connection failed: ${errorMessage}`);
        console.log(`[Proxy] 🔄 Falling back to remote backend: ${remoteBackendUrl}`);
        
        attemptRemote = true;
        const remoteEndpoint = `${remoteBackendUrl}/api/users/by-email?email=${encodeURIComponent(email)}`;
        
        try {
          const remoteController = new AbortController();
          const remoteTimeoutId = setTimeout(() => remoteController.abort(), 5000);
          
          response = await fetch(remoteEndpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: remoteController.signal,
            cache: 'no-store',
          });
          
          clearTimeout(remoteTimeoutId);
          console.log(`[Proxy] ✅ Remote backend responded with status: ${response.status}`);
        } catch (remoteError: any) {
          console.error(`[Proxy] ❌ Remote backend also failed:`, remoteError?.message || remoteError);
          throw new Error(
            `Both local and remote backends failed. Local: ${errorMessage}, Remote: ${remoteError?.message || 'Unknown error'}`
          );
        }
      } else {
        // Re-throw non-connection errors or if not localhost
        throw error;
      }
    }

    // Parse response
    let data: any;
    try {
      const responseText = await response.text();
      if (responseText) {
        data = JSON.parse(responseText);
      } else {
        data = {};
      }
    } catch (parseError) {
      console.error(`[Proxy] Failed to parse response:`, parseError);
      data = { error: `Failed to parse backend response` };
    }

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error(`[Proxy] Backend error (${response.status}):`, {
        error: errorMsg,
        attemptRemote,
        backendUrl: attemptRemote ? remoteBackendUrl : backendUrl,
      });
      return NextResponse.json(data, { status: response.status });
    }

    console.log(`[Proxy] ✅ Successfully proxied response for email: ${email} (from ${attemptRemote ? 'remote' : 'configured'} backend)`);
    return NextResponse.json(data);
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    console.error('[Proxy] ❌ Error proxying request:', {
      error: errorMessage,
      stack: error?.stack,
      name: error?.name,
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch user role',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          stack: error?.stack,
          name: error?.name,
        } : undefined
      },
      { status: 500 }
    );
  }
}
