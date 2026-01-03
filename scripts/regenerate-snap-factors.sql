-- SNAP Factor Data Regeneration Script
-- This script manually calculates and inserts factor data for SNAP analysis ID 3

-- First, let's check what data we have
SELECT 
    COUNT(*) as total_days,
    COUNT(ma20) as days_with_ma20,
    COUNT(ma50) as days_with_ma50,
    COUNT(ma200) as days_with_ma200,
    COUNT(rsi) as days_with_rsi,
    COUNT(volume) as days_with_volume
FROM daily_factor_data 
WHERE stock_analysis_id = 3;

-- Calculate basic statistics for volume spike detection
WITH volume_stats AS (
    SELECT 
        AVG(volume) as avg_volume,
        STDDEV(volume) as stddev_volume
    FROM daily_factor_data 
    WHERE stock_analysis_id = 3 
    AND volume IS NOT NULL
)
SELECT 
    avg_volume,
    stddev_volume,
    avg_volume * 1.5 as volume_spike_threshold
FROM volume_stats;

-- Sample of current data to understand structure
SELECT date, close, volume, ma20, ma50, ma200, rsi 
FROM daily_factor_data 
WHERE stock_analysis_id = 3 
ORDER BY date 
LIMIT 10;
