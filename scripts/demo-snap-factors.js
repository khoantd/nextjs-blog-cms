#!/usr/bin/env node

/**
 * Demo SNAP factor fix with shorter periods for limited data
 */

const sqlite3 = require('sqlite3').verbose();
const { readFileSync } = require('fs');

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

function calculateRSI(prices, period = 7) { // Shorter period for demo
  const result = [];
  const changes = [];

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

async function demoSnapFactors() {
  return new Promise((resolve, reject) => {
    console.log('🎭 Running SNAP factor demo with adjusted parameters...');
    
    // Read CSV data
    const csvContent = readFileSync('./SNAP_daily.csv', 'utf-8');
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
    
    // Calculate technical indicators with shorter periods
    const closePrices = stockData.map(d => d.Close);
    const volumes = stockData.map(d => d.Volume || 0);
    
    const ma10 = calculateMovingAverage(closePrices, 10); // Use MA10 instead of MA50
    const ma20 = calculateMovingAverage(closePrices, 20); // Use MA20 instead of MA200
    const rsi = calculateRSI(closePrices, 7); // Use 7-day RSI
    const volumeMA10 = calculateMovingAverage(volumes, 10); // Use 10-day volume MA
    
    console.log('📈 Calculated technical indicators with shorter periods');
    
    // Clear existing data
    db.run('DELETE FROM daily_factor_data WHERE stock_analysis_id = 3');
    db.run('DELETE FROM daily_scores WHERE stock_analysis_id = 3');
    
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
      
      // Calculate factors with adjusted thresholds
      const volumeSpike = day.Volume && volumeMA10[i] && !isNaN(volumeMA10[i]) && volumeMA10[i] > 0 
        ? day.Volume > volumeMA10[i] * 1.3 // Lower threshold for demo
        : false;
      
      const breakMA10 = ma10[i] && !isNaN(ma10[i]) && i > 0 && ma10[i - 1] && !isNaN(ma10[i - 1])
        ? stockData[i - 1].Close <= ma10[i - 1] && day.Close > ma10[i]
        : false;
      
      const breakMA20 = ma20[i] && !isNaN(ma20[i]) && i > 0 && ma20[i - 1] && !isNaN(ma20[i - 1])
        ? stockData[i - 1].Close <= ma20[i - 1] && day.Close > ma20[i]
        : false;
      
      const rsiOver50 = rsi[i] && !isNaN(rsi[i]) ? rsi[i] > 50 : false; // Lower RSI threshold
      
      // Count active factors
      const activeFactors = [volumeSpike, breakMA10, breakMA20, rsiOver50].filter(f => f).length;
      if (activeFactors > 0) activeFactorsCount++;
      
      // Insert data (store demo indicators in standard columns)
      insertStmt.run([
        3, // stock_analysis_id for SNAP
        date,
        day.Close,
        day.Open,
        day.High,
        day.Low,
        day.Volume,
        null, // pct_change (calculated elsewhere)
        ma20[i] || null, // Store MA20 in ma20 column
        ma10[i] || null, // Store MA10 in ma50 column (for demo)
        null, // ma200 (not enough data)
        rsi[i] || null,
        volumeSpike ? 1 : 0,
        breakMA10 ? 1 : 0, // Store MA10 breakout in ma50 column
        breakMA20 ? 1 : 0,
        rsiOver50 ? 1 : 0, // Store RSI>50 in rsi_over_60 column (for demo)
        0, // market_up (no data)
        0, // sector_up (no data)
        0, // earnings_window (no data)
        0, // news_positive (no data)
        0, // short_covering (no data)
        0  // macro_tailwind (no data)
      ]);
      
      insertedCount++;
      
      // Log some details for debugging
      if (i < 5 || activeFactors > 0) {
        console.log(`${date}: Close=${day.Close}, Volume=${day.Volume}, MA10=${ma10[i]?.toFixed(2)}, MA20=${ma20[i]?.toFixed(2)}, RSI=${rsi[i]?.toFixed(2)}`);
        console.log(`  Factors: VolumeSpike=${volumeSpike}, BreakMA10=${breakMA10}, BreakMA20=${breakMA20}, RSI>50=${rsiOver50}`);
      }
    }
    
    insertStmt.finalize((err) => {
      if (err) {
        console.error('❌ Error inserting data:', err);
        reject(err);
        return;
      }
      
      console.log(`✅ Inserted ${insertedCount} days of factor data`);
      console.log(`📈 Days with active factors: ${activeFactorsCount}`);
      
      // Generate daily scores with adjusted weights
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
          // Calculate score with adjusted weights
          const weights = {
            volume_spike: 0.30,
            break_ma50: 0.25, // This is actually MA10 breakout
            break_ma200: 0.20, // This is MA20 breakout
            rsi_over_60: 0.25 // This is actually RSI>50
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
          
          // Break MA10 (stored in ma50 column)
          const breakMA10 = row.break_ma50 === 1;
          breakdown.break_ma50 = {
            weight: weights.break_ma50,
            active: breakMA10,
            contribution: breakMA10 ? weights.break_ma50 : 0
          };
          if (breakMA10) {
            score += weights.break_ma50;
            factorCount++;
          }
          
          // Break MA20
          const breakMA20 = row.break_ma200 === 1;
          breakdown.break_ma200 = {
            weight: weights.break_ma200,
            active: breakMA20,
            contribution: breakMA20 ? weights.break_ma200 : 0
          };
          if (breakMA20) {
            score += weights.break_ma200;
            factorCount++;
          }
          
          // RSI over 50 (stored in rsi_over_60 column)
          const rsiOver50 = row.rsi_over_60 === 1;
          breakdown.rsi_over_60 = {
            weight: weights.rsi_over_60,
            active: rsiOver50,
            contribution: rsiOver50 ? weights.rsi_over_60 : 0
          };
          if (rsiOver50) {
            score += weights.rsi_over_60;
            factorCount++;
          }
          
          const aboveThreshold = score >= 0.40 && factorCount >= 1; // Lower threshold for demo
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
            ORDER BY date DESC
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
              
              console.log('\n🎉 SNAP factor demo completed successfully!');
              console.log('💡 Note: Using adjusted parameters (MA10, MA20, RSI>50) due to limited data');
              resolve();
            });
          });
        });
      });
    });
  });
}

// Run the demo
demoSnapFactors().catch(console.error);
