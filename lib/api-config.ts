// API Configuration for backend service
export const API_CONFIG = {
  // Backend API base URL - defaults to remote backend, override with NEXT_PUBLIC_API_URL env var
  // Remote backend: http://72.60.233.159:3050
  // Local backend: http://localhost:3001
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://72.60.233.159:3050',
  
  // Vnstock API base URL
  VNSTOCK_BASE_URL: process.env.NEXT_PUBLIC_VNSTOCK_API_URL || 'http://72.60.233.159:8002',
  
  // API endpoints
  ENDPOINTS: {
    STOCK_ANALYSES: '/api/stock-analyses',
    STOCK_PRICE: '/api/stocks/price',
    USERS: '/api/users',
    EARNINGS: '/api/earnings',
    AUTH: '/api/auth',
    // Vnstock API endpoints (via Next.js proxy)
    VNSTOCK: {
      AUTH: '/api/vnstock/auth',
      COMPANY: '/api/vnstock/company',
      FINANCIAL: '/api/vnstock/financial',
      TRADING: '/api/vnstock/trading',
      DOWNLOAD: '/api/vnstock/download',
    },
  },
  
  // Default headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
};

// Helper function to construct API URLs
export const getApiUrl = (endpoint: string) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function for API requests
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = getApiUrl(endpoint);
  const headers = {
    ...API_CONFIG.DEFAULT_HEADERS,
    ...options.headers,
  };

  // Debug logging for API requests
  const isLocalhost = API_CONFIG.BASE_URL.includes('localhost') || API_CONFIG.BASE_URL.includes('127.0.0.1');
  if (isLocalhost) {
    console.warn('[apiRequest] WARNING: Using localhost backend. Set NEXT_PUBLIC_API_URL to use remote backend.');
  }
  console.log('[apiRequest] Making request:', {
    endpoint,
    url,
    baseUrl: API_CONFIG.BASE_URL,
    method: options.method || 'GET',
    isRemote: !isLocalhost,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // For cookies/auth
    });
  } catch (fetchError: any) {
    // Handle network errors (connection refused, DNS errors, CORS, etc.)
    // Extract error message from various error types
    let errorMessage = 'Unknown network error';
    let errorName = 'Unknown';
    let errorStack = '';
    let errorString = '';
    
    // Try multiple ways to extract error information
    try {
      if (fetchError instanceof Error) {
        errorMessage = fetchError.message || 'Unknown error';
        errorName = fetchError.name || fetchError.constructor?.name || 'Error';
        errorStack = fetchError.stack || '';
      } else if (typeof fetchError === 'string') {
        errorMessage = fetchError;
        errorName = 'StringError';
      } else if (fetchError && typeof fetchError === 'object') {
        errorMessage = fetchError.message || fetchError.error || fetchError.toString() || JSON.stringify(fetchError);
        errorName = fetchError.name || fetchError.constructor?.name || 'ObjectError';
        errorStack = fetchError.stack || '';
        errorString = JSON.stringify(fetchError);
      } else {
        errorMessage = String(fetchError) || 'Unknown network error';
        errorName = typeof fetchError;
      }
    } catch (extractError) {
      // Fallback if error extraction fails
      errorMessage = `Error extraction failed: ${extractError instanceof Error ? extractError.message : String(extractError)}`;
      errorName = 'ExtractionError';
    }
    
    // Ensure we have at least some error message
    if (!errorMessage || errorMessage === 'Unknown network error') {
      errorMessage = fetchError?.toString() || String(fetchError) || 'Unknown network error';
    }
    
    const isConnectionError = 
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('network') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('Network error') ||
      errorName === 'TypeError' ||
      errorName === 'DOMException' ||
      errorName === 'NetworkError';
    
    // Build comprehensive error log object with guaranteed properties
    const errorLog: Record<string, any> = {
      url: url || 'unknown',
      errorMessage: errorMessage || 'No error message',
      errorName: errorName || 'Unknown',
      errorType: typeof fetchError,
      isConnectionError: Boolean(isConnectionError),
      baseUrl: API_CONFIG.BASE_URL || 'not configured',
    };
    
    // Add optional properties only if they have values
    if (errorStack) {
      errorLog.errorStack = errorStack.substring(0, 500);
    }
    if (errorString) {
      errorLog.errorString = errorString.substring(0, 500);
    }
    if (fetchError && typeof fetchError === 'object') {
      // Include all enumerable properties from the error object
      try {
        const errorKeys = Object.keys(fetchError).slice(0, 10); // Limit to first 10 keys
        errorKeys.forEach(key => {
          if (key !== 'stack' && key !== 'message' && key !== 'name') {
            try {
              const value = (fetchError as any)[key];
              if (value !== undefined && value !== null) {
                errorLog[`error_${key}`] = typeof value === 'string' ? value.substring(0, 200) : value;
              }
            } catch (e) {
              // Skip properties that can't be serialized
            }
          }
        });
      } catch (e) {
        // Ignore errors during property extraction
      }
    }
    
    console.error('[apiRequest] Network error:', errorLog);
    
    const error = new Error(
      isConnectionError 
        ? `Cannot connect to backend at ${url}. Please check if the backend server is running and NEXT_PUBLIC_API_URL is set correctly.`
        : `Request failed: ${errorMessage}`
    );
    (error as any).status = 503;
    (error as any).isConnectionError = isConnectionError;
    (error as any).details = {
      url,
      baseUrl: API_CONFIG.BASE_URL,
      message: errorMessage,
      errorName,
      type: isConnectionError ? 'connection_error' : 'fetch_error',
      originalError: errorMessage,
    };
    throw error;
  }

  if (!response.ok) {
    // Try to get error details from response
    let errorDetails: any = {};
    let responseText: string = '';
    try {
      responseText = await response.text();
      // Try to parse as JSON
      if (responseText) {
        try {
          errorDetails = JSON.parse(responseText);
        } catch (parseError) {
          // If JSON parsing fails, use the text as error message
          errorDetails = { error: responseText || `HTTP ${response.status}: ${response.statusText}` };
        }
      } else {
        errorDetails = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (e) {
      console.error('[apiRequest] Failed to read response:', e);
      errorDetails = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    console.error('[apiRequest] Request failed:', {
      url,
      status: response.status,
      statusText: response.statusText,
      error: errorDetails.error || errorDetails.message,
    });
    
    const errorMessage = errorDetails.message || errorDetails.error || `HTTP ${response.status}: ${response.statusText}`;
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).details = errorDetails;
    throw error;
  }

  return response.json();
};

// Helper function for server-side API requests with authentication
export const serverApiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = getApiUrl(endpoint);
  const headers = {
    ...API_CONFIG.DEFAULT_HEADERS,
    ...options.headers,
  };

  // For server-side requests, we need to forward cookies manually
  const response = await fetch(url, {
    ...options,
    headers,
    // Server-side requests need explicit cookie forwarding
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// Helper function for server-side API requests with cookie forwarding from NextRequest
export const serverApiRequestWithCookies = async (
  endpoint: string,
  request: { headers: Headers },
  options: RequestInit = {}
) => {
  const url = getApiUrl(endpoint);
  
  // Extract cookies from the incoming Next.js request
  const cookieHeader = request.headers.get('cookie') || '';
  
  const headers = {
    ...API_CONFIG.DEFAULT_HEADERS,
    ...(cookieHeader && { 'Cookie': cookieHeader }), // Forward cookies to backend
    ...options.headers,
  };

  // Debug logging
  console.log('[serverApiRequestWithCookies] Request details:', {
    url,
    hasCookies: !!cookieHeader,
    cookieCount: cookieHeader ? cookieHeader.split(';').length : 0,
    method: options.method || 'GET',
  });

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (fetchError: any) {
    // Handle connection errors (backend not running, network issues, etc.)
    // Extract error message from various error types
    let errorMessage = 'Unknown network error';
    let errorName = 'Unknown';
    let errorStack = '';
    let errorString = '';
    
    // Try multiple ways to extract error information
    try {
      if (fetchError instanceof Error) {
        errorMessage = fetchError.message || 'Unknown error';
        errorName = fetchError.name || fetchError.constructor?.name || 'Error';
        errorStack = fetchError.stack || '';
      } else if (typeof fetchError === 'string') {
        errorMessage = fetchError;
        errorName = 'StringError';
      } else if (fetchError && typeof fetchError === 'object') {
        errorMessage = fetchError.message || fetchError.error || fetchError.toString() || JSON.stringify(fetchError);
        errorName = fetchError.name || fetchError.constructor?.name || 'ObjectError';
        errorStack = fetchError.stack || '';
        errorString = JSON.stringify(fetchError);
      } else {
        errorMessage = String(fetchError) || 'Unknown network error';
        errorName = typeof fetchError;
      }
    } catch (extractError) {
      // Fallback if error extraction fails
      errorMessage = `Error extraction failed: ${extractError instanceof Error ? extractError.message : String(extractError)}`;
      errorName = 'ExtractionError';
    }
    
    // Ensure we have at least some error message
    if (!errorMessage || errorMessage === 'Unknown network error') {
      errorMessage = fetchError?.toString() || String(fetchError) || 'Unknown network error';
    }
    
    const isConnectionError = 
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('network') ||
      errorMessage.includes('Failed to fetch') ||
      errorName === 'TypeError' ||
      errorName === 'DOMException' ||
      errorName === 'NetworkError';
    
    // Build comprehensive error log object with guaranteed properties
    const errorLog: Record<string, any> = {
      url: url || 'unknown',
      errorMessage: errorMessage || 'No error message',
      errorName: errorName || 'Unknown',
      errorType: typeof fetchError,
      isConnectionError: Boolean(isConnectionError),
      hasCookies: !!cookieHeader,
    };
    
    // Add optional properties only if they have values
    if (errorStack) {
      errorLog.errorStack = errorStack.substring(0, 500);
    }
    if (errorString) {
      errorLog.errorString = errorString.substring(0, 500);
    }
    if (fetchError && typeof fetchError === 'object') {
      // Include all enumerable properties from the error object
      try {
        const errorKeys = Object.keys(fetchError).slice(0, 10); // Limit to first 10 keys
        errorKeys.forEach(key => {
          if (key !== 'stack' && key !== 'message' && key !== 'name') {
            try {
              const value = (fetchError as any)[key];
              if (value !== undefined && value !== null) {
                errorLog[`error_${key}`] = typeof value === 'string' ? value.substring(0, 200) : value;
              }
            } catch (e) {
              // Skip properties that can't be serialized
            }
          }
        });
      } catch (e) {
        // Ignore errors during property extraction
      }
    }
    
    console.error('[serverApiRequestWithCookies] Fetch error:', errorLog);
    
    const error = new Error(
      isConnectionError 
        ? `Cannot connect to backend at ${url}. Please ensure the backend server is running.`
        : `Request failed: ${errorMessage}`
    );
    (error as any).status = 503;
    (error as any).isConnectionError = isConnectionError;
    (error as any).details = {
      url,
      message: errorMessage,
      errorName,
      type: isConnectionError ? 'connection_error' : 'fetch_error',
      originalError: errorMessage,
    };
    throw error;
  }

  if (!response.ok) {
    // Try to get error details from response
    let errorDetails: any = {};
    let responseText: string = '';
    try {
      responseText = await response.text();
      // Try to parse as JSON
      if (responseText) {
        try {
          errorDetails = JSON.parse(responseText);
        } catch (parseError) {
          // If JSON parsing fails, use the text as error message
          errorDetails = { error: responseText || `HTTP ${response.status}: ${response.statusText}` };
        }
      } else {
        errorDetails = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (e) {
      console.error('[serverApiRequestWithCookies] Failed to read response:', e);
      errorDetails = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    // Log detailed error information including full backend response
    console.error('[serverApiRequestWithCookies] Request failed:', {
      url,
      status: response.status,
      statusText: response.statusText,
      error: errorDetails.error || errorDetails.message,
      message: errorDetails.message,
      stack: errorDetails.stack,
      details: errorDetails.details,
      fullResponse: errorDetails, // Include full response for debugging
      rawResponse: responseText.substring(0, 500), // Include first 500 chars of raw response
      hasCookies: !!cookieHeader,
    });
    
    // Create a more descriptive error message with backend details
    // Prefer message field, then error field, then status text
    const errorMessage = errorDetails.message || errorDetails.error || `HTTP ${response.status}: ${response.statusText}`;
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).details = errorDetails;
    (error as any).backendError = errorDetails; // Preserve full backend error
    (error as any).rawResponse = responseText; // Preserve raw response for debugging
    throw error;
  }

  return response.json();
};
