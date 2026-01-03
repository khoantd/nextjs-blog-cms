# Stock Factor Analysis

This module provides comprehensive factor analysis for stock market data, converting Python-based analysis to TypeScript and integrating with the existing stock analysis feature.

## Overview

The stock factor analysis system evaluates 10 key factors that influence stock price movements:

### Technical Factors
- **Volume Spike**: Trading volume exceeds 1.5x the 20-day moving average
- **MA50 Breakout**: Price breaks above the 50-day moving average
- **MA200 Breakout**: Price breaks above the 200-day moving average
- **Strong RSI**: Relative Strength Index (RSI) exceeds 60

### Market Factors
- **Market Rally**: Nasdaq index surged significantly (>1.5%)
- **Sector Strength**: Social media/advertising sector showed strong performance (>1.0%)
- **Short Covering**: High short interest combined with price increase (potential squeeze)

### Fundamental Factors
- **Earnings Window**: Within ±3 days of earnings announcement
- **Macro Tailwind**: Favorable CPI/Fed/interest rate environment

### Sentiment Factors
- **Positive News**: Positive news sentiment and announcements

## Files Structure

```
lib/
├── stock-factors.ts                    # Core factor analysis logic
├── types/stock-analysis.ts             # TypeScript interfaces (updated)
├── services/stock-factor-service.ts    # Integration service
└── examples/stock-factor-analysis-example.ts  # Usage examples
```

## Usage

### Basic Factor Analysis

```typescript
import {
  analyzeFactors,
  getFactorSummary,
  type ExtendedStockData
} from './lib/stock-factors';

// Your stock data
const stockData: ExtendedStockData[] = [
  { Date: '2024-01-01', Close: 100, Volume: 1000000 },
  { Date: '2024-01-02', Close: 105, Volume: 1500000, pct_change: 5.0 },
  // ... more data
];

// Analyze factors
const factorAnalyses = analyzeFactors(stockData, {
  nasdaqData: [
    { date: '2024-01-02', pct_change: 2.0 }
  ],
  earningsDates: ['2024-01-05'],
  newsData: [
    { date: '2024-01-02', sentiment: 'positive' }
  ]
});

// Get summary
const summary = getFactorSummary(factorAnalyses);
console.log('Average factors per day:', summary.averageFactorsPerDay);
```

### Calculate Technical Indicators

```typescript
import { calculateMA, calculateRSI } from './lib/stock-factors';

const prices = [100, 102, 101, 105, 108, 107, 110];

// Calculate moving averages
const ma5 = calculateMA(prices, 5);
const ma20 = calculateMA(prices, 20);

// Calculate RSI
const rsi = calculateRSI(prices, 14);
```

### Correlate Factors with Price Movement

```typescript
import { correlateFactorsWithPriceMovement } from './lib/stock-factors';

const correlation = correlateFactorsWithPriceMovement(factorAnalyses, stockData);

// Find most impactful factors
const topFactors = Object.entries(correlation)
  .sort((a, b) => b[1].avgReturn - a[1].avgReturn)
  .slice(0, 5);

console.log('Top factors:', topFactors);
```

### Full Integration with Stock Analysis

```typescript
import {
  parseStockCSV,
  calculatePctChanges,
  performFactorAnalysis,
  enrichTransactionsWithFactors
} from './lib/services/stock-factor-service';

// Parse CSV
const stockData = parseStockCSV(csvContent);

// Calculate percentage changes
const dataWithChanges = calculatePctChanges(stockData);

// Perform full factor analysis
const {
  enrichedData,
  factorAnalyses,
  summary,
  correlation
} = performFactorAnalysis(dataWithChanges, {
  nasdaqData: [],
  earningsDates: ['2024-02-15'],
  newsData: []
});

// Enrich transactions with factors
const transactions = [
  { tx: 1, date: '2024-01-02', close: 105, pctChange: 5.0 }
];

const enrichedTransactions = enrichTransactionsWithFactors(
  transactions,
  factorAnalyses,
  enrichedData
);
```

## API Integration

### Example: Stock Analysis API with Factors

```typescript
// app/api/stock-analyses/route.ts
import { performFactorAnalysis } from '@/lib/services/stock-factor-service';

export async function POST(request: Request) {
  const { csvContent, symbol } = await request.json();

  const stockData = parseStockCSV(csvContent);
  const dataWithChanges = calculatePctChanges(stockData);

  const {
    enrichedData,
    factorAnalyses,
    summary,
    correlation
  } = performFactorAnalysis(dataWithChanges);

  // Store in database with factor analysis
  const analysis = await prisma.stockAnalysis.create({
    data: {
      symbol,
      analysisResults: JSON.stringify({
        transactions: enrichedTransactions,
        factorAnalysis: {
          analyses: factorAnalyses,
          summary,
          correlation
        }
      })
    }
  });

  return Response.json(analysis);
}
```

## Factor Descriptions

Access factor metadata:

```typescript
import { FACTOR_DESCRIPTIONS } from './lib/stock-factors';

const factorInfo = FACTOR_DESCRIPTIONS['market_up'];
console.log(factorInfo.name);        // "Market Rally"
console.log(factorInfo.description); // "Nasdaq index surged significantly..."
console.log(factorInfo.category);    // "market"
```

## Data Requirements

### Minimum Required Data
- Date
- Close price

### Optional Data for Enhanced Analysis
- Open, High, Low prices
- Volume
- Nasdaq index data (for market_up factor)
- Sector index data (for sector_up factor)
- Earnings announcement dates
- News sentiment data
- Short interest data
- Macro economic event data

## Examples

See comprehensive examples in:
- [stock-factor-analysis-example.ts](../lib/examples/stock-factor-analysis-example.ts)

Run examples:
```bash
npx tsx lib/examples/stock-factor-analysis-example.ts
```

## Integration Points

### 1. Update Existing Analysis
Modify `lib/data-analysis.ts` to include factor analysis:

```typescript
import { performFactorAnalysis } from './services/stock-factor-service';

export function analyzeStockData(csvFilePath: string) {
  // Existing analysis...

  // Add factor analysis
  const factorResults = performFactorAnalysis(dataWithPctChange);

  return {
    transactions: tx,
    factorAnalysis: factorResults
  };
}
```

### 2. Update API Routes
Enhance API responses to include factor data in transaction results.

### 3. Update UI Components
Display factor badges and insights in stock analysis views.

## Performance Considerations

- Moving average calculations are O(n*m) where n is data points and m is period
- RSI calculation is O(n*m)
- Factor analysis is O(n) per factor
- Consider caching technical indicators for large datasets

## Future Enhancements

- [ ] Add more technical indicators (MACD, Bollinger Bands, etc.)
- [ ] Implement real-time factor monitoring
- [ ] Add machine learning for factor weight optimization
- [ ] Support custom factor definitions
- [ ] Add backtesting framework
- [ ] Implement factor combination analysis

## TypeScript Types

```typescript
type StockFactor =
  | "market_up"
  | "sector_up"
  | "earnings_window"
  | "volume_spike"
  | "break_ma50"
  | "break_ma200"
  | "rsi_over_60"
  | "news_positive"
  | "short_covering"
  | "macro_tailwind";

interface FactorAnalysis {
  date: string;
  factors: Partial<Record<StockFactor, boolean>>;
  factorCount: number;
  factorList: StockFactor[];
}
```

## Contributing

When adding new factors:

1. Add the factor type to `StockFactor` union
2. Add to `STOCK_FACTORS` array
3. Add description to `FACTOR_DESCRIPTIONS`
4. Implement detection logic in `analyzeFactors()`
5. Update documentation
6. Add tests

## License

Same as parent project.
