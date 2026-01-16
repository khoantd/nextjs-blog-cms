// Test script to verify existing analyses are fetched properly
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000'; // Frontend URL

async function testFetchExistingAnalyses() {
  console.log('=== Testing Fetch Existing Analyses ===\n');

  try {
    // Test the frontend API route (which forwards to backend)
    console.log('1. Testing frontend API route...');
    const response = await fetch(`${BASE_URL}/api/stock-analyses?page=1&limit=10`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Frontend API route working!');
    console.log('Response structure:', JSON.stringify(data, null, 2));

    // Check if we have analyses
    const analyses = data.data || [];
    console.log(`\n2. Found ${analyses.length} existing analyses:`);
    
    if (analyses.length > 0) {
      analyses.forEach((analysis, index) => {
        console.log(`  ${index + 1}. ${analysis.symbol} - ${analysis.name || 'Unnamed'} (ID: ${analysis.id})`);
      });
      console.log('\n✅ Existing analyses are properly fetched from backend!');
    } else {
      console.log('  No analyses found. This is expected if no analyses have been created yet.');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Make sure the frontend server is running on port 3000');
      console.error('   Run: npm run dev (in the nextjs-blog-cms directory)');
    }
  }
}

async function main() {
  await testFetchExistingAnalyses();
  console.log('\n=== Test Complete ===');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testFetchExistingAnalyses };
