#!/usr/bin/env node

/**
 * Trigger SNAP factor generation via API call
 */

const http = require('http');
const https = require('https');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function triggerSnapFactorGeneration() {
  try {
    console.log('🔄 Triggering SNAP factor generation...');
    
    const analysisId = 3; // SNAP analysis ID
    const baseUrl = 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/stock-analyses/${analysisId}/factor-table`;
    
    console.log(`📡 Calling API: ${apiUrl}`);
    
    const response = await makeRequest(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`📊 Response status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Successfully triggered factor generation!');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } else {
      console.log('❌ Factor generation failed');
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error triggering factor generation:', error.message);
    console.log('\n💡 Make sure the development server is running on http://localhost:3000');
    console.log('   Run: npm run dev');
  }
}

// Run the trigger
triggerSnapFactorGeneration();
