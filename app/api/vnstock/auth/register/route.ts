import { NextRequest, NextResponse } from 'next/server';
import { registerVnstock } from '@/lib/vnstock-auth';
import type { RegisterRequest } from '@/lib/types/vnstock';

/**
 * POST /api/vnstock/auth/register
 * Register new user with vnstock API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userData: RegisterRequest = {
      username: body.username,
      email: body.email,
      password: body.password,
    };

    await registerVnstock(userData);
    return NextResponse.json({ message: 'Registration successful' });
  } catch (error: any) {
    console.error('Vnstock register error:', error);
    
    // Determine appropriate status code
    let status = 500;
    if (error.message?.includes('400') || error.message?.includes('Bad Request')) {
      status = 400;
    } else if (error.message?.includes('404') || error.message?.includes('not found')) {
      status = 404;
    } else if (error.message?.includes('Cannot connect') || error.message?.includes('Network error')) {
      status = 503; // Service Unavailable
    }
    
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status }
    );
  }
}
