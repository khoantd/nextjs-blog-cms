import { NextRequest, NextResponse } from 'next/server';
import { getVnstockToken } from '@/lib/vnstock-auth';

const VNSTOCK_API_URL = process.env.NEXT_PUBLIC_VNSTOCK_API_URL || 'http://72.60.233.159:8002';

/**
 * Proxy requests to vnstock company endpoints
 * POST /api/vnstock/company/{endpoint}
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ endpoint: string }> }
) {
  const { endpoint } = await params;
  
  try {
    const token = await getVnstockToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated. Please login first.' },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON format.' },
        { status: 400 }
      );
    }

    const targetUrl = `${VNSTOCK_API_URL}/api/v1/company/${endpoint}`;
    
    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (fetchError: any) {
      // Handle network errors
      const errorMessage = fetchError.code === 'ECONNREFUSED' || fetchError.message?.includes('ECONNREFUSED')
        ? `Cannot connect to vnstock API at ${VNSTOCK_API_URL}. Please check if the API server is running.`
        : fetchError.code === 'ENOTFOUND' || fetchError.message?.includes('ENOTFOUND')
        ? `Cannot resolve vnstock API hostname. Please check the API URL: ${VNSTOCK_API_URL}`
        : `Network error connecting to vnstock API: ${fetchError.message || 'Unknown error'}`;
      
      console.error('Vnstock company API network error:', fetchError);
      return NextResponse.json(
        { error: errorMessage },
        { status: 503 }
      );
    }

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      let errorData: any = null;
      
      // Read response body once as text, then try to parse as JSON
      try {
        const responseText = await response.text();
        
        if (responseText) {
          // Try to parse as JSON
          try {
            errorData = JSON.parse(responseText);
            errorDetail = errorData.detail || errorData.error || errorData.message || errorDetail;
          } catch (jsonError) {
            // Not JSON, use text directly
            errorDetail = responseText.length > 200 ? responseText.substring(0, 200) : responseText;
          }
        }
      } catch (readError) {
        // If reading response fails, use status text
        errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      // Log detailed error information for debugging
      console.error('Vnstock company API error response:', {
        endpoint,
        targetUrl,
        status: response.status,
        statusText: response.statusText,
        errorDetail,
        errorData,
      });
      
      if (response.status === 401) {
        // Token expired, clear it
        const { clearVnstockToken } = await import('@/lib/vnstock-auth');
        await clearVnstockToken();
        return NextResponse.json(
          { error: 'Authentication expired. Please login again.' },
          { status: 401 }
        );
      }
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: `Vnstock API endpoint not found: ${targetUrl}. Please check if the API is running and the endpoint exists.` },
          { status: 404 }
        );
      }
      
      if (response.status === 500) {
        return NextResponse.json(
          { 
            error: `Remote vnstock API server error: ${errorDetail}`,
            detail: errorDetail,
            endpoint: targetUrl,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { 
          error: errorDetail,
          detail: errorDetail,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Vnstock company API error:', {
      error: error.message || String(error),
      stack: error.stack,
      name: error.name,
      endpoint,
    });
    
    // Provide more context for different error types
    let errorMessage = error.message || 'Failed to fetch company data';
    if (error.message?.includes('JSON')) {
      errorMessage = 'Invalid response format from API. Please check the API endpoint.';
    } else if (error.message?.includes('Unexpected token')) {
      errorMessage = 'API returned invalid data format. Please check the API response.';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        detail: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
