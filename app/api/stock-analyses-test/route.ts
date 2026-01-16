import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/api-config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    
    // Forward the request to backend without authentication for testing
    const backendUrl = `${API_CONFIG.BASE_URL}/api/stock-analyses?page=${page}&limit=${limit}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: error.error?.message || `HTTP ${response.status}: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Stock Analyses Test API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch stock analyses',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
