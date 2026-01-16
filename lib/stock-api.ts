import { apiRequest, API_CONFIG } from './api-config';
import type { StockAnalysis, StockAnalysisResult } from './types/stock-analysis';

export interface StockPriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  lastUpdate: string;
}

export interface StockAnalysisCreate {
  symbol: string;
  name?: string;
  market?: string;
  csvFilePath?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Stock Price API
export const getStockPrice = async (symbol: string, country: 'US' | 'VN' = 'US'): Promise<StockPriceData> => {
  const params = new URLSearchParams({ symbol, country });
  return apiRequest(`${API_CONFIG.ENDPOINTS.STOCK_PRICE}?${params}`);
};

// Stock Analysis APIs
export const getStockAnalyses = async (page = 1, limit = 10): Promise<PaginatedResponse<StockAnalysis>> => {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  
  // Use Next.js API route as proxy to avoid CORS and mixed content issues
  // The API route forwards the request to the remote backend server-side
  // This allows HTTPS frontend to call HTTP backend without browser blocking
  const response = await fetch(`/api/stock-analyses?${params}`, {
    credentials: 'include', // Include cookies for authentication
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || error.message || error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  
  // Backend returns { data: { items: [...], pagination: {...} } }
  // Transform to match frontend expected format { data: [...], pagination: {...} }
  if (result.data && result.data.items) {
    return {
      data: result.data.items,
      pagination: result.data.pagination
    };
  }
  
  // Fallback for unexpected response format
  return {
    data: result.data || [],
    pagination: result.pagination || {
      page,
      limit,
      total: 0,
      totalPages: 0,
    }
  };
};

// Client-side version (uses Next.js API route as proxy)
export const getStockAnalysis = async (id: number, excludeData = false): Promise<{ data: { stockAnalysis: StockAnalysis } }> => {
  const params = excludeData ? '?excludeData=true' : '';
  const response = await fetch(`/api/stock-analyses/${id}${params}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || error.message || error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// Server-side version (for use in server components - uses Next.js API route which forwards cookies)
export const getStockAnalysisServer = async (id: number, excludeData = false): Promise<{ data: { stockAnalysis: StockAnalysis } }> => {
  const { headers } = await import('next/headers');
  const headersList = await headers();
  const cookieHeader = headersList.get('cookie') || '';
  
  // Get the base URL for the Next.js app (for server-side requests)
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const params = excludeData ? '?excludeData=true' : '';
  const url = `${baseUrl}/api/stock-analyses/${id}${params}`;
  
  // Call Next.js API route which will forward cookies to backend
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader && { 'Cookie': cookieHeader }),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

export const createStockAnalysis = async (data: StockAnalysisCreate): Promise<{ data: { stockAnalysis: StockAnalysis } }> => {
  // Use Next.js API route as proxy to avoid CORS and mixed content issues
  const response = await fetch('/api/stock-analyses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || error.message || error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

export const uploadStockAnalysisCsv = async (id: number, file: File): Promise<{ data: { stockAnalysis: StockAnalysis } }> => {
  // Use Next.js API route as proxy to avoid CORS and mixed content issues
  const formData = new FormData();
  formData.append('csvFile', file);

  const response = await fetch(`/api/stock-analyses/${id}/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || error.message || error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

export const importStockAnalysisData = async (id: number): Promise<{ data: { stockAnalysis: StockAnalysis } }> => {
  // Use Next.js API route as proxy to avoid CORS and mixed content issues
  const response = await fetch(`/api/stock-analyses/${id}/import`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || error.message || error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

export const getStockAnalysisDailyFactorData = async (
  id: number,
  page = 1,
  limit = 50
): Promise<PaginatedResponse<any>> => {
  // Use Next.js API route as proxy to avoid CORS and mixed content issues
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  const response = await fetch(`/api/stock-analyses/${id}/daily-factor-data?${params}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || error.message || error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

export const getStockAnalysisDailyScores = async (
  id: number,
  page = 1,
  limit = 50
): Promise<PaginatedResponse<any>> => {
  // Use Next.js API route as proxy to avoid CORS and mixed content issues
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  const response = await fetch(`/api/stock-analyses/${id}/daily-scores?${params}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || error.message || error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

export const performStockAnalysis = async (id: number): Promise<{ success: boolean; data: any }> => {
  // Use Next.js API route as proxy to avoid CORS and mixed content issues
  const response = await fetch(`/api/stock-analyses/${id}/analyze`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorData: any = {};
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || errorData.error || errorMessage;
    } catch (parseError) {
      // If JSON parsing fails, try to get text
      try {
        const text = await response.text();
        errorMessage = text || errorMessage;
      } catch (textError) {
        // Use default error message
      }
    }
    
    // Create error with preserved details
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).statusText = response.statusText;
    (error as any).details = errorData;
    (error as any).backendError = errorData.error || errorData;
    (error as any).isConnectionError = response.status === 503 || errorMessage.includes('Cannot connect');
    
    throw error;
  }

  return response.json();
};
