# Stock Factors Quick Reference

## Available Factors

| Factor | Type | Description | Detection Criteria |
|--------|------|-------------|-------------------|
| `market_up` | Market | Nasdaq rally | Nasdaq gain > 1.5% |
| `sector_up` | Market | Sector strength | Sector gain > 1.0% |
| `earnings_window` | Fundamental | Earnings proximity | Within ±3 days of earnings |
| `volume_spike` | Technical | Volume surge | Volume > 1.5× MA20 |
| `break_ma50` | Technical | MA50 breakout | Price crosses above MA50 |
| `break_ma200` | Technical | MA200 breakout | Price crosses above MA200 |
| `rsi_over_60` | Technical | Strong momentum | RSI > 60 |
| `news_positive` | Sentiment | Positive news | Positive sentiment detected |
| `short_covering` | Market | Short squeeze | Short interest > 15% + price up > 2% |
| `macro_tailwind` | Fundamental | Favorable macro | Fed/CPI favorable event |

## Quick Start

### 1. Basic Usage

```typescript
import { analyzeFactors, getFactorSummary } from '@/lib/stock-factors';

const analyses = analyzeFactors(stockData, {
  nasdaqData: [{ date: '2024-01-02', pct_change: 2.0 }],
  earningsDates: ['2024-02-15']
});

const summary = getFactorSummary(analyses);
```

### 2. Calculate Technical Indicators

```typescript
import { calculateMA, calculateRSI } from '@/lib/stock-factors';

const ma50 = calculateMA(prices, 50);
const rsi = calculateRSI(prices, 14);
```

### 3. Full Analysis Pipeline

```typescript
import {
  parseStockCSV,
  performFactorAnalysis,
  enrichTransactionsWithFactors
} from '@/lib/services/stock-factor-service';

const stockData = parseStockCSV(csvContent);
const { factorAnalyses, summary, correlation } = performFactorAnalysis(stockData);
```

## Common Patterns

### Pattern 1: Find High-Factor Days

```typescript
const highFactorDays = factorAnalyses
  .filter(a => a.factorCount >= 3)
  .sort((a, b) => b.factorCount - a.factorCount);
```

### Pattern 2: Top Performing Factors

```typescript
const topFactors = Object.entries(correlation)
  .sort((a, b) => b[1].avgReturn - a[1].avgReturn)
  .slice(0, 5);
```

### Pattern 3: Factor Frequency

```typescript
const frequentFactors = Object.entries(summary.factorFrequency)
  .filter(([_, freq]) => freq > 20)
  .sort((a, b) => b[1] - a[1]);
```

### Pattern 4: Enrich Transactions

```typescript
const enriched = transactions.map(tx => {
  const analysis = factorAnalyses.find(a => a.date === tx.date);
  return {
    ...tx,
    factors: analysis?.factorList || [],
    factorCount: analysis?.factorCount || 0
  };
});
```

## Data Structure Examples

### Input: ExtendedStockData

```typescript
{
  Date: '2024-01-02',
  Close: 105.50,
  Open: 103.20,
  High: 106.00,
  Low: 103.00,
  Volume: 1500000,
  pct_change: 2.5,
  ma20: 102.30,
  ma50: 100.50,
  ma200: 98.00,
  rsi: 65.5
}
```

### Output: FactorAnalysis

```typescript
{
  date: '2024-01-02',
  factors: {
    market_up: true,
    volume_spike: true,
    rsi_over_60: true,
    news_positive: false,
    // ... other factors
  },
  factorCount: 3,
  factorList: ['market_up', 'volume_spike', 'rsi_over_60']
}
```

### Output: Summary

```typescript
{
  totalDays: 250,
  averageFactorsPerDay: 2.3,
  factorCounts: {
    market_up: 45,
    volume_spike: 67,
    // ... other counts
  },
  factorFrequency: {
    market_up: 18.0,  // 18% of days
    volume_spike: 26.8,
    // ... other frequencies
  }
}
```

### Output: Correlation

```typescript
{
  market_up: {
    correlation: 1,
    avgReturn: 3.2,
    occurrences: 45
  },
  volume_spike: {
    correlation: 1,
    avgReturn: 2.8,
    occurrences: 67
  }
  // ... other factors
}
```

## Integration Examples

### With Prisma

```typescript
await prisma.stockAnalysis.create({
  data: {
    symbol: 'SNAP',
    analysisResults: JSON.stringify({
      transactions,
      factorAnalysis: {
        analyses: factorAnalyses,
        summary,
        correlation
      }
    })
  }
});
```

### With API Route

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const analysis = await prisma.stockAnalysis.findUnique({
    where: { id: Number(id) }
  });

  const results = JSON.parse(analysis.analysisResults);
  return Response.json(results.factorAnalysis);
}
```

### With React Component

```tsx
function FactorBadges({ factors }: { factors: StockFactor[] }) {
  return (
    <div className="flex gap-2">
      {factors.map(factor => (
        <span key={factor} className="badge">
          {FACTOR_DESCRIPTIONS[factor].name}
        </span>
      ))}
    </div>
  );
}
```

## Calculation Formulas

### Moving Average (MA)
```
MA(n) = (P₁ + P₂ + ... + Pₙ) / n
```

### RSI (Relative Strength Index)
```
RS = Average Gain / Average Loss
RSI = 100 - (100 / (1 + RS))
```

### Percentage Change
```
% Change = ((Current - Previous) / Previous) × 100
```

## Performance Tips

1. **Cache Technical Indicators**: Calculate once, reuse
2. **Batch Factor Analysis**: Process all days together
3. **Filter Before Correlation**: Remove low-occurrence factors
4. **Lazy Load External Data**: Only fetch when needed

## Common Options

```typescript
const options = {
  // Nasdaq index data
  nasdaqData: [{ date: string, pct_change: number }],

  // Sector index data
  sectorData: [{ date: string, pct_change: number }],

  // Earnings announcement dates
  earningsDates: ['2024-02-15', '2024-05-15'],

  // News sentiment
  newsData: [{
    date: string,
    sentiment: 'positive' | 'negative' | 'neutral'
  }],

  // Short interest percentage
  shortInterest: 20.5,

  // Macro events
  macroEvents: [{
    date: string,
    favorable: boolean
  }]
};
```

## TypeScript Types Cheatsheet

```typescript
// Core types
type StockFactor = "market_up" | "sector_up" | /* ... */;

// Data structures
interface ExtendedStockData { /* ... */ }
interface FactorAnalysis { /* ... */ }

// Functions
calculateMA(prices: number[], period: number): number[]
calculateRSI(prices: number[], period: number): number[]
analyzeFactors(data: ExtendedStockData[], options): FactorAnalysis[]
getFactorSummary(analyses: FactorAnalysis[]): Summary
```

## Testing

Run tests:
```bash
npm test -- stock-factors
```

Run examples:
```bash
npx tsx lib/examples/stock-factor-analysis-example.ts
```

## Resources

- Full Documentation: [STOCK_FACTOR_ANALYSIS.md](./STOCK_FACTOR_ANALYSIS.md)
- Example Code: [stock-factor-analysis-example.ts](../lib/examples/stock-factor-analysis-example.ts)
- Core Module: [stock-factors.ts](../lib/stock-factors.ts)
- Service Layer: [stock-factor-service.ts](../lib/services/stock-factor-service.ts)
