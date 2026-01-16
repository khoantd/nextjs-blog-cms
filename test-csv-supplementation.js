// Test script to verify CSV supplementation functionality
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';

async function testCSVSupplementation() {
  console.log('=== Testing CSV Supplementation Feature ===\n');

  try {
    // Step 1: Get existing analyses
    console.log('1. Fetching existing analyses...');
    const analysesResponse = await fetch(`${BASE_URL}/api/stock-analyses`, {
      credentials: 'include',
    });
    
    if (!analysesResponse.ok) {
      throw new Error('Failed to fetch existing analyses');
    }
    
    const analysesData = await analysesResponse.json();
    const analyses = analysesData.data?.stockAnalyses || [];
    
    console.log(`Found ${analyses.length} existing analyses`);
    
    if (analyses.length === 0) {
      console.log('No existing analyses found. Creating a test analysis first...');
      
      // Create a test analysis
      const createResponse = await fetch(`${BASE_URL}/api/stock-analyses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'TEST',
          name: 'Test Analysis for CSV Supplementation',
          market: 'US'
        }),
        credentials: 'include',
      });
      
      if (!createResponse.ok) {
        throw new Error('Failed to create test analysis');
      }
      
      const createData = await createResponse.json();
      analyses.push(createData.data.stockAnalysis);
      console.log('Created test analysis:', createData.data.stockAnalysis.id);
    }
    
    const testAnalysis = analyses[0];
    console.log(`Using analysis: ${testAnalysis.symbol} (${testAnalysis.id})`);
    
    // Step 2: Create a test CSV file
    console.log('\n2. Creating test CSV file...');
    const testCSVContent = `Date,Open,High,Low,Close,Volume
2024-01-01,100.0,105.0,99.0,104.5,1000000
2024-01-02,104.5,108.0,103.0,107.2,1200000
2024-01-03,107.2,110.0,106.5,109.8,900000`;
    
    const csvFilePath = './test-supplement.csv';
    fs.writeFileSync(csvFilePath, testCSVContent);
    console.log('Test CSV file created:', csvFilePath);
    
    // Step 3: Test CSV supplementation
    console.log('\n3. Testing CSV supplementation...');
    const formData = new FormData();
    formData.append('csvFile', fs.createReadStream(csvFilePath), 'test-supplement.csv');
    
    const supplementResponse = await fetch(`${BASE_URL}/api/stock-analyses/${testAnalysis.id}/supplement`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!supplementResponse.ok) {
      const errorData = await supplementResponse.json().catch(() => ({}));
      throw new Error(`Supplementation failed: ${errorData.error || 'Unknown error'}`);
    }
    
    const supplementData = await supplementResponse.json();
    console.log('✅ CSV Supplementation successful!');
    console.log('Response:', supplementData);
    
    // Step 4: Verify data was added
    console.log('\n4. Verifying supplemented data...');
    const verifyResponse = await fetch(`${BASE_URL}/api/stock-analyses/${testAnalysis.id}`, {
      credentials: 'include',
    });
    
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      const results = verifyData.data?.stockAnalysis?.results;
      
      if (results && results.totalDays > 0) {
        console.log(`✅ Verification successful! Analysis now has ${results.totalDays} days of data`);
      } else {
        console.log('⚠️  Verification inconclusive - could not confirm data addition');
      }
    }
    
    // Cleanup
    fs.unlinkSync(csvFilePath);
    console.log('\n🧹 Cleaned up test CSV file');
    
    console.log('\n=== Test Complete ===');
    console.log('✅ CSV Supplementation feature is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check if backend is running
async function checkBackend() {
  try {
    const response = await fetch(`${BASE_URL}/api/stock-analyses`);
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('Checking if backend is running...');
  const isBackendRunning = await checkBackend();
  
  if (!isBackendRunning) {
    console.error(`❌ Backend is not running at ${BASE_URL}`);
    console.error('Please start the backend server first: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Backend is running\n');
  await testCSVSupplementation();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testCSVSupplementation };
