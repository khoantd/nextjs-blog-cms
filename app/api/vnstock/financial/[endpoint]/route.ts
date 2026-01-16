import { NextRequest, NextResponse } from 'next/server';
import { getVnstockToken } from '@/lib/vnstock-auth';

const VNSTOCK_API_URL = process.env.NEXT_PUBLIC_VNSTOCK_API_URL || 'http://72.60.233.159:8002';

/**
 * Proxy requests to vnstock financial endpoints
 * POST /api/vnstock/financial/{endpoint}
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ endpoint: string }> }
) {
  try {
    const { endpoint } = await params;
    const token = await getVnstockToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated. Please login first.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const targetUrl = `${VNSTOCK_API_URL}/api/v1/financial/${endpoint}`;
    
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
      const errorMessage = fetchError.code === 'ECONNREFUSED' || fetchError.message?.includes('ECONNREFUSED')
        ? `Cannot connect to vnstock API at ${VNSTOCK_API_URL}. Please check if the API server is running.`
        : fetchError.code === 'ENOTFOUND' || fetchError.message?.includes('ENOTFOUND')
        ? `Cannot resolve vnstock API hostname. Please check the API URL: ${VNSTOCK_API_URL}`
        : `Network error connecting to vnstock API: ${fetchError.message || 'Unknown error'}`;
      
      console.error('Vnstock financial API network error:', fetchError);
      return NextResponse.json(
        { error: errorMessage },
        { status: 503 }
      );
    }

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      
      // Read response body once as text, then try to parse as JSON
      try {
        const responseText = await response.text();
        
        if (responseText) {
          // Try to parse as JSON
          try {
            const error = JSON.parse(responseText);
            errorDetail = error.detail || error.message || errorDetail;
          } catch (jsonError) {
            // Not JSON, use text directly
            errorDetail = responseText.length > 200 ? responseText.substring(0, 200) : responseText;
          }
        }
      } catch (readError) {
        // If reading response fails, use status text
        errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      if (response.status === 401) {
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

      return NextResponse.json(
        { error: errorDetail },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Vnstock financial API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}
