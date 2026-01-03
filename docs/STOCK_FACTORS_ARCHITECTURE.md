# Stock Factor Analysis Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Stock Analysis System                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         Data Sources                             │
├─────────────────────────────────────────────────────────────────┤
│  CSV Files  │  Nasdaq Data  │  News  │  Earnings  │  Macro      │
└──────┬──────────────┬──────────┬────────────┬──────────┬─────────┘
       │              │          │            │          │
       ▼              ▼          ▼            ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Parsing Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  parseStockCSV()  │  calculatePctChanges()  │  Data Validation  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Technical Indicators Layer                      │
├─────────────────────────────────────────────────────────────────┤
│  calculateMA()  │  calculateRSI()  │  enrichWithTechnicalData() │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Factor Analysis Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  analyzeFactors()  │  detectFactors()  │  categorizeFactors()   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Analytics Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  getFactorSummary()  │  correlateFactors()  │  rankFactors()    │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Output Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│  enrichTransactions()  │  formatResults()  │  generatePrompts() │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Presentation Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  API Routes  │  React Components  │  AI Insights  │  Reports    │
└─────────────────────────────────────────────────────────────────┘
```

## Module Structure

```
lib/
├── stock-factors.ts                    ← CORE MODULE
│   ├── Types & Constants
│   │   ├── StockFactor (type)
│   │   ├── STOCK_FACTORS (array)
│   │   └── FACTOR_DESCRIPTIONS (metadata)
│   │
│   ├── Technical Indicators
│   │   ├── calculateMA()
│   │   └── calculateRSI()
│   │
│   └── Factor Analysis
│       ├── analyzeFactors()
│       ├── getFactorSummary()
│       └── correlateFactorsWithPriceMovement()
│
├── services/stock-factor-service.ts    ← SERVICE LAYER
│   ├── Data Processing
│   │   ├── parseStockCSV()
│   │   ├── calculatePctChanges()
│   │   └── enrichWithTechnicalIndicators()
│   │
│   ├── Integration
│   │   ├── performFactorAnalysis()
│   │   └── enrichTransactionsWithFactors()
│   │
│   └── Output
│       ├── formatFactorAnalysisResults()
│       └── generateFactorInsightsPrompt()
│
└── types/stock-analysis.ts             ← TYPE DEFINITIONS
    ├── Transaction (interface)
    ├── StockAnalysisResult (interface)
    └── StockAnalysis (interface)
```

## Data Flow Diagram

```
CSV File
   │
   ▼
┌─────────────────┐
│ parseStockCSV() │
└────────┬────────┘
         │
         ▼
    StockData[]
         │
         ├─────────────────────────┐
         │                         │
         ▼                         ▼
┌──────────────────┐    ┌────────────────────────┐
│ calculateMA()    │    │ calculatePctChanges()  │
│ calculateRSI()   │    └───────────┬────────────┘
└────────┬─────────┘                │
         │                          │
         ▼                          │
  TechnicalData                     │
         │                          │
         └──────────┬───────────────┘
                    │
                    ▼
        ExtendedStockData[]
                    │
                    ├─────────────┐
                    │             │
                    ▼             ▼
        ┌──────────────────┐  Optional:
        │ analyzeFactors() │  - Nasdaq data
        └────────┬─────────┘  - Sector data
                 │            - Earnings dates
                 │            - News data
                 ▼            - Macro events
         FactorAnalysis[]
                 │
                 ├─────────────────┬──────────────────┐
                 │                 │                  │
                 ▼                 ▼                  ▼
        ┌────────────┐   ┌─────────────────┐  ┌──────────┐
        │ Summary    │   │ Correlation     │  │ Enriched │
        │ Statistics │   │ Analysis        │  │ Txs      │
        └────────────┘   └─────────────────┘  └──────────┘
                 │                 │                  │
                 └─────────────────┴──────────────────┘
                                   │
                                   ▼
                           Final Results
                        (JSON / API Response)
```

## Factor Detection Flow

```
For each trading day:

1. Load Stock Data
   ├── Date
   ├── Close Price
   ├── Volume
   └── Optional: Open, High, Low

2. Calculate Technical Indicators
   ├── MA20, MA50, MA200
   ├── RSI
   └── Volume MA20

3. Check Each Factor
   │
   ├── TECHNICAL FACTORS
   │   ├── volume_spike: Volume > 1.5 × VolumeMA20
   │   ├── break_ma50: Price crosses above MA50
   │   ├── break_ma200: Price crosses above MA200
   │   └── rsi_over_60: RSI > 60
   │
   ├── MARKET FACTORS
   │   ├── market_up: Nasdaq gain > 1.5%
   │   ├── sector_up: Sector gain > 1.0%
   │   └── short_covering: ShortInt > 15% AND PctChange > 2%
   │
   ├── FUNDAMENTAL FACTORS
   │   ├── earnings_window: |Date - EarningsDate| ≤ 3 days
   │   └── macro_tailwind: Favorable Fed/CPI event
   │
   └── SENTIMENT FACTORS
       └── news_positive: Positive news sentiment

4. Aggregate Results
   ├── List of active factors
   ├── Factor count
   └── Factor metadata

5. Return Analysis
   └── FactorAnalysis object
```

## Class/Interface Relationships

```
┌─────────────────────────┐
│   ExtendedStockData     │
├─────────────────────────┤
│ Date: string            │
│ Close: number           │
│ Volume?: number         │
│ ma20?: number           │ ← Added by enrichment
│ ma50?: number           │
│ ma200?: number          │
│ rsi?: number            │
│ pct_change?: number     │
└───────────┬─────────────┘
            │
            │ Used by
            ▼
