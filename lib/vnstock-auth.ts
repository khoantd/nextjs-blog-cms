// Vnstock Authentication Service
// Handles JWT token management server-side only

import { cookies } from 'next/headers';
import type { VnstockAuthToken, LoginRequest, RegisterRequest } from './types/vnstock';

const VNSTOCK_TOKEN_COOKIE = 'vnstock_token';
const VNSTOCK_TOKEN_EXPIRY_COOKIE = 'vnstock_token_expiry';

/**
 * Get vnstock API base URL from environment
 */
function getVnstockApiUrl(): string {
  return process.env.NEXT_PUBLIC_VNSTOCK_API_URL || 'http://72.60.233.159:8002';
}

/**
 * Get stored vnstock token from cookies (server-side only)
 */
export async function getVnstockToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(VNSTOCK_TOKEN_COOKIE);
    const expiry = cookieStore.get(VNSTOCK_TOKEN_EXPIRY_COOKIE);

    if (!token) {
      return null;
    }

    // Check if token is expired
    if (expiry) {
      const expiryTime = parseInt(expiry.value, 10);
      if (expiryTime && Date.now() >= expiryTime) {
        // Token expired, clear it
        await clearVnstockToken();
        return null;
      }
    }

    return token.value;
  } catch (error) {
    console.error('Error getting vnstock token:', error);
    return null;
  }
}

/**
 * Store vnstock token in HTTP-only cookie (server-side only)
 */
export async function setVnstockToken(token: VnstockAuthToken): Promise<void> {
  try {
    const cookieStore = await cookies();
    
    // Calculate expiry time (default to 24 hours if not provided)
    const expiresAt = token.expires_at 
      ? new Date(token.expires_at * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    cookieStore.set(VNSTOCK_TOKEN_COOKIE, token.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    cookieStore.set(VNSTOCK_TOKEN_EXPIRY_COOKIE, expiresAt.getTime().toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });
  } catch (error) {
    console.error('Error setting vnstock token:', error);
    throw error;
  }
}

/**
 * Clear vnstock token from cookies
 */
export async function clearVnstockToken(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(VNSTOCK_TOKEN_COOKIE);
    cookieStore.delete(VNSTOCK_TOKEN_EXPIRY_COOKIE);
  } catch (error) {
    console.error('Error clearing vnstock token:', error);
  }
}

/**
 * Check if user is authenticated with vnstock API
 */
export async function isVnstockAuthenticated(): Promise<boolean> {
  const token = await getVnstockToken();
  return token !== null;
}

/**
 * Login to vnstock API
 */
export async function loginVnstock(credentials: LoginRequest): Promise<VnstockAuthToken> {
  const apiUrl = getVnstockApiUrl();
  const loginUrl = `${apiUrl}/auth/login`;
  
  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      
      // Try to parse error response
      try {
        const error = await response.json();
        errorDetail = error.detail || error.message || errorDetail;
      } catch {
        // If response is not JSON, use status text
        const text = await response.text().catch(() => '');
        if (text) {
          errorDetail = text.length > 200 ? text.substring(0, 200) : text;
        }
      }
      
      // Provide more context for 404 errors
      if (response.status === 404) {
        throw new Error(`Vnstock API endpoint not found. Please check if the API is running at ${apiUrl}. Error: ${errorDetail}`);
      }
      
      throw new Error(errorDetail);
    }

    const token: VnstockAuthToken = await response.json();
    
    // Store token
    await setVnstockToken(token);
    
    return token;
  } catch (error: any) {
    // Handle network errors (ECONNREFUSED, ENOTFOUND, etc.)
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      throw new Error(`Cannot connect to vnstock API at ${apiUrl}. Please check if the API server is running.`);
    }
    if (error.code === 'ENOTFOUND' || error.message?.includes('ENOTFOUND')) {
      throw new Error(`Cannot resolve vnstock API hostname. Please check the API URL: ${apiUrl}`);
    }
    if (error.message?.includes('fetch failed')) {
      throw new Error(`Network error connecting to vnstock API at ${apiUrl}. Please check your network connection and ensure the API server is accessible.`);
    }
    
    // Re-throw if it's already a formatted error
    throw error;
  }
}

/**
 * Register new user with vnstock API
 */
export async function registerVnstock(userData: RegisterRequest): Promise<void> {
  const apiUrl = getVnstockApiUrl();
  const registerUrl = `${apiUrl}/auth/register`;
  
  try {
    const response = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

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
      
      if (response.status === 404) {
        throw new Error(`Vnstock API endpoint not found. Please check if the API is running at ${apiUrl}. Error: ${errorDetail}`);
      }
      
      throw new Error(errorDetail);
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      throw new Error(`Cannot connect to vnstock API at ${apiUrl}. Please check if the API server is running.`);
    }
    if (error.code === 'ENOTFOUND' || error.message?.includes('ENOTFOUND')) {
      throw new Error(`Cannot resolve vnstock API hostname. Please check the API URL: ${apiUrl}`);
    }
    if (error.message?.includes('fetch failed')) {
      throw new Error(`Network error connecting to vnstock API at ${apiUrl}. Please check your network connection and ensure the API server is accessible.`);
    }
    throw error;
  }
}

/**
 * Get current user info from vnstock API
 */
export async function getVnstockCurrentUser() {
  const token = await getVnstockToken();
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const apiUrl = getVnstockApiUrl();
  const meUrl = `${apiUrl}/auth/me`;
  
  try {
    const response = await fetch(meUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid, clear it
        await clearVnstockToken();
        throw new Error('Authentication expired');
      }
      
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
      
      if (response.status === 404) {
        throw new Error(`Vnstock API endpoint not found. Please check if the API is running at ${apiUrl}. Error: ${errorDetail}`);
      }
      
      throw new Error(errorDetail);
    }

    return response.json();
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      throw new Error(`Cannot connect to vnstock API at ${apiUrl}. Please check if the API server is running.`);
    }
    if (error.code === 'ENOTFOUND' || error.message?.includes('ENOTFOUND')) {
      throw new Error(`Cannot resolve vnstock API hostname. Please check the API URL: ${apiUrl}`);
    }
    if (error.message?.includes('fetch failed')) {
      throw new Error(`Network error connecting to vnstock API at ${apiUrl}. Please check your network connection and ensure the API server is accessible.`);
    }
    throw error;
  }
}

/**
 * Logout from vnstock API
 */
export async function logoutVnstock(): Promise<void> {
  await clearVnstockToken();
}
