"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, Calendar, DollarSign, BarChart3, Table, Brain, LineChart, Calculator, Loader2, Activity, RefreshCw, Star, Trash2, AlertTriangle, ArrowUp, ArrowDown, Target } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StockAnalysis, StockAnalysisResult } from "@/lib/types/stock-analysis";
import { FACTOR_DESCRIPTIONS } from "@/lib/stock-factors";
import { formatPrice } from "@/lib/currency-utils";
import type { UserRole } from "@/lib/types";
import { performStockAnalysis, getStockAnalysis } from "@/lib/stock-api";
import { StockFactorTableBackend } from "@/components/stock-factor-table-backend";
import { StockChart } from "@/components/stock-chart";
import { DailyScoringTab } from "@/components/daily-scoring-tab";
import { EarningsTab } from "@/components/earnings-tab";
import { DataQualityDashboard } from "@/components/data-quality-dashboard";
import { CurrentStockPrice } from "@/components/current-stock-price";
import { PriceRecommendations } from "@/components/price-recommendations";
// Period-based analysis removed
import { useRealTimeStatus } from "@/lib/hooks/use-real-time-status";
import { useSession } from "next-auth/react";
import { canDeleteStockAnalysis } from "@/lib/client-auth";
import { format } from "date-fns";

interface StockAnalysisDetailProps {
  analysis: StockAnalysis;
}

type SortField = 'date' | 'close' | 'pctChange';
type SortDirection = 'asc' | 'desc';

