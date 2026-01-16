/**
 * Script: Delete All Stock Analyses from Remote Backend (Direct API Call)
 * 
 * This script directly calls the remote backend API to delete all stock analyses.
 * 
 * WARNING: This is a destructive operation that cannot be undone!
 * 
 * Usage:
 *   REMOTE_BACKEND_URL=http://72.60.233.159:3050 npx tsx scripts/delete-all-stock-analyses-remote-backend.ts --confirm
 * 
 * Or set NEXT_PUBLIC_API_URL in .env.local:
 *   npx tsx scripts/delete-all-stock-analyses-remote-backend.ts --confirm
 */

import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const REMOTE_BACKEND_URL = process.env.REMOTE_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://72.60.233.159:3050';

/**
 * Get dev token from remote backend
 */
async function getDevToken(): Promise<string | null> {
  try {
    const response = await fetch(`${REMOTE_BACKEND_URL}/api/auth/dev-token`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to get dev token: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.token || null;
  } catch (error) {
    console.error('Error getting dev token:', error);
    return null;
  }
}

/**
 * Delete all stock analyses from remote backend
 */
async function deleteAllStockAnalysesRemoteBackend(confirm: boolean = false, cookieHeader?: string) {
  if (!confirm) {
    console.log('⚠️  WARNING: This will delete ALL stock analyses from the remote backend!');
    console.log(`   Remote Backend: ${REMOTE_BACKEND_URL}`);
    console.log('   This operation CANNOT be undone!\n');
    console.log('   To proceed, run with --confirm flag:');
    console.log('   npx tsx scripts/delete-all-stock-analyses-remote-backend.ts --confirm\n');
    return;
  }

  console.log('🗑️  Starting deletion of all stock analyses from remote backend...\n');
  console.log(`📡 Remote Backend URL: ${REMOTE_BACKEND_URL}\n`);

  // Try to get dev token first (for non-production environments)
  let authHeader: string | undefined;
  
  if (!cookieHeader) {
    console.log('🔐 Attempting to get dev token from remote backend...');
    const devToken = await getDevToken();
    
    if (devToken) {
      console.log('✅ Got dev token');
      // Create a cookie-like header for the backend
      cookieHeader = `next-auth.session-token=${devToken}`;
    } else {
      console.log('⚠️  Could not get dev token. You may need to provide cookies manually.');
      console.log('   Set COOKIE_HEADER environment variable with your session cookie.\n');
      return;
    }
  }

  try {
    // Step 1: Fetch all stock analyses
    console.log('📥 Fetching all stock analyses...');
    const allAnalyses: any[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await fetch(`${REMOTE_BACKEND_URL}/api/stock-analyses?page=${page}&limit=${limit}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader || '',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication failed. Please ensure you are logged in or provide valid cookies.');
          }
          throw new Error(`Failed to fetch stock analyses: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const analyses = data.data || data.analyses || [];
        const total = data.total || data.count || 0;

        if (Array.isArray(analyses)) {
          allAnalyses.push(...analyses);
        }

        console.log(`   Fetched page ${page}: ${analyses.length} analyses (Total so far: ${allAnalyses.length})`);

        // Check if there are more pages
        const totalPages = Math.ceil(total / limit);
        hasMore = page < totalPages && analyses.length > 0;
        page++;

        // Safety check
        if (analyses.length < limit) {
          hasMore = false;
        }
      } catch (fetchError: any) {
        console.error(`Error fetching page ${page}:`, fetchError.message);
        hasMore = false;
      }
    }

    const totalCount = allAnalyses.length;

    if (totalCount === 0) {
      console.log('✅ No stock analyses found. Nothing to delete.');
      return;
    }

    console.log(`\n📊 Found ${totalCount} stock analysis(es) to delete:\n`);
    allAnalyses.forEach((analysis, index) => {
      console.log(`   ${index + 1}. ${analysis.symbol || 'N/A'} - ${analysis.name || 'N/A'} (ID: ${analysis.id})`);
    });
    console.log('');

    // Step 2: Delete each stock analysis
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    console.log('🗑️  Deleting stock analyses...\n');

    for (const analysis of allAnalyses) {
      const analysisId = analysis.id;

      if (!analysisId) {
        console.warn(`   ⚠️  Skipping analysis without ID:`, analysis);
        results.failed++;
        results.errors.push(`Analysis without ID: ${JSON.stringify(analysis)}`);
        continue;
      }

      try {
        const deleteResponse = await fetch(`${REMOTE_BACKEND_URL}/api/stock-analyses/${analysisId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader || '',
          },
        });

        if (deleteResponse.ok) {
          results.successful++;
          console.log(`   ✅ Deleted ${analysisId} (${analysis.symbol || 'N/A'})`);
        } else {
          const errorData = await deleteResponse.json().catch(() => ({}));
          const errorMsg = errorData.error || errorData.message || `HTTP ${deleteResponse.status}`;
          results.failed++;
          results.errors.push(`${analysisId} (${analysis.symbol || 'N/A'}): ${errorMsg}`);
          console.error(`   ❌ Failed to delete ${analysisId}: ${errorMsg}`);
        }
      } catch (deleteError: any) {
        results.failed++;
        const errorMsg = deleteError.message || `Failed to delete analysis ${analysisId}`;
        results.errors.push(`${analysisId} (${analysis.symbol || 'N/A'}): ${errorMsg}`);
        console.error(`   ❌ Error deleting ${analysisId}:`, errorMsg);
      }
    }

    console.log('\n✅ Deletion completed!\n');
    console.log('📊 Summary:');
    console.log(`   Total Found: ${totalCount}`);
    console.log(`   Deleted: ${results.successful}`);
    console.log(`   Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n💡 All stock analysis data has been permanently deleted from the remote backend.');
  } catch (error) {
    console.error('\n❌ Error deleting stock analyses:', error);

    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('\n💡 Authentication failed. Please ensure:');
        console.error('   1. The remote backend allows dev tokens (non-production)');
        console.error('   2. Or provide COOKIE_HEADER with valid session cookie');
        console.error('   3. You have admin permissions');
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        console.error('\n💡 Connection failed. Please ensure:');
        console.error(`   1. The remote backend is running at ${REMOTE_BACKEND_URL}`);
        console.error('   2. The backend is accessible from your network');
      }
    }

    throw error;
  }
}

// Run script if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const confirm = args.includes('--confirm');
  const cookieHeader = process.env.COOKIE_HEADER;

  deleteAllStockAnalysesRemoteBackend(confirm, cookieHeader)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script error:', error);
      process.exit(1);
    });
}

export { deleteAllStockAnalysesRemoteBackend };
