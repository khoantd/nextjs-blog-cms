#!/usr/bin/env node

/**
 * Full SNAP factor generation using comprehensive historical data
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

function calculateRSI(prices, period = 14) {
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

async function generateFullSnapFactors() {
  return new Promise((resolve, reject) => {
    console.log('📊 Generating full SNAP factors with historical data...');
    
    // Read the comprehensive CSV data
    const csvContent = readFileSync('./MacroTrends_Data_Download_SNAP.csv', 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    // Parse CSV
    const headers = lines[0].split(',').map(h => h.trim());
    const stockData = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        if (header === 'close' || header === 'open' || header === 'high' || header === 'low') {
          row[header.charAt(0).toUpperCase() + header.slice(1)] = parseFloat(value);
        } else if (header === 'volume') {
          row[header.charAt(0).toUpperCase() + header.slice(1)] = parseInt(value, 10);
        } else {
          row[header] = value;
        }
      });
      
      stockData.push(row);
    }
    
    console.log(`📈 Loaded ${stockData.length} days of historical SNAP data (${(stockData.length/252).toFixed(1)} years)`);
    
    // Calculate technical indicators with proper periods
    const closePrices = stockData.map(d => d.Close);
    const volumes = stockData.map(d => d.Volume || 0);
    
    const ma20 = calculateMovingAverage(closePrices, 20);
    const ma50 = calculateMovingAverage(closePrices, 50);
    const ma200 = calculateMovingAverage(closePrices, 200);
    const rsi = calculateRSI(closePrices, 14);
    const volumeMA20 = calculateMovingAverage(volumes, 20);
    
    console.log('📊 Calculated technical indicators (MA20, MA50, MA200, RSI, Volume MA20)');
    
    // Clear existing data
    console.log('🧹 Clearing existing factor data...');
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
    let volumeSpikeCount = 0;
    let breakMA50Count = 0;
    let breakMA200Count = 0;
    let rsiOver60Count = 0;
    
    // Process all data but only keep recent entries for database
    const recentData = stockData.slice(-500); // Keep last 500 days for database
    
    console.log(`📅 Processing last ${recentData.length} days for database storage...`);
    
    for (let i = 0; i < recentData.length; i++) {
      const day = recentData[i];
      const date = day.date;
      
      // Find the corresponding index in the full dataset
      const fullIndex = stockData.findIndex(d => d.date === date);
      
      // Calculate factors with proper technical indicators
      const volumeSpike = day.Volume && volumeMA20[fullIndex] && !isNaN(volumeMA20[fullIndex]) && volumeMA20[fullIndex] > 0 
        ? day.Volume > volumeMA20[fullIndex] * 1.5 
        : false;
      
      const breakMA50 = ma50[fullIndex] && !isNaN(ma50[fullIndex]) && fullIndex > 0 && ma50[fullIndex - 1] && !isNaN(ma50[fullIndex - 1])
        ? stockData[fullIndex - 1].Close <= ma50[fullIndex - 1] && day.Close > ma50[fullIndex]
        : false;
      
      const breakMA200 = ma200[fullIndex] && !isNaN(ma200[fullIndex]) && fullIndex > 0 && ma200[fullIndex - 1] && !isNaN(ma200[fullIndex - 1])
        ? stockData[fullIndex - 1].Close <= ma200[fullIndex - 1] && day.Close > ma200[fullIndex]
        : false;
      
      const rsiOver60 = rsi[fullIndex] && !isNaN(rsi[fullIndex]) ? rsi[fullIndex] > 60 : false;
      
      // Count active factors
      const activeFactors = [volumeSpike, breakMA50, breakMA200, rsiOver60].filter(f => f).length;
      if (activeFactors > 0) {
        activeFactorsCount++;
        if (volumeSpike) volumeSpikeCount++;
        if (breakMA50) breakMA50Count++;
        if (breakMA200) breakMA200Count++;
        if (rsiOver60) rsiOver60Count++;
      }
      
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
        ma20[fullIndex] || null,
        ma50[fullIndex] || null,
        ma200[fullIndex] || null,
        rsi[fullIndex] || null,
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
      
      // Log sample data
      if (i < 5 || activeFactors > 0) {
        console.log(`${date}: Close=${day.Close}, Volume=${day.Volume.toLocaleString()}, MA50=${ma50[fullIndex]?.toFixed(2)}, MA200=${ma200[fullIndex]?.toFixed(2)}, RSI=${rsi[fullIndex]?.toFixed(2)}`);
        console.log(`  Factors: VolumeSpike=${volumeSpike}, BreakMA50=${breakMA50}, BreakMA200=${breakMA200}, RSI>60=${rsiOver60}`);
      }
    }
    
    insertStmt.finalize((err) => {
      if (err) {
        console.error('❌ Error inserting data:', err);
        reject(err);
        return;
      }
      
      console.log(`✅ Inserted ${insertedCount} days of factor data`);
      console.log(`📈 Days with active factors: ${activeFactorsCount} (${((activeFactorsCount/insertedCount)*100).toFixed(1)}%)`);
      console.log(`  Volume Spikes: ${volumeSpikeCount}`);
      console.log(`  MA50 Breakouts: ${breakMA50Count}`);
      console.log(`  MA200 Breakouts: ${breakMA200Count}`);
      console.log(`  RSI>60 signals: ${rsiOver60Count}`);
      
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
          // Calculate score with standard weights
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
            ORDER BY date DESC
            LIMIT 10
          `, (err, sampleScores) => {
            if (err) {
              console.error('❌ Error querying sample scores:', err);
              reject(err);
              return;
            }
            
            console.log('\n📊 Recent daily scores:');
            sampleScores.forEach(score => {
              console.log(`${score.date}: Score=${score.score.toFixed(3)}, Factors=${score.factor_count}, AboveThreshold=${score.above_threshold === 1}`);
            });
            
            // Show high-score days
            db.all(`
              SELECT date, score, factor_count 
              FROM daily_scores 
              WHERE stock_analysis_id = 3 AND above_threshold = 1
              ORDER BY score DESC
              LIMIT 10
            `, (err, highScores) => {
              if (err) {
                console.error('❌ Error querying high scores:', err);
                reject(err);
                return;
              }
              
              if (highScores.length > 0) {
                console.log('\n🏆 Top high-score days:');
                highScores.forEach(score => {
                  console.log(`${score.date}: Score=${score.score.toFixed(3)}, Factors=${score.factor_count}`);
                });
              }
              
              db.close((err) => {
                if (err) {
                  console.error('❌ Error closing database:', err);
                  reject(err);
                  return;
                }
                
                console.log('\n🎉 Full SNAP factor generation completed successfully!');
                console.log('📈 Using comprehensive historical data with proper technical indicators');
                resolve();
              });
            });
          });
        });
      });
    });
  });
}

// Run the generation
generateFullSnapFactors().catch(console.error);
