#!/usr/bin/env tsx

/**
 * Script to delete stock analyses with no data from remote backend
 * 
 * Usage:
 *   tsx scripts/delete-empty-analyses.ts
 * 
 * This script calls the DELETE /api/stock-analyses/delete-empty endpoint
 * which identifies and deletes analyses that have:
 * - No CSV file path
 * - No daily factor data
 * - No daily scores
 * 
 * Requires:
 * - Next.js frontend server running (for API route)
 * - Admin authentication (cookies from browser session)
 * - Remote backend accessible
 */

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
const API_ENDPOINT = `${FRONTEND_URL}/api/stock-analyses/delete-empty`;

async function deleteEmptyAnalyses(cookieHeader?: string) {
  console.log('🗑️  Starting deletion of empty stock analyses...\n');
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`API Endpoint: ${API_ENDPOINT}\n`);

  if (!cookieHeader) {
    console.error('❌ Error: Cookie header is required for authentication.');
    console.error('\nTo get your cookies:');
    console.error('1. Open your browser and log in to the application');
    console.error('2. Open Developer Tools (F12)');
    console.error('3. Go to Application/Storage > Cookies');
    console.error('4. Copy the value of "next-auth.session-token" or "__Secure-next-auth.session-token"');
    console.error('5. Run this script with: COOKIE="your-cookie-value" tsx scripts/delete-empty-analyses.ts\n');
    process.exit(1);
  }

  try {
    console.log('📡 Calling DELETE /api/stock-analyses/delete-empty...\n');

    const response = await fetch(API_ENDPOINT, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || errorData.message || `HTTP ${response.status}`;
      
      if (response.status === 401) {
        console.error('❌ Authentication failed. Please ensure you are logged in and have admin permissions.');
        process.exit(1);
      }
      
      throw new Error(errorMsg);
    }

    const result = await response.json();

    console.log('✅ Deletion completed successfully!\n');
    console.log('Results:');
    console.log(`  - Checked: ${result.checked || 0} analyses`);
    console.log(`  - Empty: ${result.emptyCount || 0} analyses`);
    console.log(`  - Deleted: ${result.deleted || 0} analyses`);
    console.log(`  - Failed: ${result.failed || 0} analyses`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      result.errors.forEach((error: string) => {
        console.log(`  - ${error}`);
      });
    }

    console.log(`\n📊 Summary: ${result.message || 'Completed'}`);
  } catch (error) {
    console.error('\n❌ Error deleting empty analyses:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
    process.exit(1);
  }
}

// Get cookie from environment variable or command line argument
const cookieHeader = process.env.COOKIE || process.argv[2];

if (!cookieHeader && process.argv.length < 3) {
  console.log('Usage:');
  console.log('  COOKIE="your-cookie-value" tsx scripts/delete-empty-analyses.ts');
  console.log('  OR');
  console.log('  tsx scripts/delete-empty-analyses.ts "your-cookie-value"\n');
  console.log('To get your cookie:');
  console.log('1. Log in to the application in your browser');
  console.log('2. Open Developer Tools (F12)');
  console.log('3. Go to Application/Storage > Cookies');
  console.log('4. Copy the value of "next-auth.session-token" or "__Secure-next-auth.session-token"\n');
  process.exit(1);
}

deleteEmptyAnalyses(cookieHeader);
