import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/stock-analyses/delete-all
 * 
 * Deletes all stock analyses from the remote backend.
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
    
    console.log('[DELETE /api/stock-analyses/delete-all] Starting bulk deletion...');
    console.log('[DELETE /api/stock-analyses/delete-all] Remote Backend URL:', remoteBackendUrl);
    
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
        
        console.log(`[DELETE /api/stock-analyses/delete-all] Fetched page ${page}: ${analyses.length} analyses (Total so far: ${allAnalyses.length})`);
        
        // Check if there are more pages
        const totalPages = Math.ceil(total / limit);
        hasMore = page < totalPages && analyses.length > 0;
        page++;
        
        // Safety check: if we got fewer than limit, we're done
        if (analyses.length < limit) {
          hasMore = false;
        }
      } catch (fetchError: any) {
        console.error(`[DELETE /api/stock-analyses/delete-all] Error fetching page ${page}:`, fetchError);
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
        message: 'No stock analyses found to delete',
        deleted: 0,
      });
    }
    
    console.log(`[DELETE /api/stock-analyses/delete-all] Found ${totalCount} stock analyses to delete`);
    
    // Step 2: Delete each stock analysis
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    for (const analysis of allAnalyses) {
      const analysisId = analysis.id;
      
      if (!analysisId) {
        console.warn(`[DELETE /api/stock-analyses/delete-all] Skipping analysis without ID:`, analysis);
        results.failed++;
        results.errors.push(`Analysis without ID: ${JSON.stringify(analysis)}`);
        continue;
      }
      
      try {
        const deleteResponse = await fetch(`${remoteBackendUrl}/api/stock-analyses/${analysisId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(cookieHeader && { 'Cookie': cookieHeader }),
          },
        });
        
        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json().catch(() => ({}));
          const errorMsg = errorData.error || errorData.message || `HTTP ${deleteResponse.status}`;
          throw new Error(errorMsg);
        }
        
        results.successful++;
        console.log(`[DELETE /api/stock-analyses/delete-all] Deleted analysis ${analysisId} (${analysis.symbol || 'N/A'})`);
      } catch (deleteError: any) {
        results.failed++;
        const errorMsg = deleteError.message || `Failed to delete analysis ${analysisId}`;
        results.errors.push(`${analysisId} (${analysis.symbol || 'N/A'}): ${errorMsg}`);
        console.error(`[DELETE /api/stock-analyses/delete-all] Error deleting analysis ${analysisId}:`, deleteError);
        
        // If it's an auth error, stop and propagate
        if (deleteError.message?.includes('401') || deleteError.message?.includes('Authentication')) {
          throw deleteError;
        }
      }
    }
    
    console.log(`[DELETE /api/stock-analyses/delete-all] Deletion complete: ${results.successful} successful, ${results.failed} failed`);
    
    return NextResponse.json({
      success: true,
      message: `Deleted ${results.successful} out of ${totalCount} stock analyses`,
      deleted: results.successful,
      failed: results.failed,
      total: totalCount,
      ...(results.errors.length > 0 && { errors: results.errors }),
    });
  } catch (error) {
    console.error('[DELETE /api/stock-analyses/delete-all] Error:', error);
    
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
        error: 'Failed to delete stock analyses',
        message: errorMessage,
      },
      { status: errorStatus }
    );
  }
}
