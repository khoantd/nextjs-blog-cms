#!/usr/bin/env tsx

/**
 * Test script to run both stock analysis implementations
 */

import { analyzeStockData as analyzeNative } from '../lib/data-analysis';
import { analyzeStockData as analyzeDanfo } from '../lib/data-analysis-danfo';
import * as path from 'path';

const CSV_FILE = path.join(__dirname, '../SNAP_daily.csv');

async function main() {
  console.log('='.repeat(70));
  console.log('NATIVE TYPESCRIPT IMPLEMENTATION');
  console.log('='.repeat(70));

  try {
    const result1 = analyzeNative(CSV_FILE);
    console.log(`\nFound ${result1.length} transactions with >= 4% gain\n`);
  } catch (error) {
    console.error('Error in native implementation:', error);
  }

  console.log('\n' + '='.repeat(70));
  console.log('DANFO.JS (PANDAS-LIKE) IMPLEMENTATION');
  console.log('='.repeat(70));

  try {
    const result2 = await analyzeDanfo(CSV_FILE);
    console.log(`\nFound ${result2.shape[0]} transactions with >= 4% gain\n`);
  } catch (error) {
    console.error('Error in danfo implementation:', error);
  }
}

main().catch(console.error);