export function StockAnalysisDetail({ analysis: initialAnalysis }: StockAnalysisDetailProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const [analysis, setAnalysis] = useState<StockAnalysis>(initialAnalysis);
  const [analysisKey, setAnalysisKey] = useState(0); // Force remount when analysis changes
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Use fresh results from backend API response
  const results: StockAnalysisResult | null = analysis.results || null;

  // Force refresh results when period analysis completes
  const [forceRefresh, setForceRefresh] = useState(0);
  
  // Create a fresh results object that updates when analysis changes
  const freshResults = useMemo(() => {
    // Always return the current results, but the dependency array will trigger re-render
    return results;
  }, [analysis.id, analysis.updatedAt, analysis.results, forceRefresh]); // Re-calculate when analysis changes

  // Debug: Log results structure and check for period filtering
  useEffect(() => {
    console.log('=== Stock Analysis Detail Debug ===');
    console.log('Analysis object:', analysis);
    console.log('Fresh results from backend:', analysis.results);
    console.log('Using results:', results);
    if (results) {
      console.log('Results.transactions:', results.transactions);
      console.log('Transactions count:', results.transactions?.length || 0);
      console.log('TransactionsFound:', results.transactionsFound);
      console.log('Total days:', results.totalDays);
      console.log('Period info in results:', (results as any).periodInfo);
      if (results.transactions && results.transactions.length > 0) {
        console.log('First transaction sample:', results.transactions[0]);
        console.log('Last transaction sample:', results.transactions[results.transactions.length - 1]);
      }
    }
    console.log('===================================');
  }, [analysis, results]);

  // Period-based analysis removed; use full results
  const filteredResults = freshResults;

  // Real-time status updates
  // Polling interval set to 15 seconds to reduce API calls and respect rate limits
  const { 
    status: realTimeStatus, 
    lastUpdated, 
    progress, 
    message, 
    isPolling 
  } = useRealTimeStatus({ 
    analysisId: analysis.id, 
    pollingInterval: 15000, // 15 seconds to reduce API calls (100 req/15min = ~6.67/min)
    enabled: analysis.status !== 'completed' && analysis.status !== 'ai_completed' // Stop polling when completed
  });

  // Use real-time status if available, otherwise fall back to static status
  const currentStatus = realTimeStatus || analysis.status;

  // Refresh analysis data when status changes to completed and we don't have aiInsights yet
  useEffect(() => {
    const shouldRefresh = 
      (currentStatus === 'completed' || currentStatus === 'ai_completed') &&
      !analysis.aiInsights &&
      realTimeStatus && // Only refresh if we have real-time status (meaning status changed)
      !isPolling; // Prevent refresh while still polling
    
    if (shouldRefresh) {
      const fetchUpdatedAnalysis = async () => {
        try {
          const response = await getStockAnalysis(analysis.id, false);
          
          if (response.data?.stockAnalysis) {
            setAnalysis(response.data.stockAnalysis);
            console.log('[AI Analysis] Refreshed analysis data with AI insights');
          }
        } catch (error) {
          console.error('[AI Analysis] Error refreshing analysis data:', error);
        }
      };
      
      // Small delay to ensure backend has saved the data
      const timeoutId = setTimeout(fetchUpdatedAnalysis, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [currentStatus, analysis.id, analysis.aiInsights, realTimeStatus, isPolling]);

  // State for factor generation
  const [isGeneratingFactors, setIsGeneratingFactors] = useState(false);

  // State for favorite
  const [isFavorite, setIsFavorite] = useState(analysis.favorite);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);

  // State for delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actualRole, setActualRole] = useState<UserRole | null>(null);
  const [hasCheckedRole, setHasCheckedRole] = useState(false);

  // Check role from backend API only once when component mounts or session changes
  // Only fetch if we haven't checked yet or if session role seems wrong
  useEffect(() => {
    // Skip if already checked or not authenticated
    if (hasCheckedRole || sessionStatus !== 'authenticated' || !session?.user?.email) {
      return;
    }

    // If session already has admin role, trust it and skip backend check
    if (session.user.role === 'admin') {
      setHasCheckedRole(true);
      return;
    }

    // Only check backend if session role is viewer (might be outdated)
    const fetchRoleFromBackend = async () => {
      try {
        // Use Next.js API proxy route to avoid CORS and HTTPS upgrade issues
        const url = `/api/users/by-email?email=${encodeURIComponent(session.user.email!)}`;
        console.log(`[Role Fetch] Fetching role via proxy: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Include cookies for session
          cache: 'no-store',
        });
        
        console.log(`[Role Fetch] Backend response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`[Role Fetch] Backend response data:`, JSON.stringify(data));
          
          if (data.data?.role && ['viewer', 'editor', 'admin'].includes(data.data.role)) {
            const backendRole = data.data.role as UserRole;
            setActualRole(backendRole);
            setHasCheckedRole(true);
            
            console.log(`[Role Fetch] ✅ Backend role: ${backendRole}, Session role: ${session.user.role}`);
            
            // If backend role differs from session role, refresh session once
            if (session.user.role !== backendRole) {
              console.warn(`[Role Mismatch] Session role: ${session.user.role}, Backend role: ${backendRole}. Refreshing session...`);
              await updateSession();
            }
          } else {
            console.warn(`[Role Fetch] ⚠️ Invalid role in response: ${data.data?.role}`);
            setHasCheckedRole(true);
          }
        } else {
          // Handle non-OK responses
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          console.error(`[Role Fetch] ❌ Backend error (${response.status}):`, errorData);
          
          if (response.status === 404) {
            console.warn(`[Role Fetch] ⚠️ User ${session.user.email} not found in backend database. User may need to be created.`);
          }
          
          setHasCheckedRole(true); // Mark as checked even on error to prevent retries
        }
      } catch (error) {
        console.error('[Role Fetch] ❌ Failed to fetch role from backend:', error);
        setHasCheckedRole(true); // Mark as checked even on error to prevent retries
      }
    };

    fetchRoleFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]); // Only depend on sessionStatus, not session object itself

  // Check if user can delete - use actualRole if available, otherwise use session role
  const effectiveRole = actualRole || session?.user?.role;
  const canDelete = effectiveRole ? canDeleteStockAnalysis(effectiveRole) : false;

  // Track previous role to avoid excessive logging
  const prevRoleRef = useRef<UserRole | null | undefined>(undefined);
  
  // Debug: Log session and permission check (only in development and only when role changes)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    // Only log when role actually changes, not on every render
    if (prevRoleRef.current !== effectiveRole || !hasCheckedRole) {
      console.log('[Delete Button Debug] Session status:', sessionStatus);
      console.log('[Delete Button Debug] User email:', session?.user?.email);
      console.log('[Delete Button Debug] Session role:', session?.user?.role);
      console.log('[Delete Button Debug] Backend role:', actualRole);
      console.log('[Delete Button Debug] Effective role:', effectiveRole);
      console.log('[Delete Button Debug] Can delete:', canDelete);
      
      // If role is viewer but user email suggests admin, log warning
      if (session?.user?.email === 'khoa0702@gmail.com' && effectiveRole === 'viewer') {
        console.warn('[Delete Button Debug] ⚠️ WARNING: User khoa0702@gmail.com has viewer role but should be admin. Check backend database.');
      }
      
      prevRoleRef.current = effectiveRole;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRole, hasCheckedRole]); // Only log when role changes

  // Handle factor generation
  const handleRetryFactorGeneration = async () => {
    setIsGeneratingFactors(true);
    
    try {
      // Use the analyze endpoint which performs full analysis including factors
      const response = await performStockAnalysis(analysis.id);
      
      if (response.success) {
        console.log('Factor regeneration initiated successfully');
        // Navigate to analysis tab to show the results
        const analysisTab = document.querySelector('[value="analysis"]') as HTMLElement;
        analysisTab?.click();
      } else {
        throw new Error('Failed to regenerate factors');
      }
    } catch (err) {
      console.error('Error regenerating factors:', err);
      // You could show a toast notification here if you have one
    } finally {
      setIsGeneratingFactors(false);
    }
  };

  // Handle favorite toggle
  const handleToggleFavorite = async () => {
    setIsUpdatingFavorite(true);
    
    // Enhanced validation for analysis.id
    console.log('handleToggleFavorite called with analysis.id:', analysis.id, 'type:', typeof analysis.id);
    
    if (!analysis.id) {
      console.error('Invalid analysis ID - ID is missing:', analysis.id);
      setIsUpdatingFavorite(false);
      return;
    }
    
    // Convert to number and validate
    const numericId = typeof analysis.id === 'string' ? parseInt(analysis.id, 10) : analysis.id;
    
    if (isNaN(numericId) || numericId <= 0 || !Number.isInteger(numericId)) {
      console.error('Invalid analysis ID - not a valid positive integer:', analysis.id, 'converted to:', numericId);
      setIsUpdatingFavorite(false);
      return;
    }
    
    console.log('Validated analysis ID:', numericId);
    
    try {
      const newFavoriteStatus = !isFavorite;
      
      // Update backend using Next.js API route proxy (PATCH)
      const response = await fetch(`/api/stock-analyses/${numericId}`, {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ favorite: newFavoriteStatus }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error?.message || errorData.message || errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.data && data.data.stockAnalysis) {
        setIsFavorite(newFavoriteStatus);
        console.log(`Stock analysis ${newFavoriteStatus ? 'favorited' : 'unfavorited'}`);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Error updating favorite status:', err);
      // Revert on error
      setIsFavorite(isFavorite);
    } finally {
      setIsUpdatingFavorite(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);
    
    // Enhanced validation for analysis.id
    console.log('handleDelete called with analysis.id:', analysis.id, 'type:', typeof analysis.id);
    
    if (!analysis.id) {
      console.error('Invalid analysis ID - ID is missing:', analysis.id);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      return;
    }
    
    // Convert to number and validate
    const numericId = typeof analysis.id === 'string' ? parseInt(analysis.id, 10) : analysis.id;
    
    if (isNaN(numericId) || numericId <= 0 || !Number.isInteger(numericId)) {
      console.error('Invalid analysis ID - not a valid positive integer:', analysis.id, 'converted to:', numericId);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      return;
    }
    
    console.log('Validated analysis ID for deletion:', numericId);
    
    try {
      // Delete the stock analysis using Next.js API route proxy
      const response = await fetch(`/api/stock-analyses/${numericId}`, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error?.message || errorData.message || errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Stock analysis deleted successfully');
        // Navigate back to stock analyses list
        router.push('/stock-analyses');
      } else {
        throw new Error(data.error || 'Failed to delete stock analysis');
      }
    } catch (err) {
      console.error('Error deleting stock analysis:', err);
      // Show error to user (you could add a toast notification here)
      alert('Failed to delete stock analysis. Please try again.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to desc
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // State for AI analysis
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  
  // State for earnings data availability
  const [earningsDataAvailable, setEarningsDataAvailable] = useState(false);
  const [earningsLastUpdated, setEarningsLastUpdated] = useState<Date | undefined>(undefined);

  // Check earnings data availability
  useEffect(() => {
    const checkEarningsData = async () => {
      try {
        // Use Next.js API route proxy to check earnings
        const response = await fetch(`/api/earnings/${analysis.symbol}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          setEarningsDataAvailable(false);
          setEarningsLastUpdated(undefined);
          return;
        }

        const result = await response.json();

        if (result.success && result.data) {
          const earningsForSymbol = result.data || [];

          if (earningsForSymbol.length > 0) {
            setEarningsDataAvailable(true);
            const latestEarning = earningsForSymbol[0];
            setEarningsLastUpdated(new Date(latestEarning.updatedAt));
          } else {
            setEarningsDataAvailable(false);
            setEarningsLastUpdated(undefined);
          }
        } else {
          setEarningsDataAvailable(false);
          setEarningsLastUpdated(undefined);
        }
      } catch (error: any) {
        console.error('Error checking earnings data:', error);
        setEarningsDataAvailable(false);
        setEarningsLastUpdated(undefined);
      }
    };

    checkEarningsData();
  }, [analysis.symbol]);

  // Period-based analysis removed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const parseRobustDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr === 'null' || dateStr === 'undefined') return null;
    
    // Clean the input
    const cleanDateStr = String(dateStr).trim();
    
    // Try ISO format: 2023-12-31 (most reliable)
    const isoMatch = cleanDateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // Try ISO format with time: 2023-12-31T23:59:59
    const isoTimeMatch = cleanDateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (isoTimeMatch) {
      const [, year, month, day, hour, minute, second] = isoTimeMatch;
      const parsed = new Date(
        parseInt(year), 
        parseInt(month) - 1, 
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // Try ISO format with timezone: 2023-12-31T00:00:00.000Z
    const isoTimezoneMatch = cleanDateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{3})?Z$/);
    if (isoTimezoneMatch) {
      const parsed = new Date(cleanDateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // Handle slash format - try dd/mm/yyyy first (Vietnamese format), then mm/dd/yyyy
    const slashMatch = cleanDateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const [_, first, second, year] = slashMatch;
      const firstNum = parseInt(first);
      const secondNum = parseInt(second);
      
      // Try dd/mm/yyyy format first (Vietnamese format)
      if (firstNum <= 31 && secondNum <= 12) {
        const parsed = new Date(parseInt(year), secondNum - 1, firstNum);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      
      // Try mm/dd/yyyy format as fallback
      if (firstNum <= 12 && secondNum <= 31) {
        const parsed = new Date(parseInt(year), firstNum - 1, secondNum);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
    
    // Try forward slash format: 2023/12/31 (Japanese format)
    const forwardSlashMatch = cleanDateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (forwardSlashMatch) {
      const [, year, month, day] = forwardSlashMatch;
      const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // Try European format with dots: 31.12.2023
    const dotMatch = cleanDateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dotMatch) {
      const [, day, month, year] = dotMatch;
      const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // Try US format with dashes: 12-31-2023
    const usDashMatch = cleanDateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (usDashMatch) {
      const [_, first, second, year] = usDashMatch;
      const firstNum = parseInt(first);
      const secondNum = parseInt(second);
      
      // Try mm-dd-yyyy format first (US format)
      if (firstNum <= 12 && secondNum <= 31) {
        const parsed = new Date(parseInt(year), firstNum - 1, secondNum);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      
      // Try dd-mm-yyyy format as fallback
      if (firstNum <= 31 && secondNum <= 12) {
        const parsed = new Date(parseInt(year), secondNum - 1, firstNum);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
    
    // Try month name formats: Dec 31, 2023 or 31 Dec 2023
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNameMatch = cleanDateStr.match(/^(?:(\d{1,2})\s+)?([A-Za-z]{3,})\s+(?:(\d{1,2})\s+)?(\d{4})$/);
    if (monthNameMatch) {
      const [_, day1, monthName, day2, year] = monthNameMatch;
      const day = day1 || day2;
      const monthIndex = monthNames.findIndex(m => 
        monthName.toLowerCase().startsWith(m.toLowerCase())
      );
      
      if (monthIndex !== -1 && day) {
        const parsed = new Date(parseInt(year), monthIndex, parseInt(day));
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
    
    // Try month abbreviation with dashes: Dec-31-2023 or 31-Dec-2023
    const monthDashMatch = cleanDateStr.match(/^([A-Za-z]{3})-(\d{1,2})-(\d{4})$|^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (monthDashMatch) {
      const [_, month1, day1, year1, day2, month2, year2] = monthDashMatch;
      const month = month1 || month2;
      const day = day1 || day2;
      const year = year1 || year2;
      
      const monthIndex = monthNames.findIndex(m => 
        month.toLowerCase().startsWith(m.toLowerCase())
      );
      
      if (monthIndex !== -1 && day && year) {
        const parsed = new Date(parseInt(year), monthIndex, parseInt(day));
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
    
    // Try parsing as Unix timestamp (milliseconds)
    const timestamp = parseInt(cleanDateStr, 10);
    if (!isNaN(timestamp) && timestamp > 0 && timestamp < 3000000000000) {
      const parsed = new Date(timestamp);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // Try Excel serial date format (days since 1900-01-01)
    const excelSerial = parseFloat(cleanDateStr);
    if (!isNaN(excelSerial) && excelSerial > 0 && excelSerial < 100000) {
      // Excel incorrectly treats 1900 as a leap year, so subtract 1 day for dates after Feb 28, 1900
      const parsed = new Date((excelSerial - 25569) * 86400 * 1000);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1900) {
        return parsed;
      }
    }
    
    // Try YYYYMMDD format: 20231231
    const ymdMatch = cleanDateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (ymdMatch) {
      const [, year, month, day] = ymdMatch;
      const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // Try standard Date parsing last (as fallback for other formats)
    const standardDate = new Date(cleanDateStr);
    if (!isNaN(standardDate.getTime())) {
      return standardDate;
    }
    
    return null;
  };

  // Handle AI analysis
  const handleRetryAIAnalysis = async () => {
    setIsAnalyzingAI(true);
    
    try {
      console.log('[AI Analysis] Starting AI analysis:', {
        analysisId: analysis.id,
      });
      
      // Use the Next.js API route proxy which forwards to backend server-side
      // This avoids CORS issues and allows proper cookie forwarding
      const response = await performStockAnalysis(analysis.id);
      
      console.log('[AI Analysis] Success response:', response);
      
      if (response.success) {
        console.log('AI analysis initiated successfully');
        // The real-time status hook will update the UI automatically
      } else {
        throw new Error('Failed to start AI analysis');
      }
    } catch (err: any) {
      // Properly extract error properties for logging
      const errorDetails = {
        message: err?.message || String(err) || 'Unknown error',
        name: err?.name || (err instanceof Error ? err.constructor.name : 'Unknown'),
        status: err?.status || err?.statusCode,
        stack: err?.stack ? err.stack.substring(0, 500) : undefined, // Limit stack trace length
        details: err?.details || err?.backendError || undefined,
        isConnectionError: err?.isConnectionError || false,
        analysisId: analysis.id,
        analysisStatus: analysis.status,
      };
      
      console.error('[AI Analysis] Error starting AI analysis:', errorDetails);
      
      // Log the full error object separately if it's an Error instance
      if (err instanceof Error) {
        console.error('[AI Analysis] Full error object:', {
          name: err.name,
          message: err.message,
          stack: err.stack,
        });
      }
      
      // Show user-friendly error message
      const errorMessage = errorDetails.message;
      const isConnectionError = errorDetails.isConnectionError ||
                                 errorMessage.includes('Cannot connect') || 
                                 errorMessage.includes('fetch failed') ||
                                 errorMessage.includes('network') ||
                                 errorMessage.includes('ECONNREFUSED') ||
                                 errorMessage.includes('ENOTFOUND');
      
      if (isConnectionError) {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://72.60.233.159:3050';
        alert(`Cannot connect to backend server. Please check:\n1. Backend server is running at ${backendUrl}\n2. NEXT_PUBLIC_API_URL is set correctly in .env.local\n3. Network connectivity is available\n\nError: ${errorMessage}`);
      } else if (errorDetails.status === 409 || errorMessage.includes('409')) {
        console.error('[AI Analysis] 409 Conflict detected - this suggests a new analysis creation was attempted');
        console.error('[AI Analysis] Current analysis ID:', analysis.id);
        console.error('[AI Analysis] Current analysis status:', analysis.status);
        alert('Analysis is already in progress or there was a conflict. Please refresh the page.');
      } else {
        // Include backend error details if available
        const backendErrorMsg = errorDetails.details?.message || errorDetails.details?.error;
        const fullErrorMessage = backendErrorMsg 
          ? `${errorMessage}\n\nBackend error: ${backendErrorMsg}`
          : errorMessage;
        alert(`Failed to start AI analysis: ${fullErrorMessage}`);
      }
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "completed":
        return "bg-blue-500"; // Blue for basic analysis completed
      case "factors_ready":
        return "bg-green-500"; // Green for factors ready
      case "analyzing":
        return "bg-blue-500";
      case "processing":
        return "bg-blue-500 animate-pulse";
      case "ai_processing":
        return "bg-purple-500 animate-pulse";
      case "ai_completed":
        return "bg-emerald-500";
      case "factor_failed":
        return "bg-orange-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "processing":
      case "ai_processing":
        return <Loader2 className="h-3 w-3 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string | null) => {
    switch (status) {
      case "completed":
        return "basic analysis done";
      case "factors_ready":
        return "factors ready";
      case "analyzing":
        return "analyzing";
      case "processing":
        return "processing";
      case "ai_processing":
        return "AI processing";
      case "ai_completed":
        return "AI completed";
      case "factor_failed":
        return "factor failed";
      case "failed":
        return "failed";
      default:
        return "draft";
    }
  };

  const getFactorColor = (category: string) => {
    switch (category) {
      case "technical":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "market":
        return "bg-green-100 text-green-800 border-green-200";
      case "fundamental":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "sentiment":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };


  return (
    <div key={analysisKey} className="space-y-8 max-w-7xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-4">
        <Link href="/stock-analyses">
          <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Analyses
          </Button>
        </Link>
        <div className="h-4 w-px bg-slate-400"></div>
        <span className="text-sm font-medium text-slate-700">Analysis Details</span>
      </div>

      {/* Main Analysis Card */}
      <Card className="border-2 border-slate-400 shadow-xl bg-gradient-to-br from-white to-slate-50/50 overflow-hidden">
        {/* Gradient Header */}
        <div className="h-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"></div>
        <CardHeader className="pb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                {/* Symbol with Icon */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{analysis.symbol.slice(0, 2)}</span>
                  </div>
                  <div>
                    <CardTitle className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                      {analysis.symbol}
                    </CardTitle>
                    {analysis.name && (
                    <CardDescription className="text-lg font-semibold text-slate-700 mt-1">
                      {analysis.name}
                    </CardDescription>
                    )}
                  </div>
                </div>
                
                {/* Status Badge */}
                <Badge className={`${getStatusColor(currentStatus)} text-white border-2 border-slate-700 shadow-lg px-4 py-2 text-sm font-semibold`}>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(currentStatus)}
                    {getStatusText(currentStatus)}
                    {isPolling && <Loader2 className="h-3 w-3 animate-spin" />}
                  </div>
                </Badge>
              </div>
              
              {/* Status Message */}
              {message && (
                <div className="p-3 bg-blue-100 border-2 border-blue-400 rounded-lg shadow-sm">
                  <div className="text-sm text-blue-900 font-semibold">{message}</div>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Favorite Button */}
              <Button
                variant="outline"
                size="lg"
                onClick={handleToggleFavorite}
                disabled={isUpdatingFavorite}
                className={`transition-all duration-200 hover:scale-105 ${isFavorite ? "text-yellow-600 border-yellow-300 hover:bg-yellow-50 hover:border-yellow-400" : "hover:text-yellow-600 hover:border-yellow-300"}`}
              >
                {isUpdatingFavorite ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Star className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
                )}
              </Button>

              {/* Delete Button (Admin only) */}
              {canDelete ? (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="transition-all duration-200 hover:scale-105 text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              ) : process.env.NODE_ENV === 'development' ? (
                <div className="text-xs text-gray-500 px-2">
                  Debug: Role={session?.user?.role || 'none'}, CanDelete={canDelete ? 'yes' : 'no'}
                </div>
              ) : null}
            </div>
          </div>
        </CardHeader>
        
        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <Card className="border-red-200 bg-red-50 mx-4 mb-4">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-900">Confirm Deletion</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Are you sure you want to delete this stock analysis for <strong>{analysis.symbol}</strong>? 
                    This will permanently delete the analysis, all associated data (factors, scores, earnings), and the CSV file. 
                    This action cannot be undone.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Button 
                      onClick={handleDelete} 
                      size="sm" 
                      disabled={isDeleting}
                      variant="destructive"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Permanently
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={() => setShowDeleteConfirm(false)} 
                      variant="outline" 
                      size="sm"
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Enhanced Metrics Grid */}
        <CardContent className="pt-0">
          <div className="grid gap-6 md:grid-cols-5 mb-8">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-300 shadow-sm">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center border border-blue-400">
                    <Calendar className="h-4 w-4 text-blue-700" />
                  </div>
                  <span className="text-sm font-semibold text-blue-800">Total Days</span>
                </div>
                <span className="text-3xl font-bold text-blue-900">{results?.totalDays || 0}</span>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 shadow-sm">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-green-200 rounded-lg flex items-center justify-center border border-green-400">
                    <TrendingUp className="h-4 w-4 text-green-700" />
                  </div>
                  <span className="text-sm font-semibold text-green-800">Transactions</span>
                </div>
                <span className="text-3xl font-bold text-green-900">
                  {results?.transactionsFound ?? results?.transactions?.length ?? 0}
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-300 shadow-sm">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center border border-purple-400">
                    <Activity className="h-4 w-4 text-purple-700" />
                  </div>
                  <span className="text-sm font-semibold text-purple-800">Min Change</span>
                </div>
                <span className="text-3xl font-bold text-purple-900">≥ {results?.minPctChange || 4}%</span>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl border-2 border-orange-300 shadow-sm">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-orange-200 rounded-lg flex items-center justify-center border border-orange-400">
                    <BarChart3 className="h-4 w-4 text-orange-700" />
                  </div>
                  <span className="text-sm font-semibold text-orange-800">Avg Factors</span>
                </div>
                <span className="text-3xl font-bold text-orange-900">
                  {results?.factorAnalysis?.summary.averageFactorsPerDay?.toFixed(2) || "0.00"}
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border-2 border-slate-300 shadow-sm">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center border border-slate-400">
                    <Calendar className="h-4 w-4 text-slate-700" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">Created</span>
                </div>
                <span className="text-lg font-bold text-slate-900">
                  {new Date(analysis.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Status Card - Prominent Position */}
      <Card className="border-2 border-purple-400 bg-purple-50 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Brain className="h-5 w-5" />
            AI Analysis
          </CardTitle>
          <CardDescription className="text-purple-600">
            Get AI-powered insights and investment recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status and Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(currentStatus === 'ai_completed' || (currentStatus === 'completed' && analysis.aiInsights)) ? (
                  <>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div>
                      <div className="font-medium text-green-700">AI Analysis Completed</div>
                      <div className="text-sm text-green-600">Insights available</div>
                    </div>
                  </>
                ) : currentStatus === 'ai_processing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    <div>
                      <div className="font-medium text-purple-700">AI Analysis in Progress</div>
                      <div className="text-sm text-purple-600">Generating insights...</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <div>
                      <div className="font-medium text-gray-700">AI Analysis Not Started</div>
                      <div className="text-sm text-gray-600">Click to generate insights</div>
                    </div>
                  </>
                )}
              </div>
              
              {currentStatus !== 'ai_completed' && currentStatus !== 'ai_processing' && !analysis.aiInsights && (
                <Button 
                  onClick={handleRetryAIAnalysis}
                  disabled={isAnalyzingAI || !results}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isAnalyzingAI ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Start AI Analysis
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {/* AI Insights Preview */}
            {analysis.aiInsights && (currentStatus === 'ai_completed' || currentStatus === 'completed') && (
              <div className="mt-4 p-4 bg-white border border-purple-200 rounded-md">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    {(() => {
                      try {
                        const insights = typeof analysis.aiInsights === 'string' 
                          ? JSON.parse(analysis.aiInsights) 
                          : analysis.aiInsights;
                        
                        // Check if parsed result is actually an object with expected properties
                        if (insights && typeof insights === 'object' && ('summary' in insights || 'keyPoints' in insights)) {
                          return (
                            <div className="space-y-4">
                              {/* Summary */}
                              <div>
                                <h4 className="font-semibold text-purple-800 mb-2">Analysis Summary</h4>
                                <div className="text-sm text-gray-700">
                                  {(() => {
                                    // Split the summary into sentences and convert to bullet points
                                    const sentences = insights.summary?.split('. ').filter((s: string) => s.trim()) || [];
                                    return sentences.length > 1 ? (
                                      <ul className="space-y-1">
                                        {sentences.map((sentence: string, index: number) => (
                                          <li key={index} className="flex items-start gap-2">
                                            <span className="text-purple-500 mt-1">•</span>
                                            <span>{sentence.trim()}{sentence.trim() && !sentence.trim().endsWith('.') ? '.' : ''}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p>{insights.summary || 'No summary available'}</p>
                                    );
                                  })()}
                                </div>
                              </div>
                              
                              {/* Key Points */}
                              {insights.keyPoints && insights.keyPoints.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-purple-800 mb-2">Key Findings</h4>
                                  <ul className="space-y-1">
                                    {insights.keyPoints.map((point: string, index: number) => (
                                      <li key={index} className="flex items-start gap-2">
                                        <span className="text-purple-500 mt-1">•</span>
                                        <span className="text-sm text-gray-700">{point}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Metadata */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-purple-100">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-purple-600">{insights.dataPoints || 0}</div>
                                  <div className="text-sm text-gray-600">Data Points</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-600">{insights.factorsAnalyzed || 0}</div>
                                  <div className="text-sm text-gray-600">Factors Analyzed</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-blue-600 capitalize">{insights.confidence || 'medium'}</div>
                                  <div className="text-sm text-gray-600">Confidence</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-gray-600">
                                    {insights.generatedAt ? new Date(insights.generatedAt).toLocaleDateString() : 'N/A'}
                                  </div>
                                  <div className="text-sm text-gray-600">Generated</div>
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          // If parsing succeeded but doesn't have expected structure, treat as markdown string
                          throw new Error('Not a structured object');
                        }
                      } catch (error) {
                        // Render markdown string with proper formatting
                        const markdownText = typeof analysis.aiInsights === 'string' 
                          ? analysis.aiInsights 
                          : JSON.stringify(analysis.aiInsights);
                        
                        // Simple markdown to HTML-like conversion
                        const formatMarkdown = (text: string) => {
                          return text
                            .split('\n')
                            .map((line, index) => {
                              const trimmed = line.trim();
                              if (!trimmed) return <br key={index} />;
                              
                              // Headers
                              if (trimmed.startsWith('### ')) {
                                return <h4 key={index} className="font-semibold text-purple-800 mt-4 mb-2 text-base">{trimmed.substring(4)}</h4>;
                              }
                              if (trimmed.startsWith('## ')) {
                                return <h3 key={index} className="font-semibold text-purple-800 mt-4 mb-2 text-lg">{trimmed.substring(3)}</h3>;
                              }
                              if (trimmed.startsWith('# ')) {
                                return <h2 key={index} className="font-bold text-purple-900 mt-4 mb-2 text-xl">{trimmed.substring(2)}</h2>;
                              }
                              
                              // Numbered lists
                              if (/^\d+\.\s/.test(trimmed)) {
                                const content = trimmed.replace(/^\d+\.\s/, '');
                                return (
                                  <div key={index} className="flex items-start gap-2 ml-4 mb-1">
                                    <span className="text-purple-500 mt-1">•</span>
                                    <span className="text-sm text-gray-700">{formatInlineMarkdown(content)}</span>
                                  </div>
                                );
                              }
                              
                              // Bullet points
                              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                                const content = trimmed.substring(2);
                                return (
                                  <div key={index} className="flex items-start gap-2 ml-4 mb-1">
                                    <span className="text-purple-500 mt-1">•</span>
                                    <span className="text-sm text-gray-700">{formatInlineMarkdown(content)}</span>
                                  </div>
                                );
                              }
                              
                              // Regular paragraph
                              return <p key={index} className="text-sm text-gray-700 mb-2">{formatInlineMarkdown(trimmed)}</p>;
                            });
                        };
                        
                        // Format inline markdown (bold, italic)
                        const formatInlineMarkdown = (text: string) => {
                          const parts: (string | JSX.Element)[] = [];
                          let lastIndex = 0;
                          let key = 0;
                          
                          // Handle bold **text**
                          const boldRegex = /\*\*(.*?)\*\*/g;
                          let match;
                          
                          while ((match = boldRegex.exec(text)) !== null) {
                            if (match.index > lastIndex) {
                              parts.push(text.substring(lastIndex, match.index));
                            }
                            parts.push(<strong key={key++} className="font-semibold text-gray-900">{match[1]}</strong>);
                            lastIndex = match.index + match[0].length;
                          }
                          
                          if (lastIndex < text.length) {
                            parts.push(text.substring(lastIndex));
                          }
                          
                          return parts.length > 0 ? <>{parts}</> : text;
                        };
                        
                        return (
                          <div className="space-y-2 prose prose-sm max-w-none">
                            <h4 className="font-semibold text-purple-800 mb-3">AI Analysis Insights</h4>
                            <div className="text-sm text-gray-700">
                              {formatMarkdown(markdownText)}
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                  
                  {/* Regenerate Button */}
                  <div className="ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleRetryAIAnalysis}
                      disabled={isAnalyzingAI || !results}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      {isAnalyzingAI ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-3 w-3" />
                          Regenerate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {!results && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm text-yellow-800">
                  Complete the stock analysis first to enable AI insights
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Stock Price */}
      {analysis.symbol && (
        <CurrentStockPrice 
          symbol={analysis.symbol} 
          country={(analysis.market as 'US' | 'VN') || undefined} 
        />
      )}

      {/* AI Price Recommendations */}
      <PriceRecommendations 
        analysisId={analysis.id}
        symbol={analysis.symbol}
        currentPrice={analysis.latestPrice || undefined}
        initialRecommendations={analysis.priceRecommendations ? JSON.parse(analysis.priceRecommendations) : null}
      />

      {/* Factor Analysis Summary */}
      {results?.factorAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Factor Analysis Summary
            </CardTitle>
            <CardDescription>
              Market factors detected during the analysis period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Factor Frequency */}
              <div>
                <h4 className="font-semibold mb-3">Factor Frequency</h4>
                <div className="space-y-2">
                  {results?.factorAnalysis?.summary?.factorCounts
                    ? Object.entries(results.factorAnalysis.summary.factorCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([factor, count]) => {
                        const description = FACTOR_DESCRIPTIONS[factor as keyof typeof FACTOR_DESCRIPTIONS];
                        if (!description) {
                          console.warn(`Unknown factor: ${factor}`);
                          return null;
                        }
                        return (
                          <div key={factor} className="flex justify-between items-center">
                            <Badge 
                              variant="outline" 
                              className={getFactorColor(description.category)}
                            >
                              {description.name}
                            </Badge>
                            <span className="text-sm font-medium">{count} days</span>
                          </div>
                        );
                      }).filter(Boolean)
                    : null}
                </div>
              </div>

              {/* Top Performing Factors */}
              <div>
                <h4 className="font-semibold mb-3">Top Performing Factors</h4>
                <div className="space-y-2">
                  {results?.factorAnalysis?.correlation && Object.keys(results.factorAnalysis.correlation).length > 0 ? (
                    Object.entries(results.factorAnalysis.correlation)
                      .sort((a, b) => b[1].avgReturn - a[1].avgReturn)
                      .slice(0, 5)
                      .map(([factor, data]) => {
                        const description = FACTOR_DESCRIPTIONS[factor as keyof typeof FACTOR_DESCRIPTIONS];
                        if (!description) {
                          console.warn(`Unknown factor: ${factor}`);
                          return null;
                        }
                        return (
                          <div key={factor} className="flex justify-between items-center">
                            <Badge 
                              variant="outline" 
                              className={getFactorColor(description.category)}
                            >
                              {description.name}
                            </Badge>
                            <span className="text-sm font-medium text-green-600">
                              +{data.avgReturn.toFixed(2)}%
                            </span>
                          </div>
                        );
                      }).filter(Boolean)
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Correlation data will be calculated when factor analysis is complete
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data and Factor Analysis Tabs */}
      {results && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              Data
            </TabsTrigger>
            <TabsTrigger value="chart" className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Chart
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="scoring" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Daily Scoring
            </TabsTrigger>
          </TabsList>


          <TabsContent value="overview" className="space-y-4">
            <DataQualityDashboard 
              analysisId={analysis.id}
              symbol={analysis.symbol}
              status={currentStatus}
              onRetryFactorGeneration={handleRetryFactorGeneration}
              onRetryAIAnalysis={handleRetryAIAnalysis}
              isGeneratingFactors={isGeneratingFactors || currentStatus === 'processing'}
              isAnalyzingAI={isAnalyzingAI || currentStatus === 'ai_processing'}
              metrics={{
                technicalIndicators: {
                  calculated: true, // This would be determined by checking if technical indicators exist
                  completeness: 85, // This would be calculated based on available data
                  availableIndicators: ['MA20', 'MA50', 'MA200', 'RSI', 'Volume']
                },
                factorData: {
                  exists: results?.factorAnalysis ? true : false,
                  completeness: results?.factorAnalysis ? 75 : 0,
                  totalFactors: results?.transactions?.length || 0,
                  aiFactorsAvailable: true
                },
                dailyScoring: {
                  available: true, // This would be checked from the database
                  completeness: 60, // This would be calculated
                  scoredDays: 15, // This would be fetched from database
                  totalDays: results?.totalDays || 0
                },
                aiAnalysis: {
                  completed: currentStatus === 'ai_completed',
                  inProgress: currentStatus === 'ai_processing',
                  insightsAvailable: !!analysis.aiInsights
                },
                earnings: {
                  dataAvailable: earningsDataAvailable,
                  lastUpdated: earningsLastUpdated
                }
              }}
            />
            
            {/* Real-time Status Indicator */}
            {isPolling && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <div className="text-sm">
                      <div className="font-medium text-blue-800">Live Updates Active</div>
                      <div className="text-blue-600">Last updated: {lastUpdated.toLocaleTimeString()}</div>
                      {progress > 0 && (
                        <div className="mt-1">
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            {filteredResults?.transactions && filteredResults.transactions.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Significant Price Increases ({filteredResults.transactions.length} days)
                  </CardTitle>
                  <CardDescription>
                    Days where closing price increased by {filteredResults?.minPctChange || 4}% or more
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-slate-400 bg-slate-200">
                          <th className="text-left p-3 font-bold text-slate-900">#</th>
                          <th 
                            className="text-left p-3 font-bold text-slate-900 cursor-pointer hover:bg-slate-300 transition-colors"
                            onClick={() => handleSort('date')}
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Date
                              {sortField === 'date' && (
                                sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th 
                            className="text-right p-3 font-bold text-slate-900 cursor-pointer hover:bg-slate-300 transition-colors"
                            onClick={() => handleSort('close')}
                          >
                            <div className="flex items-center justify-end gap-2">
                              <DollarSign className="h-4 w-4" />
                              Close Price
                              {sortField === 'close' && (
                                sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th 
                            className="text-right p-3 font-bold text-slate-900 cursor-pointer hover:bg-slate-300 transition-colors"
                            onClick={() => handleSort('pctChange')}
                          >
                            <div className="flex items-center justify-end gap-2">
                              % Change
                              {sortField === 'pctChange' && (
                                sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                              )}
                            </div>
                          </th>
                          <th className="text-left p-3 font-bold text-slate-900">Factors</th>
                          <th className="text-right p-3 font-bold text-slate-900">Volume</th>
                          <th className="text-right p-3 font-bold text-slate-900">Score</th>
                          <th className="text-left p-3 font-bold text-slate-900">Indicators</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...filteredResults.transactions]
                          .filter(transaction => transaction.pctChange >= (filteredResults?.minPctChange || 4))
                          .sort((a, b) => {
                          // Sort based on selected field and direction
                          let comparison = 0;
                          
                          switch (sortField) {
                            case 'date':
                              const dateA = new Date(a.date).getTime();
                              const dateB = new Date(b.date).getTime();
                              comparison = dateA - dateB;
                              break;
                            case 'close':
                              comparison = a.close - b.close;
                              break;
                            case 'pctChange':
                              comparison = a.pctChange - b.pctChange;
                              break;
                          }
                          
                          // Apply direction
                          return sortDirection === 'asc' ? comparison : -comparison;
                        }).map((transaction, index) => (
                          <tr
                            key={transaction.tx}
                            className={index % 2 === 0 ? "bg-slate-100" : "bg-white"}
                          >
                            <td className="p-3">{transaction.tx}</td>
                            <td className="p-3">
                              {new Date(transaction.date).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-right font-medium">
                              <div className="flex flex-col">
                                {formatPrice(transaction.close, analysis.symbol)}
                                {transaction.open && transaction.high && transaction.low && (
                                  <span className="text-xs text-muted-foreground">
                                    O:{formatPrice(transaction.open, analysis.symbol)} H:{formatPrice(transaction.high, analysis.symbol)} L:{formatPrice(transaction.low, analysis.symbol)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <Badge variant="outline" className="bg-green-100 text-green-800 border-2 border-green-400 font-semibold">
                                +{transaction.pctChange.toFixed(2)}%
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {transaction.factors && transaction.factors.length > 0 ? (
                                  <>
                                    {transaction.factors.slice(0, 3).map((factor) => {
                                      const description = FACTOR_DESCRIPTIONS[factor];
                                      if (!description) {
                                        console.warn(`Unknown factor: ${factor}`);
                                        return null;
                                      }
                                      return (
                                        <Badge
                                          key={factor}
                                          variant="outline"
                                          className={`text-xs ${getFactorColor(description.category)}`}
                                          title={description.description}
                                        >
                                          {description.name}
                                        </Badge>
                                      );
                                    }).filter(Boolean)}
                                    {transaction.factors.length > 3 && (
                                      <Badge variant="outline" className="text-xs bg-gray-100">
                                        +{transaction.factors.length - 3}
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground">None</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-right text-sm">
                              {transaction.volume ? (
                                <span className="text-muted-foreground">
                                  {transaction.volume.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {transaction.score !== undefined ? (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs font-semibold ${
                                    transaction.aboveThreshold 
                                      ? 'bg-blue-100 text-blue-800 border-blue-400' 
                                      : 'bg-gray-100 text-gray-600 border-gray-300'
                                  }`}
                                  title={transaction.aboveThreshold ? 'Above threshold' : 'Below threshold'}
                                >
                                  {transaction.score.toFixed(1)}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1 text-xs">
                                {transaction.ma20 != null && !isNaN(transaction.ma20) && (
                                  <span className="text-muted-foreground" title="20-day Moving Average">
                                    MA20: {transaction.ma20.toFixed(2)}
                                  </span>
                                )}
                                {transaction.ma50 != null && !isNaN(transaction.ma50) && (
                                  <span className="text-muted-foreground" title="50-day Moving Average">
                                    MA50: {transaction.ma50.toFixed(2)}
                                  </span>
                                )}
                                {transaction.rsi != null && !isNaN(transaction.rsi) && (
                                  <span className={`font-medium ${transaction.rsi > 70 ? 'text-red-600' : transaction.rsi < 30 ? 'text-green-600' : 'text-gray-600'}`} title="Relative Strength Index">
                                    RSI: {transaction.rsi.toFixed(1)}
                                  </span>
                                )}
                                {(transaction.ma20 == null || isNaN(transaction.ma20)) && 
                                 (transaction.ma50 == null || isNaN(transaction.ma50)) && 
                                 (transaction.rsi == null || isNaN(transaction.rsi)) && (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No days found with price increases of {results?.minPctChange || 4}% or more
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="chart" className="space-y-4">
            {results ? (
              <StockChart results={results} symbol={analysis.symbol} />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No analysis data available for charting. Please complete the stock analysis first.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <Tabs defaultValue="factors" className="w-full">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="factors" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Factor Analysis
                </TabsTrigger>
              </TabsList>

              <TabsContent value="factors" className="space-y-4">
                {/* Factor Generation Card */}
                {currentStatus !== 'ai_completed' && (
                  <Card className="border-2 border-blue-400 bg-blue-50 shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-800">
                        <BarChart3 className="h-5 w-5" />
                        Factor Analysis
                      </CardTitle>
                      <CardDescription className="text-blue-600">
                        Generate market factors to understand price movement drivers
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {currentStatus === 'factors_ready' || (currentStatus === 'completed' && results?.factorAnalysis) ? (
                              <>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <div>
                                  <div className="font-medium text-green-700">Factors Generated</div>
                                  <div className="text-sm text-green-600">
                                    {results?.factorAnalysis?.summary?.averageFactorsPerDay?.toFixed(2) || "0.00"} factors/day average
                                  </div>
                                </div>
                              </>
                            ) : currentStatus === 'factor_failed' ? (
                              <>
                                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                <div>
                                  <div className="font-medium text-orange-700">Factor Generation Failed</div>
                                  <div className="text-sm text-orange-600">Click to retry factor generation</div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                                <div>
                                  <div className="font-medium text-gray-700">Factors Not Generated</div>
                                  <div className="text-sm text-gray-600">Click to generate market factors</div>
                                </div>
                              </>
                            )}
                          </div>
                          
                          {(currentStatus === 'factor_failed' || (currentStatus === 'completed' && !results?.factorAnalysis)) && (
                            <Button 
                              onClick={handleRetryFactorGeneration}
                              disabled={isGeneratingFactors}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              {isGeneratingFactors ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <BarChart3 className="mr-2 h-4 w-4" />
                                  Generate Factors
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        
                        {/* Factor Analysis Summary */}
                        {results?.factorAnalysis && (
                          <div className="mt-4 p-4 bg-white border border-blue-200 rounded-md">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <div className="font-medium text-blue-800 mb-2">Generation Summary</div>
                                <div className="text-sm text-gray-700 space-y-1">
                                  <div>• Total factors found: {Object.values(results.factorAnalysis.summary?.factorCounts || {}).reduce((sum, count) => sum + count, 0)}</div>
                                  <div>• Average factors per day: {results.factorAnalysis.summary?.averageFactorsPerDay?.toFixed(2) || "0.00"}</div>
                                  <div>• Total days analyzed: {results.factorAnalysis.summary?.totalDays || 0}</div>
                                </div>
                              </div>
                              <div>
                                <div className="font-medium text-blue-800 mb-2">Top Factors</div>
                                <div className="text-sm text-gray-700 space-y-1">
                                  {results?.factorAnalysis?.summary?.factorCounts
                                    ? Object.entries(results.factorAnalysis.summary.factorCounts)
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 3)
                                        .map(([factor, count]) => {
                                          const description = FACTOR_DESCRIPTIONS[factor as keyof typeof FACTOR_DESCRIPTIONS];
                                          if (!description) return null;
                                          return (
                                            <div key={factor}>• {description.name}: {count} days</div>
                                          );
                                        }).filter(Boolean)
                                    : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Factor Analysis Table */}
                <StockFactorTableBackend 
                  analysisId={analysis.id}
                  symbol={analysis.symbol}
                  minPctChange={analysis.minPctChange || 4.0}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="scoring" className="space-y-4">
            <DailyScoringTab 
              stockAnalysisId={analysis.id.toString()}
              csvFilePath={analysis.csvFilePath || undefined}
              symbol={analysis.symbol}
            />
          </TabsContent>
          
          <TabsContent value="earnings" className="space-y-4">
            <EarningsTab symbol={analysis.symbol} />
          </TabsContent>
        </Tabs>
      )}

      </div>
  );
}
