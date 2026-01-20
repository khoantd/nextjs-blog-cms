import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/stock-analyses/delete-empty
 * 
 * Deletes stock analyses that have no data from the remote backend.
 * 
 * An analysis is considered "empty" if it has:
 * - No CSV file path
 * - No daily factor data
 * - No daily scores
 * 
 * WARNING: This is a destructive operation that cannot be undone!
 * 
 * Requires authentication (admin role).
 */
export async function DELETE(request: NextRequest) {
  try {
    // MUST use remote backend URL - prioritize REMOTE_BACKEND_URL, then check NEXT_PUBLIC_API_URL
    // Default to remote backend if neither is set
    const remoteBackendUrl = process.env.REMOTE_BACKEND_URL || 
                             (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL !== 'http://localhost:3001' 
                               ? process.env.NEXT_PUBLIC_API_URL 
                               : 'http://72.60.233.159:3050');
    
    console.log('[DELETE /api/stock-analyses/delete-empty] Starting deletion of empty analyses...');
    console.log('[DELETE /api/stock-analyses/delete-empty] Remote Backend URL:', remoteBackendUrl);
    
    // Extract cookies from the incoming Next.js request
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Step 1: Fetch all stock analyses (with pagination to get all)
    const allAnalyses: any[] = [];
    let page = 1;
    const limit = 100; // Fetch 100 at a time
    let hasMore = true;
    
    while (hasMore) {
      try {
        const response = await fetch(`${remoteBackendUrl}/api/stock-analyses?page=${page}&limit=${limit}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(cookieHeader && { 'Cookie': cookieHeader }),
          },
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed. Please ensure you are logged in and have admin permissions.');
          }
          throw new Error(`Failed to fetch stock analyses: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Backend returns { data: { items: [...], pagination: {...} } } format
        let analyses: any[] = [];
        let total = 0;
        
        if (data.data && data.data.items) {
          // Backend paginated format
          analyses = data.data.items || [];
          total = data.data.pagination?.total || data.data.pagination?.count || 0;
        } else if (data.data && Array.isArray(data.data)) {
          // Direct array format
          analyses = data.data;
          total = data.pagination?.total || data.total || analyses.length;
        } else if (Array.isArray(data)) {
          // Direct array response
          analyses = data;
          total = analyses.length;
        } else {
          // Fallback
          analyses = data.analyses || data.items || [];
          total = data.total || data.count || 0;
        }
        
        if (Array.isArray(analyses)) {
          allAnalyses.push(...analyses);
        }
        
        console.log(`[DELETE /api/stock-analyses/delete-empty] Fetched page ${page}: ${analyses.length} analyses (Total so far: ${allAnalyses.length})`);
        
        // Check if there are more pages
        const totalPages = Math.ceil(total / limit);
        hasMore = page < totalPages && analyses.length > 0;
        page++;
        
        // Safety check: if we got fewer than limit, we're done
        if (analyses.length < limit) {
          hasMore = false;
        }
      } catch (fetchError: any) {
        console.error(`[DELETE /api/stock-analyses/delete-empty] Error fetching page ${page}:`, fetchError);
        // If it's a 401, break and let it propagate
        if (fetchError.message?.includes('401') || fetchError.message?.includes('Authentication')) {
          throw fetchError;
        }
        // For other errors, try to continue
        hasMore = false;
      }
    }
    
    const totalCount = allAnalyses.length;
    
    if (totalCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stock analyses found',
        deleted: 0,
        checked: 0,
      });
    }
    
    console.log(`[DELETE /api/stock-analyses/delete-empty] Found ${totalCount} stock analyses to check`);
    
    // Step 2: Check each analysis to see if it has data
    const emptyAnalyses: any[] = [];
    const checkedAnalyses: any[] = [];
    const skippedAnalyses: Array<{ id: any; reason: string }> = [];
    
    for (const analysis of allAnalyses) {
      const analysisId = analysis.id;
      
      // Validate ID before checking data (single check - removed duplicate)
      if (!analysisId) {
        console.warn(`[DELETE /api/stock-analyses/delete-empty] Skipping analysis without ID:`, analysis);
        skippedAnalyses.push({ id: null, reason: 'Missing ID' });
        continue;
      }
      
      try {
        // Ensure ID is a valid number
        const numericId = typeof analysisId === 'string' ? parseInt(analysisId, 10) : Number(analysisId);
        if (isNaN(numericId) || numericId <= 0) {
          console.warn(`[DELETE /api/stock-analyses/delete-empty] Invalid ID format: ${analysisId} (type: ${typeof analysisId})`, analysis);
          skippedAnalyses.push({ id: analysisId, reason: 'Invalid ID format' });
          continue;
        }
        
        // Check if analysis has CSV file path
        const hasCsvFile = analysis.csvFilePath && analysis.csvFilePath.trim() !== '';
        
        // Check if analysis has daily factor data
        let hasDailyFactorData = false;
        let factorCheckError: string | null = null;
        try {
          const factorDataResponse = await fetch(
            `${remoteBackendUrl}/api/stock-analyses/${numericId}/daily-factor-data?page=1&limit=1`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...(cookieHeader && { 'Cookie': cookieHeader }),
              },
            }
          );
          
          // Handle different error statuses
          if (factorDataResponse.status === 400) {
            // Invalid ID or filter parameter - skip this analysis
            console.warn(`[DELETE /api/stock-analyses/delete-empty] Invalid ID ${numericId} when checking daily factor data - skipping`);
            skippedAnalyses.push({ id: numericId, reason: 'Invalid ID (400 error)' });
            continue;
          }
          
          if (factorDataResponse.status === 404) {
            // Analysis not found - skip this analysis
            console.warn(`[DELETE /api/stock-analyses/delete-empty] Analysis ${numericId} not found when checking daily factor data - skipping`);
            skippedAnalyses.push({ id: numericId, reason: 'Analysis not found (404)' });
            continue;
          }
          
          if (factorDataResponse.status === 401 || factorDataResponse.status === 403) {
            // Authentication/authorization error - propagate
            throw new Error(`Authentication failed: ${factorDataResponse.status}`);
          }
          
          if (factorDataResponse.ok) {
            const factorData = await factorDataResponse.json();
            // Handle multiple response formats
            const items = factorData.data?.items || 
                         factorData.data || 
                         factorData.items || 
                         (Array.isArray(factorData) ? factorData : []);
            hasDailyFactorData = Array.isArray(items) && items.length > 0;
          } else {
            // Non-OK response (500, etc.) - assume it might have data to be safe
            factorCheckError = `HTTP ${factorDataResponse.status}`;
            console.warn(`[DELETE /api/stock-analyses/delete-empty] Non-OK response when checking daily factor data for ${numericId}: ${factorDataResponse.status}`);
            // Don't set hasDailyFactorData = true, but also don't delete to be safe
          }
        } catch (factorError: any) {
          // Network error or other exception - assume it might have data to be safe
          factorCheckError = factorError.message || 'Network error';
          console.warn(`[DELETE /api/stock-analyses/delete-empty] Could not check daily factor data for ${numericId}:`, factorError);
          // Don't set hasDailyFactorData = true, but also don't delete to be safe
        }
        
        // Check if analysis has daily scores
        let hasDailyScores = false;
        let scoresCheckError: string | null = null;
        try {
          const scoresResponse = await fetch(
            `${remoteBackendUrl}/api/stock-analyses/${numericId}/daily-scores?page=1&limit=1`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...(cookieHeader && { 'Cookie': cookieHeader }),
              },
            }
          );
          
          // Handle different error statuses
          if (scoresResponse.status === 400) {
            // Invalid ID or filter parameter - skip this analysis
            console.warn(`[DELETE /api/stock-analyses/delete-empty] Invalid ID ${numericId} when checking daily scores - skipping`);
            skippedAnalyses.push({ id: numericId, reason: 'Invalid ID (400 error)' });
            continue;
          }
          
          if (scoresResponse.status === 404) {
            // Analysis not found - skip this analysis
            console.warn(`[DELETE /api/stock-analyses/delete-empty] Analysis ${numericId} not found when checking daily scores - skipping`);
            skippedAnalyses.push({ id: numericId, reason: 'Analysis not found (404)' });
            continue;
          }
          
          if (scoresResponse.status === 401 || scoresResponse.status === 403) {
            // Authentication/authorization error - propagate
            throw new Error(`Authentication failed: ${scoresResponse.status}`);
          }
          
          if (scoresResponse.ok) {
            const scoresData = await scoresResponse.json();
            // Handle multiple response formats
            const items = scoresData.data?.items || 
                         scoresData.data || 
                         scoresData.items || 
                         (Array.isArray(scoresData) ? scoresData : []);
            hasDailyScores = Array.isArray(items) && items.length > 0;
          } else {
            // Non-OK response (500, etc.) - assume it might have data to be safe
            scoresCheckError = `HTTP ${scoresResponse.status}`;
            console.warn(`[DELETE /api/stock-analyses/delete-empty] Non-OK response when checking daily scores for ${numericId}: ${scoresResponse.status}`);
            // Don't set hasDailyScores = true, but also don't delete to be safe
          }
        } catch (scoresError: any) {
          // Network error or other exception - assume it might have data to be safe
          scoresCheckError = scoresError.message || 'Network error';
          console.warn(`[DELETE /api/stock-analyses/delete-empty] Could not check daily scores for ${numericId}:`, scoresError);
          // Don't set hasDailyScores = true, but also don't delete to be safe
        }
        
        // Analysis is considered empty if it has:
        // - No CSV file AND
        // - No daily factor data AND
        // - No daily scores
        // AND we were able to verify all checks (no errors)
        const isEmpty = !hasCsvFile && 
                       !hasDailyFactorData && 
                       !hasDailyScores &&
                       !factorCheckError && 
                       !scoresCheckError;
        
        checkedAnalyses.push({
          id: numericId,
          symbol: analysis.symbol || 'N/A',
          hasCsvFile,
          hasDailyFactorData,
          hasDailyScores,
          isEmpty,
          factorCheckError,
          scoresCheckError,
        });
        
        if (isEmpty) {
          emptyAnalyses.push({ ...analysis, id: numericId });
          console.log(`[DELETE /api/stock-analyses/delete-empty] Found empty analysis: ID ${numericId} (${analysis.symbol || 'N/A'})`);
        } else if (factorCheckError || scoresCheckError) {
          // Log analyses that couldn't be verified
          console.log(`[DELETE /api/stock-analyses/delete-empty] Skipping analysis ${numericId} due to verification errors (factor: ${factorCheckError || 'OK'}, scores: ${scoresCheckError || 'OK'})`);
        }
      } catch (checkError: any) {
        console.error(`[DELETE /api/stock-analyses/delete-empty] Error checking analysis ${analysisId}:`, checkError);
        skippedAnalyses.push({ id: analysisId, reason: `Check error: ${checkError.message}` });
        // Continue checking other analyses
      }
    }
    
    console.log(`[DELETE /api/stock-analyses/delete-empty] Found ${emptyAnalyses.length} empty analyses out of ${totalCount} total`);
    console.log(`[DELETE /api/stock-analyses/delete-empty] Skipped ${skippedAnalyses.length} analyses due to errors or invalid data`);
    
    if (emptyAnalyses.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No empty stock analyses found',
        deleted: 0,
        checked: checkedAnalyses.length,
        skipped: skippedAnalyses.length,
        emptyCount: 0,
        ...(skippedAnalyses.length > 0 && { skippedReasons: skippedAnalyses }),
      });
    }
    
    // Step 3: Delete each empty analysis
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    for (const analysis of emptyAnalyses) {
      const analysisId = analysis.id;
      
      // Validate ID before attempting deletion
      if (!analysisId) {
        console.warn(`[DELETE /api/stock-analyses/delete-empty] Skipping analysis without ID:`, analysis);
        results.failed++;
        results.errors.push(`Analysis without ID (${analysis.symbol || 'N/A'}): Missing ID`);
        continue;
      }
      
      // Ensure ID is a valid number
      const numericId = typeof analysisId === 'string' ? parseInt(analysisId, 10) : Number(analysisId);
      if (isNaN(numericId) || numericId <= 0) {
        console.warn(`[DELETE /api/stock-analyses/delete-empty] Invalid ID format: ${analysisId} (type: ${typeof analysisId})`, analysis);
        results.failed++;
        results.errors.push(`Analysis ${analysisId} (${analysis.symbol || 'N/A'}): Invalid ID format`);
        continue;
      }
      
      try {
        console.log(`[DELETE /api/stock-analyses/delete-empty] Attempting to delete analysis ${numericId} (${analysis.symbol || 'N/A'})...`);
        
        const deleteResponse = await fetch(`${remoteBackendUrl}/api/stock-analyses/${numericId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(cookieHeader && { 'Cookie': cookieHeader }),
          },
        });
        
        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json().catch(() => ({}));
          const errorMsg = errorData.error || errorData.message || `HTTP ${deleteResponse.status}`;
          
          // Log detailed error information
          console.error(`[DELETE /api/stock-analyses/delete-empty] Delete failed for ${numericId}:`, {
            status: deleteResponse.status,
            statusText: deleteResponse.statusText,
            error: errorData,
          });
          
          throw new Error(errorMsg);
        }
        
        results.successful++;
        console.log(`[DELETE /api/stock-analyses/delete-empty] ✅ Deleted empty analysis ${numericId} (${analysis.symbol || 'N/A'})`);
      } catch (deleteError: any) {
        results.failed++;
        const errorMsg = deleteError.message || `Failed to delete analysis ${numericId}`;
        results.errors.push(`${numericId} (${analysis.symbol || 'N/A'}): ${errorMsg}`);
        console.error(`[DELETE /api/stock-analyses/delete-empty] Error deleting analysis ${numericId}:`, deleteError);
        
        // If it's an auth error, stop and propagate
        if (deleteError.message?.includes('401') || deleteError.message?.includes('Authentication')) {
          throw deleteError;
        }
      }
    }
    
    console.log(`[DELETE /api/stock-analyses/delete-empty] Deletion complete: ${results.successful} successful, ${results.failed} failed`);
    
    return NextResponse.json({
      success: true,
      message: `Deleted ${results.successful} out of ${emptyAnalyses.length} empty stock analyses`,
      deleted: results.successful,
      failed: results.failed,
      checked: checkedAnalyses.length,
      skipped: skippedAnalyses.length,
      emptyCount: emptyAnalyses.length,
      ...(results.errors.length > 0 && { errors: results.errors }),
      ...(skippedAnalyses.length > 0 && { skippedReasons: skippedAnalyses }),
    });
  } catch (error) {
    console.error('[DELETE /api/stock-analyses/delete-empty] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStatus = (error as any)?.status || 500;
    
    // Check if it's an authentication error
    const isAuthError = errorStatus === 401 || 
                       errorMessage.toLowerCase().includes('unauthorized') ||
                       errorMessage.includes('401');
    
    if (isAuthError) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: 'Unauthorized. Please ensure you are logged in and have admin permissions.',
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Failed to delete empty stock analyses',
        message: errorMessage,
      },
      { status: errorStatus }
    );
  }
}
