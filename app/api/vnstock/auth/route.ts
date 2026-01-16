import { NextRequest, NextResponse } from 'next/server';
import {
  loginVnstock,
  registerVnstock,
  getVnstockCurrentUser,
  logoutVnstock,
  getVnstockToken,
} from '@/lib/vnstock-auth';
import type { LoginRequest, RegisterRequest } from '@/lib/types/vnstock';

const VNSTOCK_API_URL = process.env.NEXT_PUBLIC_VNSTOCK_API_URL || 'http://72.60.233.159:8002';

/**
 * POST /api/vnstock/auth/login
 * Login to vnstock API
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.pathname.split('/auth/')[1] || 'login';
    const body = await request.json();

    if (action === 'login' || url.pathname.endsWith('/login')) {
      const credentials: LoginRequest = {
        username: body.username,
        password: body.password,
      };

      const token = await loginVnstock(credentials);
      return NextResponse.json(token);
    }

    if (action === 'register' || url.pathname.endsWith('/register')) {
      const userData: RegisterRequest = {
        username: body.username,
        email: body.email,
        password: body.password,
      };

      await registerVnstock(userData);
      return NextResponse.json({ message: 'Registration successful' });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use /login or /register' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Vnstock auth error:', error);
    
    // Determine appropriate status code
    let status = 500;
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      status = 401;
    } else if (error.message?.includes('400') || error.message?.includes('Bad Request')) {
      status = 400;
    } else if (error.message?.includes('404') || error.message?.includes('not found')) {
      status = 404;
    } else if (error.message?.includes('Cannot connect') || error.message?.includes('Network error')) {
      status = 503; // Service Unavailable
    }
    
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status }
    );
  }
}

/**
 * GET /api/vnstock/auth/me
 * Get current user info
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

/**
 * DELETE /api/vnstock/auth/logout
 * Logout from vnstock API
 */
export async function DELETE() {
  try {
    await logoutVnstock();
    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Vnstock logout error:', error);
    return NextResponse.json(
      { error: error.message || 'Logout failed' },
      { status: 500 }
    );
  }
}
