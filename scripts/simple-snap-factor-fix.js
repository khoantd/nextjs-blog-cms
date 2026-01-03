#!/usr/bin/env node

/**
 * Simple SNAP factor fix using direct database operations
 */

const sqlite3 = require('sqlite3').verbose();
const { readFileSync } = require('fs');
const path = require('path');

const db = new sqlite3.Database('./prisma/dev.db');

function calculateMovingAverage(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

function calculateRSI(prices, period = 14) {
  const result = [];
  const changes = [];

  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      result.push(null);
      continue;
    }

    const recentChanges = changes.slice(i - period, i);
    const gains = recentChanges.filter(c => c > 0);
    const losses = recentChanges.filter(c => c < 0).map(c => Math.abs(c));

    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;

    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      result.push(rsi);
    }
  }

  return result;
}

async function fixSnapFactors() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Fixing SNAP factors with direct database operations...');
    
    // Read CSV data
    const csvPath = './SNAP_daily.csv';
    const csvContent = readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    // Parse CSV
    const headers = lines[0].split(',').map(h => h.trim());
    const stockData = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        if (header === 'Close' || header === 'Open' || header === 'High' || header === 'Low') {
          row[header] = parseFloat(value);
        } else if (header === 'Volume') {
          row[header] = parseInt(value, 10);
        } else {
          row[header] = value;
        }
      });
      
      stockData.push(row);
    }
    
    console.log(`📊 Loaded ${stockData.length} days of stock data`);
    
    // Calculate technical indicators
    const closePrices = stockData.map(d => d.Close);
    const volumes = stockData.map(d => d.Volume || 0);
    
    const ma20 = calculateMovingAverage(closePrices, 20);
    const ma50 = calculateMovingAverage(closePrices, 50);
    const ma200 = calculateMovingAverage(closePrices, 200);
    const rsi = calculateRSI(closePrices, 14);
    const volumeMA20 = calculateMovingAverage(volumes, 20);
    
    console.log('📈 Calculated technical indicators');
    
    // Insert factor data
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO daily_factor_data (
        stock_analysis_id, date, close, open, high, low, volume, pct_change,
        ma20, ma50, ma200, rsi,
        volume_spike, break_ma50, break_ma200, rsi_over_60,
        market_up, sector_up, earnings_window, news_positive, short_covering, macro_tailwind,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    let insertedCount = 0;
    let activeFactorsCount = 0;
    
    for (let i = 0; i < stockData.length; i++) {
      const day = stockData[i];
      const date = day.Date;
      
      // Calculate factors
      const volumeSpike = day.Volume && volumeMA20[i] && !isNaN(volumeMA20[i]) && volumeMA20[i] > 0 
        ? day.Volume > volumeMA20[i] * 1.5 
        : false;
      
      const breakMA50 = ma50[i] && !isNaN(ma50[i]) && i > 0 && ma50[i - 1] && !isNaN(ma50[i - 1])
        ? stockData[i - 1].Close <= ma50[i - 1] && day.Close > ma50[i]
        : false;
      
      const breakMA200 = ma200[i] && !isNaN(ma200[i]) && i > 0 && ma200[i - 1] && !isNaN(ma200[i - 1])
        ? stockData[i - 1].Close <= ma200[i - 1] && day.Close > ma200[i]
        : false;
      
      const rsiOver60 = rsi[i] && !isNaN(rsi[i]) ? rsi[i] > 60 : false;
      
      // Count active factors
      const activeFactors = [volumeSpike, breakMA50, breakMA200, rsiOver60].filter(f => f).length;
      if (activeFactors > 0) activeFactorsCount++;
      
      // Insert data
      insertStmt.run([
        3, // stock_analysis_id for SNAP
        date,
        day.Close,
        day.Open,
        day.High,
        day.Low,
        day.Volume,
        null, // pct_change (calculated elsewhere)
        ma20[i] || null,
        ma50[i] || null,
        ma200[i] || null,
        rsi[i] || null,
        volumeSpike ? 1 : 0,
        breakMA50 ? 1 : 0,
        breakMA200 ? 1 : 0,
        rsiOver60 ? 1 : 0,
        0, // market_up (no data)
        0, // sector_up (no data)
        0, // earnings_window (no data)
        0, // news_positive (no data)
        0, // short_covering (no data)
        0  // macro_tailwind (no data)
      ]);
      
      insertedCount++;
    }
    
    insertStmt.finalize((err) => {
      if (err) {
        console.error('❌ Error inserting data:', err);
        reject(err);
        return;
      }
      
      console.log(`✅ Inserted ${insertedCount} days of factor data`);
      console.log(`📈 Days with active factors: ${activeFactorsCount}`);
      
      // Generate daily scores
      console.log('🔄 Generating daily scores...');
      
      const scoreInsertStmt = db.prepare(`
        INSERT OR REPLACE INTO daily_scores (
          stock_analysis_id, date, score, factor_count, above_threshold, breakdown,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      let scoreCount = 0;
      let highScoreCount = 0;
      
      // Query the factor data we just inserted
      db.all(`
        SELECT date, volume_spike, break_ma50, break_ma200, rsi_over_60
        FROM daily_factor_data 
        WHERE stock_analysis_id = 3 
        ORDER BY date
      `, (err, rows) => {
        if (err) {
          console.error('❌ Error querying factor data:', err);
          reject(err);
          return;
        }
        
        rows.forEach(row => {
          // Calculate score with weights
          const weights = {
            volume_spike: 0.25,
            break_ma50: 0.15,
            break_ma200: 0.05,
            rsi_over_60: 0.10
          };
          
          let score = 0;
          let factorCount = 0;
          const breakdown = {};
          
          // Volume spike
          const volumeSpike = row.volume_spike === 1;
          breakdown.volume_spike = {
            weight: weights.volume_spike,
            active: volumeSpike,
            contribution: volumeSpike ? weights.volume_spike : 0
          };
          if (volumeSpike) {
            score += weights.volume_spike;
            factorCount++;
          }
          
          // Break MA50
          const breakMA50 = row.break_ma50 === 1;
          breakdown.break_ma50 = {
            weight: weights.break_ma50,
            active: breakMA50,
            contribution: breakMA50 ? weights.break_ma50 : 0
          };
          if (breakMA50) {
            score += weights.break_ma50;
            factorCount++;
          }
          
          // Break MA200
          const breakMA200 = row.break_ma200 === 1;
          breakdown.break_ma200 = {
            weight: weights.break_ma200,
            active: breakMA200,
            contribution: breakMA200 ? weights.break_ma200 : 0
          };
          if (breakMA200) {
            score += weights.break_ma200;
            factorCount++;
          }
          
          // RSI over 60
          const rsiOver60 = row.rsi_over_60 === 1;
          breakdown.rsi_over_60 = {
            weight: weights.rsi_over_60,
            active: rsiOver60,
            contribution: rsiOver60 ? weights.rsi_over_60 : 0
          };
          if (rsiOver60) {
            score += weights.rsi_over_60;
            factorCount++;
          }
          
          const aboveThreshold = score >= 0.45 && factorCount >= 2;
          if (aboveThreshold) highScoreCount++;
          
          scoreInsertStmt.run([
            3, // stock_analysis_id
            row.date,
            score,
            factorCount,
            aboveThreshold ? 1 : 0,
            JSON.stringify(breakdown)
          ]);
          
          scoreCount++;
        });
        
        scoreInsertStmt.finalize((err) => {
          if (err) {
            console.error('❌ Error inserting scores:', err);
            reject(err);
            return;
          }
          
          console.log(`✅ Generated ${scoreCount} daily scores`);
          console.log(`🎯 High-score days: ${highScoreCount} (${((highScoreCount/scoreCount)*100).toFixed(1)}%)`);
          
          // Sample results
          db.all(`
            SELECT date, score, factor_count, above_threshold 
            FROM daily_scores 
            WHERE stock_analysis_id = 3 
            ORDER BY date 
            LIMIT 5
          `, (err, sampleScores) => {
            if (err) {
              console.error('❌ Error querying sample scores:', err);
              reject(err);
              return;
            }
            
            console.log('\n📊 Sample daily scores:');
            sampleScores.forEach(score => {
              console.log(`${score.date}: Score=${score.score.toFixed(3)}, Factors=${score.factor_count}, AboveThreshold=${score.above_threshold === 1}`);
            });
            
            db.close((err) => {
              if (err) {
                console.error('❌ Error closing database:', err);
                reject(err);
                return;
              }
              
              console.log('\n🎉 SNAP factor fix completed successfully!');
              resolve();
            });
          });
        });
      });
    });
  });
}

// Run the fix
fixSnapFactors().catch(console.error);
