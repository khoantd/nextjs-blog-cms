import { NextRequest, NextResponse } from 'next/server';
import { getVnstockToken } from '@/lib/vnstock-auth';

const VNSTOCK_API_URL = process.env.NEXT_PUBLIC_VNSTOCK_API_URL || 'http://72.60.233.159:8002';

/**
 * Proxy requests to vnstock download endpoints
 * POST /api/vnstock/download/{endpoint}
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

    const targetUrl = `${VNSTOCK_API_URL}/api/v1/download/${endpoint}`;
    
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
      
      console.error('Vnstock download API network error:', fetchError);
      return NextResponse.json(
        { error: errorMessage },
        { status: 503 }
      );
    }

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const error = await response.json();
        errorDetail = error.detail || error.message || errorDetail;
      } catch {
        const text = await response.text().catch(() => '');
        if (text) {
          errorDetail = text.length > 200 ? text.substring(0, 200) : text;
        }
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

    // Check content type to handle CSV responses
    const contentType = response.headers.get('content-type') || '';
    
    // Read response as text first (we can parse JSON from text, but not vice versa)
    const responseText = await response.text();
    
    if (contentType.includes('text/csv') || endpoint === 'csv') {
      // Handle CSV response - wrap in JSON format
      const { symbol, start_date, end_date, source } = body;
      
      return NextResponse.json({
        symbol: symbol || '',
        csv_content: responseText,
        start_date: start_date || '',
        end_date: end_date || '',
        source: source || 'vci',
      });
    } else {
      // Try to parse as JSON
      try {
        const data = JSON.parse(responseText);
        return NextResponse.json(data);
      } catch (parseError) {
        // If JSON parsing fails, it might be CSV or other text format
        // Check if it looks like CSV (starts with comma or has CSV-like structure)
        if (responseText.trim().startsWith(',') || responseText.includes(',time,tick')) {
          // It's CSV - wrap it in JSON format
          const { symbol, start_date, end_date, source } = body;
          return NextResponse.json({
            symbol: symbol || '',
            csv_content: responseText,
            start_date: start_date || '',
            end_date: end_date || '',
            source: source || 'vci',
          });
        }
        
        // Otherwise, return error with preview
        return NextResponse.json(
          { error: `Failed to parse response. Expected JSON but received: ${responseText.substring(0, 200)}` },
          { status: 500 }
        );
      }
    }
  } catch (error: any) {
    console.error('Vnstock download API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download data' },
      { status: 500 }
    );
  }
}
