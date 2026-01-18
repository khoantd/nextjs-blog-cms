import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/api-config';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: validation.error.issues[0]?.message || 'Invalid input',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { email, password, name } = validation.data;

    // Call backend registration endpoint
    const backendUrl = API_CONFIG.BASE_URL;
    const response = await fetch(`${backendUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.error || 'Registration failed',
          message: data.message || data.error || 'Failed to register user',
        },
        { status: response.status }
      );
    }

    return NextResponse.json(
      {
        data: data.data,
        message: 'Registration successful',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration API error:', error);
    
    // Handle connection errors
    const isConnectionError = 
      error?.message?.includes('ECONNREFUSED') ||
      error?.message?.includes('ENOTFOUND') ||
      error?.message?.includes('fetch failed') ||
      error?.isConnectionError;

    if (isConnectionError) {
      return NextResponse.json(
        {
          error: 'Backend connection failed',
          message: `Cannot connect to backend at ${API_CONFIG.BASE_URL}`,
          backendUrl: API_CONFIG.BASE_URL,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Registration failed',
        message: error?.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
