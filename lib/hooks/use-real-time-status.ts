import { useState, useEffect, useCallback, useRef } from "react";

interface UseRealTimeStatusOptions {
  analysisId: number;
  pollingInterval?: number; // in milliseconds, default 10000 (10 seconds)
  enabled?: boolean;
}

interface StatusUpdate {
  status: string | null;
  lastUpdated: Date;
  progress?: number;
  message?: string;
}

// Final states that should stop polling
const FINAL_STATES = ['completed', 'failed', 'factor_failed', 'ai_completed'];

export function useRealTimeStatus({ 
  analysisId, 
  pollingInterval = 30000, // Increased to 30 seconds to respect rate limits (100 requests per 15 minutes = ~6.67 requests/min max)
  enabled = true 
}: UseRealTimeStatusOptions) {
  const [status, setStatus] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to track interval and backoff state
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backoffMultiplierRef = useRef<number>(1);
  const maxBackoffMultiplier = 8; // Max 240 seconds (30 * 8)
  const isFinalStateRef = useRef<boolean>(false);
  const isPollingRef = useRef<boolean>(false);
  const fetchStatusRef = useRef<(() => Promise<void>) | null>(null);
  const connectionErrorCountRef = useRef<number>(0);

  const setupPollingInterval = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Set up regular polling interval
    if (!isFinalStateRef.current && isPollingRef.current && fetchStatusRef.current) {
      intervalRef.current = setInterval(() => {
        if (!isFinalStateRef.current && isPollingRef.current && fetchStatusRef.current) {
          fetchStatusRef.current();
        } else {
          // Clean up if we reached final state or stopped polling
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (!isPollingRef.current) {
            setIsPolling(false);
          }
        }
      }, pollingInterval);
    }
  }, [pollingInterval]);

  const fetchStatus = useCallback(async () => {
    // Don't poll if we're in a final state or not actively polling
    if (isFinalStateRef.current || !isPollingRef.current) {
      return;
    }

    try {
      // Use Next.js API route as proxy to avoid CORS and mixed content issues
      // The API route forwards the request to the remote backend server-side
      const response = await fetch(`/api/stock-analyses/${analysisId}/status`, {
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
      
      // Validate response structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format from status endpoint');
      }
      
      const data = result as StatusUpdate;
      
      // Handle lastUpdated - it might be a Date string or Date object
      let lastUpdatedDate: Date;
      if (data.lastUpdated instanceof Date) {
        lastUpdatedDate = data.lastUpdated;
      } else if (typeof data.lastUpdated === 'string') {
        lastUpdatedDate = new Date(data.lastUpdated);
      } else {
        // Fallback to current date if lastUpdated is missing or invalid
        lastUpdatedDate = new Date();
      }
      
      setStatus(data.status);
      setLastUpdated(lastUpdatedDate);
      setProgress(data.progress || 0);
      setMessage(data.message || "");
      setError(null);
      
      // Reset backoff and connection error count on successful request
      backoffMultiplierRef.current = 1;
      connectionErrorCountRef.current = 0;
      
      // Check if status is final and stop polling
      if (data.status && FINAL_STATES.includes(data.status)) {
        isFinalStateRef.current = true;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setIsPolling(false);
        isPollingRef.current = false;
      } else {
        // Ensure polling interval is set up after successful fetch
        if (!intervalRef.current && isPollingRef.current) {
          setupPollingInterval();
        }
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch status';
      const isConnectionError = err?.isConnectionError || 
        errorMessage.includes('Cannot connect') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('network') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError');
      
      // Properly serialize error for logging
      const errorDetails = err instanceof Error ? {
        name: err.name,
        message: err.message,
        stack: err.stack,
        ...((err as any).status && { status: (err as any).status }),
        ...((err as any).isConnectionError && { isConnectionError: (err as any).isConnectionError }),
        ...((err as any).details && { details: (err as any).details }),
      } : {
        error: String(err),
        ...(err && typeof err === 'object' ? err : {}),
      };
      
      console.error('[useRealTimeStatus] Error fetching status:', {
        ...errorDetails,
        message: errorMessage,
        isConnectionError,
        analysisId,
      });
      
      // Handle connection errors - stop polling after multiple failures
      if (isConnectionError) {
        // Increment connection error counter
        connectionErrorCountRef.current += 1;
        
        // Stop polling after 3 consecutive connection errors
        if (connectionErrorCountRef.current >= 3) {
          console.error('[useRealTimeStatus] Stopping polling due to persistent connection errors');
          setError(`Cannot connect to backend server. Please check if the backend is running and NEXT_PUBLIC_API_URL is set correctly.`);
          stopPolling();
          return;
        }
        
        // For connection errors, use exponential backoff but don't spam
        setError(`Connection error (${connectionErrorCountRef.current}/3). Retrying...`);
        
        // Clear existing interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Exponential backoff for connection errors
        if (backoffMultiplierRef.current < maxBackoffMultiplier) {
          backoffMultiplierRef.current = Math.min(
            backoffMultiplierRef.current * 2,
            maxBackoffMultiplier
          );
        }
        
        // Schedule next poll with backoff delay
        const backoffDelay = pollingInterval * backoffMultiplierRef.current;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          if (!isFinalStateRef.current && isPollingRef.current && fetchStatusRef.current) {
            fetchStatusRef.current();
          }
        }, backoffDelay);
      } 
      // Handle 429 (Too Many Requests) with exponential backoff
      else if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('Too many requests')) {
        const rateLimitDelay = Math.max(pollingInterval * 3, 60000); // At least 1 minute delay for rate limits
        setError(`Rate limit exceeded. Polling paused for ${Math.round(rateLimitDelay / 1000)} seconds.`);
        
        // Clear existing interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Use longer backoff for rate limits (3x polling interval, minimum 1 minute)
        const backoffDelay = Math.max(pollingInterval * 3, 60000);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          if (!isFinalStateRef.current && isPollingRef.current && fetchStatusRef.current) {
            // Reset backoff multiplier after rate limit delay
            backoffMultiplierRef.current = 1;
            // fetchStatus will set up the interval after successful fetch
            fetchStatusRef.current();
          }
        }, backoffDelay);
      } else {
        setError(errorMessage);
        // For other errors, continue polling at normal interval
        if (!isFinalStateRef.current && isPollingRef.current && !intervalRef.current) {
          setupPollingInterval();
        }
      }
    }
  }, [analysisId, pollingInterval, setupPollingInterval]);

  // Store fetchStatus in ref to avoid circular dependencies
  fetchStatusRef.current = fetchStatus;

  const startPolling = useCallback(() => {
    if (!enabled) return;
    
    // Reset state
    isFinalStateRef.current = false;
    backoffMultiplierRef.current = 1;
    connectionErrorCountRef.current = 0;
    isPollingRef.current = true;
    setIsPolling(true);
    
    // Initial fetch
    fetchStatus();
    
    // Set up polling interval (will be set up after first fetch if not in final state)
    setupPollingInterval();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsPolling(false);
      isPollingRef.current = false;
    };
  }, [enabled, fetchStatus, setupPollingInterval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
    isPollingRef.current = false;
    isFinalStateRef.current = true;
  }, []);

  // Auto-start polling when component mounts or dependencies change
  useEffect(() => {
    if (!enabled) return;
    
    const cleanup = startPolling();
    return cleanup;
  }, [enabled, startPolling]);

  // Manual refresh function
  const refresh = useCallback(() => {
    // Temporarily allow polling even if in final state for manual refresh
    const wasFinal = isFinalStateRef.current;
    isFinalStateRef.current = false;
    fetchStatus().finally(() => {
      // Restore final state if it was final before
      if (wasFinal && status && FINAL_STATES.includes(status)) {
        isFinalStateRef.current = true;
      }
    });
  }, [fetchStatus, status]);

  return {
    status,
    lastUpdated,
    progress,
    message,
    isPolling,
    error,
    refresh,
    startPolling,
    stopPolling,
  };
}
