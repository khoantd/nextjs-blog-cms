# Improved Factor Data Flow Architecture

## Problem Summary
Previously, factor data generation was split across multiple endpoints and required manual intervention:
1. Main stock analysis API only saved basic results as JSON
2. Technical indicators (MA20, MA50, MA200, RSI) were not calculated or saved
3. Separate API call to `/generate-daily-scoring` was required for factor analysis
4. This led to SNAP having factor records but all indicators were NULL

## Solution: Unified Data Flow

### New Architecture
```
CSV Upload → Main Stock Analysis API → Complete Factor Generation → Database Storage
```

### Key Improvements

#### 1. **Unified Factor Generation** (`/api/stock-analyses/route.ts`)
- Automatically saves CSV file to `uploads/stock-csvs/` directory
- Calls `saveFactorAnalysisToDatabase()` immediately after analysis
- Sets status to `processing` during factor generation, then `completed`
- Handles factor generation failures with `factor_failed` status

#### 2. **Complete Factor Service** (`saveFactorAnalysisToDatabase`)
- Parses CSV and performs comprehensive factor analysis
- Calculates all technical indicators (MA20, MA50, MA200, RSI)
- Saves three types of data:
  - `daily_factor_data`: Technical indicators + factor flags for every trading day
  - `daily_scores`: Scoring analysis with thresholds
  - `factor_tables`: Factor data for significant transactions only

#### 3. **Error Handling & Status Tracking**
- `processing`: Analysis complete, factors being generated
- `completed`: All data successfully saved
- `factor_failed`: Analysis succeeded but factor generation failed

### Data Flow Details

#### Input: CSV Content
```csv
Date,Open,High,Low,Close,Volume
2024-01-02,12.50,12.80,12.40,12.75,15000000
...
```

#### Processing Pipeline
1. **Parse CSV** → Standardize data format
2. **Calculate Technical Indicators**:
   - Moving averages (MA20, MA50, MA200)
   - RSI (Relative Strength Index)
   - Volume moving averages
3. **Analyze Factors** for each trading day:
   - Technical factors: volume_spike, break_ma50, break_ma200, rsi_over_60
   - Market factors: market_up, sector_up (null for now, AI-enhanced later)
   - Fundamental factors: earnings_window, macro_tailwind
   - Sentiment factors: news_positive, short_covering
4. **Calculate Daily Scores** using weighted factor system
5. **Save to Database** in three tables

#### Output: Complete Factor Data
- **Daily Factor Data**: Every trading day with indicators and factors
- **Daily Scores**: Scoring analysis for prediction
- **Factor Tables**: Transaction-focused factor analysis

### Benefits

#### 1. **Automatic Factor Generation**
- No manual API calls required
- Factors generated immediately upon analysis
- Consistent data for all stock analyses

#### 2. **Complete Technical Analysis**
- All technical indicators calculated and saved
- Proper factor flags (0/1) instead of NULL values
- Ready for AI-powered factor enhancement

#### 3. **Better Error Handling**
- Clear status tracking
- Graceful failure handling
- Detailed logging for debugging

#### 4. **Unified Data Source**
- Single source of truth for factor data
- Consistent across all features
- Easy to maintain and extend

### Testing the Improved Flow

#### Current State Test Results
```
📊 Analysis ID: 3 (SNAP)
📈 Status: completed
🔢 Factor records: 20 (but indicators are NULL)
💯 Score records: 20 (but scores are low)
📋 Table records: 255
```

#### To Test New Flow:
1. **Create a new stock analysis** with any CSV data
2. **Check the status** should go: `processing` → `completed`
3. **Verify factor data** should have actual technical indicators
4. **Check daily scores** should have meaningful values

#### Test Command:
```bash
# After implementing the new flow
DATABASE_URL="file:/path/to/prisma/dev.db" node test-factor-flow.js
```

### Migration Strategy

#### For Existing Analyses (like SNAP):
1. **Option A**: Re-trigger factor generation
   ```bash
   POST /api/stock-analyses/3/generate-daily-scoring
   ```

2. **Option B**: Re-upload CSV to trigger new unified flow
   - Use the same CSV content
   - Set `overwrite: true`
   - New analysis will have complete factor data

### Future Enhancements

#### 1. **AI-Powered Factors**
- `market_up`: Analyze market data automatically
- `sector_up`: Sector performance analysis
- `news_positive`: News sentiment analysis
- `earnings_window`: Automatic earnings date detection
- `macro_tailwind`: Economic indicator analysis

#### 2. **Real-time Updates**
- WebSocket connections for live factor updates
- Background jobs for periodic factor recalculation
- Cache invalidation for fresh data

#### 3. **Advanced Analytics**
- Factor correlation analysis
- Performance backtesting
- Predictive model training

### Implementation Status

✅ **Completed**:
- Unified main API with automatic factor generation
- Complete factor service implementation
- Error handling and status tracking
- Test script for validation

⚠️ **TypeScript Issues**:
- Prisma client type errors (non-blocking)
- Need to regenerate Prisma client: `npx prisma generate`

🔄 **Next Steps**:
- Test with new stock analysis
- Migrate existing SNAP analysis
- Add AI-powered factors
- Implement real-time updates

This improved architecture ensures that all stock analyses will have complete, consistent factor data without requiring manual intervention.
