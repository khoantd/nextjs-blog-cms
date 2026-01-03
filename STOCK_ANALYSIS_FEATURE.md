# Stock Analysis Feature - Quick Start

A complete UI for analyzing stock price data, built with the same patterns as the Blog Post feature.

## What's Included

### 🎨 UI Components
- **Upload Form**: Upload CSV files with stock data
- **List View**: Browse all analyses in a grid layout
- **Detail View**: See complete results with transaction tables
- **Navigation**: Integrated into main sidebar menu

### 🔧 Backend
- **API Routes**: RESTful endpoints for CRUD operations
- **Analysis Service**: Calculates daily % changes from CSV data
- **Type Safety**: Full TypeScript support
- **Database Schema**: Prisma model ready (optional)

### 📊 Features
- Upload CSV files with stock price data
- Auto-calculate daily percentage changes
- Filter transactions by threshold (default: ≥4%)
- View results in clean tables
- Real-time updates with SWR

## Quick Start

### 1. Access the Feature

Navigate to: **http://localhost:3000/stock-analyses**

Or click **"Stock Analysis"** in the sidebar (TrendingUp icon)

### 2. Create Your First Analysis

1. Click **"New Analysis"** button
2. Fill in the form:
   - **Stock Symbol**: e.g., SNAP
   - **Company Name**: (optional)
   - **Threshold**: Default 4% (adjustable)
   - **Upload CSV**: Sample file at `SNAP_daily.csv`
3. Click **"Upload and Analyze"**
4. View results automatically

### 3. CSV Format

Your CSV should have these columns:
```csv
Date,Open,High,Low,Close,Volume
2024-01-02,12.50,12.80,12.40,12.75,15000000
```

**Required**: `Date`, `Close`
**Optional**: `Open`, `High`, `Low`, `Volume`

## File Structure

```
app/
├── api/stock-analyses/
│   ├── route.ts              # GET (list), POST (create)
│   └── [id]/route.ts         # GET (single), DELETE
├── stock-analyses/
│   └── page.tsx              # List page
└── stock-analysis/
    ├── create/page.tsx       # Upload form
    └── [id]/page.tsx         # Detail view

components/
├── stock-analysis-upload.tsx # Upload component
├── stock-analysis-list.tsx   # List component
└── stock-analysis-detail.tsx # Detail component

lib/
├── types/stock-analysis.ts   # TypeScript types
└── services/stock-analysis.ts # Analysis logic

prisma/
└── schema.prisma             # Database model (optional)
```

## How It Works

1. **Upload**: User uploads CSV file with stock data
2. **Parse**: System parses CSV and sorts by date
3. **Calculate**: Computes daily % change in closing prices
4. **Filter**: Identifies days meeting threshold
5. **Display**: Shows results in formatted table

## Sample Results

Using `SNAP_daily.csv` with 4% threshold:

- **Total Days**: 20
- **Transactions**: 7 days with ≥4% gains
- **Example**:
  - Jan 5, 2024: $14.00 (+4.09%)
  - Jan 9, 2024: $14.50 (+4.32%)
  - Jan 12, 2024: $15.35 (+4.07%)

## Technical Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: Shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Data Fetching**: SWR
- **Icons**: Lucide React
- **Type Safety**: TypeScript
- **Storage**: In-memory (switchable to Prisma DB)

## Current Limitations

- **Data Persistence**: Uses in-memory storage (resets on restart)
- **File Storage**: CSV content stored in memory, not saved
- **Authentication**: No permission checks (add when needed)

## Next Steps

### Enable Database Persistence

1. Run migration (when ready):
   ```bash
   npm run db:migrate
   ```

2. Update API routes to use Prisma instead of in-memory storage

### Add AI Insights

Integrate with Inngest workflows for:
- Pattern recognition
- Trading signals
- Risk assessment
- Market trends

### Add Charts

Integrate visualization library:
- Price charts
- Percentage change graphs
- Trend lines

## Documentation

- **Full Documentation**: [docs/STOCK_ANALYSIS_UI.md](docs/STOCK_ANALYSIS_UI.md)
- **Python Conversion Guide**: [docs/STOCK_ANALYSIS.md](docs/STOCK_ANALYSIS.md)
- **Test Script**: `npm run test:analysis`

## Testing

```bash
# Run build to verify
npm run build

# Start dev server
npm run dev

# Test with sample data
# 1. Navigate to /stock-analyses
# 2. Upload SNAP_daily.csv
# 3. Verify 7 transactions found
```

## Support

For issues or questions:
- Check [docs/STOCK_ANALYSIS_UI.md](docs/STOCK_ANALYSIS_UI.md) for detailed docs
- Review API routes in `app/api/stock-analyses/`
- Check console for errors

---

**Status**: ✅ Production Ready (with in-memory storage)
**Database**: ⏳ Schema ready, migration pending user approval
**Version**: 1.0.0
