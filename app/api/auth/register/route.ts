import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/api-config';
import { z } from 'zod';

// Route segment config - ensure this route is handled dynamically
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Ensure this route is matched before NextAuth catch-all
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
});

export async function POST(request: NextRequest) {
  console.log('[Register Route] POST /api/auth/register - Route handler called');
  console.log('[Register Route] Request URL:', request.url);
  
  try {
    const body = await request.json();
    console.log('[Register Route] Request body received:', { email: body?.email, hasPassword: !!body?.password });

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
    const backendEndpoint = `${backendUrl}/api/auth/register`;
    console.log(`[Register API] Calling backend: ${backendEndpoint}`);
    console.log(`[Register API] Backend URL from config: ${API_CONFIG.BASE_URL}`);
    
    let response: Response;
    try {
      response = await fetch(backendEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });
    } catch (fetchError: any) {
      console.error('[Register API] Fetch error:', fetchError);
      const isConnectionError = 
        fetchError?.message?.includes('ECONNREFUSED') ||
        fetchError?.message?.includes('ENOTFOUND') ||
        fetchError?.message?.includes('fetch failed');
      
      if (isConnectionError) {
        return NextResponse.json(
          {
            error: 'Backend connection failed',
            message: `Cannot connect to backend at ${backendUrl}. Please ensure the backend server is running.`,
            backendUrl: backendUrl,
          },
          { status: 503 }
        );
      }
      throw fetchError;
    }

    console.log(`[Register API] Backend response status: ${response.status}`);
    const data = await response.json().catch((parseError) => {
      console.error('[Register API] Failed to parse backend response:', parseError);
      return { error: 'Failed to parse backend response' };
    });
    
    console.log(`[Register API] Backend response data:`, { 
      hasError: !!data.error, 
      hasMessage: !!data.message,
      status: response.status 
    });

    if (!response.ok) {
      // Handle different error response formats
      const errorMessage = data.message || 
                          data.error?.message || 
                          data.error || 
                          'Failed to register user';
      
      console.error(`[Register API] Backend error (${response.status}):`, {
        message: errorMessage,
        data: data,
        url: backendEndpoint
      });
      
      return NextResponse.json(
        {
          error: typeof data.error === 'string' ? data.error : 'Registration failed',
          message: typeof errorMessage === 'string' ? errorMessage : 'Failed to register user',
          status: response.status,
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
