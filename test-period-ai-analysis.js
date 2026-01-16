#!/usr/bin/env node

/**
 * Test script to verify period-based AI analysis functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const CMS_URL = 'http://localhost:3002';

async function testPeriodBasedAIAnalysis() {
  console.log('🧪 Testing Period-Based AI Analysis...\n');

  try {
    // Step 1: Get available stock analyses
    console.log('📋 Step 1: Fetching available stock analyses...');
    const analysesResponse = await axios.get(`${BASE_URL}/api/stock-analyses`);
    
    if (!analysesResponse.data.data || analysesResponse.data.data.length === 0) {
      console.log('❌ No stock analyses found. Please create one first.');
      return;
    }

    const analysis = analysesResponse.data.data[0];
    console.log(`✅ Found analysis: ${analysis.symbol} (ID: ${analysis.id})\n`);

    // Step 2: Test AI analysis without period (full dataset)
    console.log('🔍 Step 2: Testing AI analysis with full dataset...');
    const fullAnalysisResponse = await axios.post(`${BASE_URL}/api/stock-analyses/${analysis.id}/analyze`, {});
    
    console.log('✅ Full dataset AI analysis initiated');
    console.log(`📄 Response: ${fullAnalysisResponse.data.message}\n`);

    // Step 3: Test AI analysis with period parameters
    console.log('📅 Step 3: Testing AI analysis with period parameters...');
    
    // Test with last 90 days (example period)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    
    const periodRequestBody = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      periodId: '90d'
    };

    console.log(`📊 Period: ${periodRequestBody.startDate} to ${periodRequestBody.endDate}`);
    
    const periodAnalysisResponse = await axios.post(
      `${BASE_URL}/api/stock-analyses/${analysis.id}/analyze`, 
      periodRequestBody
    );
    
    console.log('✅ Period-based AI analysis initiated');
    console.log(`📄 Response: ${periodAnalysisResponse.data.message}\n`);

    // Step 4: Wait and check results
    console.log('⏳ Step 4: Waiting for analysis to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const updatedAnalysisResponse = await axios.get(`${BASE_URL}/api/stock-analyses/${analysis.id}`);
    const updatedAnalysis = updatedAnalysisResponse.data.data.stockAnalysis;
    
    console.log('📈 Analysis Results:');
    console.log(`- Status: ${updatedAnalysis.status}`);
    console.log(`- Total Days: ${updatedAnalysis.results?.totalDays || 'N/A'}`);
    console.log(`- AI Insights: ${updatedAnalysis.aiInsights ? 'Generated' : 'Not available'}`);
    
    if (updatedAnalysis.results?.periodInfo) {
      console.log(`- Period Info: ${JSON.stringify(updatedAnalysis.results.periodInfo)}`);
    }

    console.log('\n🎉 Period-based AI analysis test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('💡 Note: You may need to authenticate first');
    }
  }
}

// Run the test
testPeriodBasedAIAnalysis();
