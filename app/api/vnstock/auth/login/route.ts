import { NextRequest, NextResponse } from 'next/server';
import { loginVnstock } from '@/lib/vnstock-auth';
import type { LoginRequest } from '@/lib/types/vnstock';

/**
 * POST /api/vnstock/auth/login
 * Login to vnstock API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const credentials: LoginRequest = {
      username: body.username,
      password: body.password,
    };

    const token = await loginVnstock(credentials);
    return NextResponse.json(token);
  } catch (error: any) {
    console.error('Vnstock login error:', error);
    
    // Determine appropriate status code
    let status = 500;
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      status = 401;
    } else if (error.message?.includes('404') || error.message?.includes('not found')) {
      status = 404;
    } else if (error.message?.includes('Cannot connect') || error.message?.includes('Network error')) {
      status = 503; // Service Unavailable
    }
    
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status }
    );
  }
}
