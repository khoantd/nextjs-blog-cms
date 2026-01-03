# Stock Data Analysis - Python to TypeScript Conversion

This document explains the conversion of Python pandas code to TypeScript.

## Original Python Code

```python
import pandas as pd

# Load data
df = pd.read_csv("SNAP_daily.csv")

# Ensure Date is datetime
df['Date'] = pd.to_datetime(df['Date'])

# Sort by time ascending
df = df.sort_values('Date')

# Calculate % change day by day (close to close)
df['pct_change'] = df['Close'].pct_change() * 100

# Filter days with increase >= 4%
tx = df[df['pct_change'] >= 4].copy()

# Number transactions
tx['Tx'] = range(1, len(tx) + 1)

print(tx[['Tx', 'Date', 'Close', 'pct_change']])
```

## TypeScript Implementations

### Option 1: Native TypeScript ([lib/data-analysis.ts](../lib/data-analysis.ts))

Pure TypeScript implementation with no external data processing libraries.

**Pros:**
- No additional dependencies
- Full control over implementation
- Lightweight

**Cons:**
- More verbose
- Manual CSV parsing
- More code to maintain

**Usage:**
```typescript
import { analyzeStockData } from './lib/data-analysis';

const results = analyzeStockData('SNAP_daily.csv');
```

### Option 2: Danfo.js ([lib/data-analysis-danfo.ts](../lib/data-analysis-danfo.ts))

Uses `danfojs-node` for a pandas-like API.

**Pros:**
- Similar API to pandas
- Easier for Python developers
- Built-in CSV reading

**Cons:**
- Additional dependency (126 packages)
- Some API differences from pandas
- Async operations

**Usage:**
```typescript
import { analyzeStockData } from './lib/data-analysis-danfo';

const results = await analyzeStockData('SNAP_daily.csv');
```

## Running the Analysis

### Run both implementations:
```bash
npm run test:analysis
```

### Or run directly:
```bash
tsx scripts/test-analysis.ts
```

## API Mapping: Python → TypeScript

| Python (pandas) | Native TypeScript | Danfo.js |
|----------------|------------------|----------|
| `pd.read_csv()` | Manual `fs.readFileSync()` + parsing | `dfd.readCSV()` |
| `pd.to_datetime()` | `new Date()` | `new Date()` with mapping |
| `df.sort_values('Date')` | `.sort()` with comparator | `df.sortValues('Date')` |
| `df['Close'].pct_change()` | Custom `calculatePctChange()` | Manual loop calculation |
| `df[df['col'] >= 4]` | `.filter()` | `df.iloc()` with mask |
| `range(1, len(tx) + 1)` | `Array.from({ length })` | `Array.from({ length })` |

## Sample Data

The repository includes sample data in [SNAP_daily.csv](../SNAP_daily.csv) with 20 days of stock price data.

## Results

Both implementations identify the same 7 transactions where the daily percentage change was >= 4%:

```
Tx  Date        Close   pct_change
1   2024-01-05  14.00   4.09%
2   2024-01-09  14.50   4.32%
3   2024-01-12  15.35   4.07%
4   2024-01-17  15.35   4.42%
5   2024-01-22  16.45   4.11%
6   2024-01-24  17.05   4.28%
7   2024-01-26  17.30   4.22%
```

## Recommendation

For simple data processing tasks, use the **native TypeScript** version ([lib/data-analysis.ts](../lib/data-analysis.ts)) to avoid additional dependencies.

For complex data analysis or if you're familiar with pandas and want similar APIs, use the **Danfo.js** version ([lib/data-analysis-danfo.ts](../lib/data-analysis-danfo.ts)).
