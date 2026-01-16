#!/usr/bin/env node
/**
 * Test script to check current user from remote vnstock API
 * 
 * Usage:
 *   node test-check-vnstock-user.js [username] [password]
 * 
 * If username/password are not provided, it will try to use stored token
 * or prompt for credentials.
 */

const BASE_URL = process.env.NEXT_PUBLIC_VNSTOCK_API_URL || 'http://72.60.233.159:8002';

async function checkVnstockUser(username, password) {
  console.log('=== Checking User from Remote Vnstock API ===\n');
  console.log(`API URL: ${BASE_URL}\n`);

  let token = null;

  // Step 1: Try to login if credentials provided
  if (username && password) {
    console.log('1. Logging in with provided credentials...');
    try {
      const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!loginResponse.ok) {
        const error = await loginResponse.json().catch(() => ({ detail: loginResponse.statusText }));
        throw new Error(`Login failed: ${error.detail || loginResponse.statusText}`);
      }

      const tokenData = await loginResponse.json();
      token = tokenData.access_token;
      console.log('✓ Login successful');
      console.log(`  Token type: ${tokenData.token_type}`);
      console.log(`  Token (first 20 chars): ${token.substring(0, 20)}...\n`);
    } catch (error) {
      console.error('✗ Login failed:', error.message);
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        console.error(`\nCannot connect to vnstock API at ${BASE_URL}`);
        console.error('Please check if the API server is running.');
      }
      process.exit(1);
    }
  } else {
    console.log('⚠ No credentials provided. Skipping login.');
    console.log('  Note: To check user, you need to login first or provide a valid token.\n');
    console.log('Usage: node test-check-vnstock-user.js <username> <password>');
    process.exit(0);
  }

  // Step 2: Get current user info
  if (token) {
    console.log('2. Fetching current user info...');
    try {
      const userResponse = await fetch(`${BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          throw new Error('Authentication expired or invalid token');
        }
        const error = await userResponse.json().catch(() => ({ detail: userResponse.statusText }));
        throw new Error(`Failed to get user: ${error.detail || userResponse.statusText}`);
      }

      const user = await userResponse.json();
      console.log('✓ User info retrieved successfully\n');
      console.log('=== Current User Information ===');
      console.log(JSON.stringify(user, null, 2));
      console.log('\n=== Test Complete ===');
    } catch (error) {
      console.error('✗ Failed to get user info:', error.message);
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        console.error(`\nCannot connect to vnstock API at ${BASE_URL}`);
        console.error('Please check if the API server is running.');
      }
      process.exit(1);
    }
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const username = args[0];
const password = args[1];

// Run the test
checkVnstockUser(username, password).catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
