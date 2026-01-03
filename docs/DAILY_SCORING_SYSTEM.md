# Daily Stock Scoring System

## Overview

The Daily Stock Scoring System is a TypeScript implementation of the Python scoring algorithm that predicts strong stock price movements using weighted factor analysis. This system analyzes multiple market factors and calculates a daily score to determine the probability of significant price increases.

## Features

### Core Components

1. **Factor Analysis** (`/lib/stock-factors.ts`)
   - 10 key market factors (technical, fundamental, market, sentiment)
   - Configurable weights and thresholds
   - Daily score calculation with detailed breakdown

2. **Scoring Service** (`/lib/services/stock-factor-service.ts`)
   - Complete factor analysis pipeline
   - Daily scoring integration
   - Prediction generation for current conditions

3. **UI Components**
   - `DailyScoreCard` - Individual day score display
   - `DailyPredictionCard` - Current market prediction
   - `DailyScoringTab` - Complete scoring analysis interface

4. **API Endpoints**
   - `/api/stock-analyses/daily-scoring` - POST for analysis, GET for predictions
   - `/api/stock-analyses/[id]/csv-content` - Fetch CSV data for analysis

## Scoring Algorithm

### Factor Weights (Default Configuration)

```typescript
{
  volume_spike: 0.25,      // 25% - Volume > 1.5x MA20
  market_up: 0.20,         // 20% - Nasdaq surged > 1.5%
  earnings_window: 0.15,   // 15% - Within ±3 days of earnings
  break_ma50: 0.15,        // 15% - Price breaks above MA50
  rsi_over_60: 0.10,       // 10% - RSI > 60
  sector_up: 0.08,         // 8%  - Sector strength
  break_ma200: 0.05,       // 5%  - Price breaks above MA200
  news_positive: 0.02,     // 2%  - Positive news sentiment
  short_covering: 0.03,    // 3%  - Short squeeze potential
  macro_tailwind: 0.02     // 2%  - Favorable macro conditions
}
```

### Threshold System

- **Default Threshold**: 45% (0.45)
- **Minimum Factors Required**: 2
- **Prediction Levels**:
  - **HIGH_PROBABILITY**: Score ≥ 45%
  - **MODERATE**: Score ≥ 32% (70% of threshold)
  - **LOW_PROBABILITY**: Score < 32%

## Usage Examples

### Basic Daily Scoring

```typescript
import { calculateDailyScores, DEFAULT_DAILY_SCORE_CONFIG } from '@/lib/stock-factors';

// Calculate scores for multiple days
const scores = calculateDailyScores(factorAnalyses);

// Check which days exceed threshold
const highScoreDays = scores.filter(score => score.aboveThreshold);
```

### Current Market Prediction

```typescript
import { predictStrongMovement } from '@/lib/stock-factors';

const currentFactors = {
  volume_spike: true,
  market_up: true,
  earnings_window: true,
  break_ma50: true,
  rsi_over_60: false
  // ... other factors
};

const prediction = predictStrongMovement(currentFactors);
console.log(`Prediction: ${prediction.prediction}`);
console.log(`Confidence: ${prediction.confidence}%`);
```

### Custom Configuration

```typescript
import { calculateDailyScores, type DailyScoreConfig } from '@/lib/stock-factors';

const customConfig: DailyScoreConfig = {
  weights: {
    volume_spike: 0.30,  // Increased emphasis
    market_up: 0.25,
    // ... adjusted weights
  },
  threshold: 0.50,       // Higher threshold
  minFactorsRequired: 3  // More factors required
};

const scores = calculateDailyScores(factorAnalyses, customConfig);
```

## API Integration

### Analyze Stock Data

```typescript
const response = await fetch('/api/stock-analyses/daily-scoring', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    csvContent: stockDataCSV,
    options: {
      scoreConfig: {
        weights: { /* custom weights */ },
        threshold: 0.45,
        minFactorsRequired: 2
      }
    }
  })
});

const result = await response.json();
```

### Get Current Prediction

```typescript
const factors = {
  volume_spike: true,
  market_up: false,
  // ... current factors
};

const response = await fetch(`/api/stock-analyses/daily-scoring?factors=${encodeURIComponent(JSON.stringify(factors))}&symbol=SNAP`);
const prediction = await response.json();
```

## UI Integration

The scoring system is integrated into the Stock Analysis Details page with a new "Daily Scoring" tab that provides:

1. **Overview Tab**
   - Performance metrics
   - Score distribution
   - Success rate statistics

2. **Daily Scores Tab**
   - Detailed score breakdown for each day
   - Factor contribution analysis
   - Threshold visualization

3. **Predictions Tab**
   - Current market predictions
   - Confidence levels
   - Trading recommendations

4. **Factor Analysis Tab**
   - Weight configuration
   - Factor frequency analysis
   - Performance correlation

## Factor Definitions

### Technical Factors
- **volume_spike**: Trading volume exceeds 1.5x 20-day moving average
- **break_ma50**: Price breaks above 50-day moving average
- **break_ma200**: Price breaks above 200-day moving average
- **rsi_over_60**: Relative Strength Index exceeds 60

### Market Factors
- **market_up**: Nasdaq index surged > 1.5% on the trading day
- **sector_up**: Social media/advertising sector performed well
- **short_covering**: High short interest + price increase

### Fundamental Factors
- **earnings_window**: Within ±3 days of earnings announcement
- **macro_tailwind**: Favorable CPI/Fed/interest rate environment

### Sentiment Factors
- **news_positive**: Positive news sentiment and announcements

## Testing

Run the test script to see the scoring system in action:

```bash
npm run test:scoring
# or
tsx scripts/test-daily-scoring.ts
```

This will execute various examples including:
- Basic daily scoring calculations
- Summary statistics generation
- Current market predictions
- Custom configuration scenarios
- Real-world simulation

## Configuration Options

### Weights Adjustment
Adjust factor weights based on:
- Historical performance
- Market conditions
- Trading strategy preferences
- Risk tolerance

### Threshold Optimization
- Higher threshold = fewer, more selective signals
- Lower threshold = more signals, potentially lower accuracy
- Backtesting recommended for optimal settings

### Factor Requirements
- Minimum factors ensure signal quality
- Prevent false positives from single factors
- Can be adjusted based on strategy

## Performance Considerations

- **Calculation Speed**: O(n) complexity for n days
- **Memory Usage**: Linear with number of days analyzed
- **API Response Time**: Typically < 500ms for 30-day analysis
- **Caching**: Results can be cached for same data/config

## Future Enhancements

1. **Machine Learning Integration**
   - Dynamic weight optimization
   - Pattern recognition
   - Adaptive thresholds

2. **Real-time Data**
   - Live factor updates
   - Intraday scoring
   - Market condition adjustments

3. **Backtesting Framework**
   - Historical performance analysis
   - Strategy optimization
   - Risk metrics calculation

4. **Multi-factor Models**
   - Factor interaction analysis
   - Conditional probabilities
   - Advanced scoring algorithms

## Troubleshooting

### Common Issues

1. **Low Score Values**
   - Check factor activation logic
   - Verify data quality
   - Review weight configuration

2. **No High-Score Days**
   - Lower threshold value
   - Reduce minimum factors required
   - Check factor calculation accuracy

3. **API Errors**
   - Verify CSV format
   - Check file permissions
   - Review request payload

### Debug Mode

Enable detailed logging by setting environment variable:
```bash
DEBUG=scoring npm run dev
```

This will provide detailed factor analysis and scoring calculations.
