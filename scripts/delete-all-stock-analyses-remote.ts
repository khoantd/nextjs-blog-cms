/**
 * Script: Delete All Stock Analyses from Remote Backend
 * 
 * This script deletes all stock analyses from the remote backend via the Next.js API.
 * 
 * WARNING: This is a destructive operation that cannot be undone!
 * 
 * Usage:
 *   npx tsx scripts/delete-all-stock-analyses-remote.ts
 *   or with confirmation:
 *   npx tsx scripts/delete-all-stock-analyses-remote.ts --confirm
 * 
 * Note: This script requires you to be authenticated. You can either:
 * 1. Run it while logged into the Next.js app in your browser (cookies will be used)
 * 2. Or manually provide cookies via environment variable COOKIE_HEADER
 */

import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const FRONTEND_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const DELETE_ALL_ENDPOINT = `${FRONTEND_URL}/api/stock-analyses/delete-all`;

/**
 * Delete all stock analyses from remote backend
 */
async function deleteAllStockAnalysesRemote(confirm: boolean = false, cookieHeader?: string) {
  if (!confirm) {
    console.log('⚠️  WARNING: This will delete ALL stock analyses from the remote backend!');
    console.log('   This operation CANNOT be undone!\n');
    console.log('   To proceed, run with --confirm flag:');
    console.log('   npx tsx scripts/delete-all-stock-analyses-remote.ts --confirm\n');
    console.log('   Note: You must be authenticated. Options:');
    console.log('   1. Copy cookies from your browser session');
    console.log('   2. Set COOKIE_HEADER environment variable with your session cookie');
    console.log('   3. Or run this while logged into the Next.js app\n');
    return;
  }

  console.log('🗑️  Starting deletion of all stock analyses from remote backend...\n');
  console.log(`📡 Frontend URL: ${FRONTEND_URL}`);
  console.log(`🔗 Endpoint: ${DELETE_ALL_ENDPOINT}\n`);

  if (!cookieHeader) {
    console.log('⚠️  No cookie header provided.');
    console.log('   This script requires authentication cookies.');
    console.log('   Please set COOKIE_HEADER environment variable with your session cookie.\n');
    console.log('   Example:');
    console.log('   COOKIE_HEADER="next-auth.session-token=your-token-here" npx tsx scripts/delete-all-stock-analyses-remote.ts --confirm\n');
    return;
  }

  try {
    const response = await fetch(DELETE_ALL_ENDPOINT, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error deleting stock analyses:', data);
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('✅ Deletion completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Total Found: ${data.total || 0}`);
    console.log(`   Deleted: ${data.deleted || 0}`);
    console.log(`   Failed: ${data.failed || 0}`);
    
    if (data.errors && data.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      data.errors.forEach((error: string, index: number) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    console.log('\n💡 All stock analysis data has been permanently deleted from the remote backend.');
  } catch (error) {
    console.error('\n❌ Error deleting stock analyses:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('\n💡 Authentication failed. Please ensure:');
        console.error('   1. You are logged into the Next.js app');
        console.error('   2. Your session cookie is valid');
        console.error('   3. You have admin permissions');
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        console.error('\n💡 Connection failed. Please ensure:');
        console.error(`   1. The Next.js app is running at ${FRONTEND_URL}`);
        console.error('   2. The backend is accessible');
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

  deleteAllStockAnalysesRemote(confirm, cookieHeader)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script error:', error);
      process.exit(1);
    });
}

export { deleteAllStockAnalysesRemote };
