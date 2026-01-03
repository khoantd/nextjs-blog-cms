#!/usr/bin/env tsx

/**
 * Test script for Daily Scoring System
 * Run this script to see the daily scoring system in action
 */

import { runDailyScoringExamples } from '../lib/examples/daily-scoring-example';

console.log('🎯 Testing Daily Stock Scoring System');
console.log('=====================================\n');

try {
  runDailyScoringExamples();
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}

console.log('\n✨ Daily scoring system test completed!');
