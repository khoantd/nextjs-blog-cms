#!/usr/bin/env node
/**
 * Test script to check current user from remote vnstock API via Next.js API route
 * 
 * This script uses the Next.js API proxy at /api/vnstock/auth/me
 * 
 * Usage:
 *   node test-check-vnstock-user-api.js
 * 
 * Note: This requires the Next.js server to be running and you need to be authenticated
 * (have a vnstock_token cookie set from a previous login)
 */

const NEXTJS_API_URL = process.env.NEXTJS_API_URL || 'http://localhost:3000';

async function checkVnstockUserViaNextJS() {
  console.log('=== Checking User from Remote Vnstock API (via Next.js Proxy) ===\n');
  console.log(`Next.js API URL: ${NEXTJS_API_URL}\n`);

  try {
    console.log('Fetching current user info from /api/vnstock/auth/me...');
    
    const userResponse = await fetch(`${NEXTJS_API_URL}/api/vnstock/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Note: Cookies will be sent automatically if running in browser context
      // For Node.js, you may need to manually set the Cookie header
    });

    if (!userResponse.ok) {
      const error = await userResponse.json().catch(() => ({ error: userResponse.statusText }));
      
      if (userResponse.status === 401) {
        console.error('✗ Authentication required');
        console.error('  Error:', error.error || 'Not authenticated');
        console.error('\nPlease login first:');
        console.error(`  POST ${NEXTJS_API_URL}/api/vnstock/auth/login`);
        console.error('  Body: { "username": "...", "password": "..." }');
        return;
      }
      
      throw new Error(`Failed to get user: ${error.error || userResponse.statusText}`);
    }

    const user = await userResponse.json();
    console.log('✓ User info retrieved successfully\n');
    console.log('=== Current User Information ===');
    console.log(JSON.stringify(user, null, 2));
    console.log('\n=== Test Complete ===');
  } catch (error) {
    console.error('✗ Failed to get user info:', error.message);
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      console.error(`\nCannot connect to Next.js API at ${NEXTJS_API_URL}`);
      console.error('Please check if the Next.js server is running.');
      console.error('Start it with: npm run dev');
    }
    process.exit(1);
  }
}

// Run the test
checkVnstockUserViaNextJS().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
