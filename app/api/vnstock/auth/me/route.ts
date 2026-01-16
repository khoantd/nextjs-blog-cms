import { NextRequest, NextResponse } from 'next/server';
import { getVnstockCurrentUser } from '@/lib/vnstock-auth';

/**
 * GET /api/vnstock/auth/me
 * Get current user info from vnstock API
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getVnstockCurrentUser();
    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Vnstock get user error:', error);
    
    // Determine appropriate status code
    let status = 500;
    if (error.message?.includes('Not authenticated') || error.message?.includes('expired') || error.message?.includes('401')) {
      status = 401;
    } else if (error.message?.includes('404') || error.message?.includes('not found')) {
      status = 404;
    } else if (error.message?.includes('Cannot connect') || error.message?.includes('Network error')) {
      status = 503; // Service Unavailable
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to get user info' },
      { status }
    );
  }
}