┌─────────────────────────┐
│    FactorAnalysis       │
├─────────────────────────┤
│ date: string            │
│ factors: Record<...>    │ ← Boolean flags
│ factorCount: number     │
│ factorList: Factor[]    │ ← Active factors
└───────────┬─────────────┘
            │
            │ Aggregated into
            ▼
┌─────────────────────────┐       ┌──────────────────┐
│   FactorSummary         │       │  Correlation     │
├─────────────────────────┤       ├──────────────────┤
│ totalDays: number       │       │ Factor →         │
│ factorCounts: {...}     │       │  - correlation   │
│ factorFrequency: {...}  │       │  - avgReturn     │
│ averageFactors: number  │       │  - occurrences   │
└─────────────────────────┘       └──────────────────┘
            │                              │
            └──────────┬───────────────────┘
                       │
                       │ Combined in
                       ▼
            ┌───────────────────────┐
            │ StockAnalysisResult   │
            ├───────────────────────┤
            │ transactions: [...]   │
            │ factorAnalysis:       │
            │   ├── analyses        │
            │   ├── summary         │
            │   └── correlation     │
            └───────────────────────┘
```

## Integration Points

### 1. Existing Data Analysis Integration

```typescript
// lib/data-analysis.ts
import { performFactorAnalysis } from './services/stock-factor-service';

export function analyzeStockData(csvFilePath: string) {
  // Parse and analyze (existing code)
  const tx = dataWithPctChange.filter(row => row.pct_change >= 4);

  // NEW: Add factor analysis
  const factorResults = performFactorAnalysis(dataWithPctChange, {
    nasdaqData: await fetchNasdaqData(),
    earningsDates: await fetchEarningsDates(symbol)
  });

  return {
    transactions: tx,
    factorAnalysis: factorResults  // NEW
  };
}
```

### 2. API Route Integration

```typescript
// app/api/stock-analyses/route.ts
export async function POST(request: Request) {
  const { csvContent, symbol } = await request.json();

  // Parse and analyze
  const stockData = parseStockCSV(csvContent);
  const analysisResults = performFactorAnalysis(stockData);

  // Save to database
  const analysis = await prisma.stockAnalysis.create({
    data: {
      symbol,
      analysisResults: JSON.stringify({
        ...existingResults,
        factorAnalysis: analysisResults
      })
    }
  });

  return Response.json(analysis);
}
```

### 3. Component Integration

```typescript
// components/stock-analysis-detail.tsx
function FactorBadges({ factors }: { factors: StockFactor[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {factors.map(factor => {
        const desc = FACTOR_DESCRIPTIONS[factor];
        return (
          <Badge
            key={factor}
            variant={desc.category}
            title={desc.description}
          >
            {desc.name}
          </Badge>
        );
      })}
    </div>
  );
}

function TransactionTable({ transactions }: Props) {
  return (
    <table>
      {transactions.map(tx => (
        <tr key={tx.tx}>
          <td>{tx.date}</td>
          <td>{tx.pctChange}%</td>
          <td>
            <FactorBadges factors={tx.factors || []} />
            <span className="ml-2 text-sm text-gray-500">
              ({tx.factorCount} factors)
            </span>
          </td>
        </tr>
      ))}
    </table>
  );
}
```

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Parse CSV | O(n) | n = rows |
| Calculate MA | O(n×m) | m = period |
| Calculate RSI | O(n×m) | m = period |
| Analyze Factors | O(n×f) | f = factor count (10) |
| Get Summary | O(n×f) | Single pass |
| Correlate | O(n×f) | Single pass |

**Optimization Tips:**
- Calculate technical indicators once, cache results
- Process all factors in single pass
- Use lazy evaluation for optional data
- Batch database operations

## Error Handling

```
Data Input
   │
   ├─ Invalid CSV format
   │  └─ Throw ParseError
   │
   ├─ Missing required fields (Date, Close)
   │  └─ Throw ValidationError
   │
   ├─ Invalid date format
   │  └─ Try parse, fallback to string
   │
   ├─ Missing optional data
   │  └─ Skip related factors (graceful degradation)
   │
   └─ Calculation errors (division by zero, etc.)
      └─ Return NaN, filter in results
```

## Future Architecture Enhancements

1. **Real-time Processing**
   ```
   WebSocket → Stream Data → Live Factor Analysis → Push Updates
   ```

2. **Machine Learning Integration**
   ```
   Factor Data → Feature Engineering → ML Model → Weight Optimization
   ```

3. **Backtesting Framework**
   ```
   Historical Data → Strategy Definition → Factor-based Rules → Backtest Results
   ```

4. **Custom Factor Builder**
   ```
   User Input → Factor Definition → Validation → Dynamic Registration
   ```

## File Dependencies

```
stock-factors.ts (Core)
   │
   ├── No external dependencies
   └── Pure TypeScript functions

stock-factor-service.ts (Service)
   │
   ├── Depends on: stock-factors.ts
   └── Provides integration layer

stock-analysis.ts (Types)
   │
   ├── Depends on: stock-factors.ts
   └── Extended for factor support

examples/*.ts
   │
   ├── Depends on: stock-factors.ts
   ├── Depends on: stock-factor-service.ts
   └── Demonstration code

__tests__/*.test.ts
   │
   └── Tests all modules
```

## Conclusion

The stock factor analysis system is designed with:
- ✅ Clear separation of concerns
- ✅ Modular architecture
- ✅ Type safety throughout
- ✅ Easy integration points
- ✅ Scalable design
- ✅ Comprehensive error handling
