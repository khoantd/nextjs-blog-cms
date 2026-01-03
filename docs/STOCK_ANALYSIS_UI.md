# Stock Analysis UI Documentation

This document describes the complete Stock Analysis feature added to the Next.js Blog CMS application.

## Overview

The Stock Analysis feature allows users to upload CSV files containing stock price data and automatically analyze them to identify days with significant price increases. The UI follows the same patterns as the Blog Post feature for consistency.

## Features

- **Upload CSV Files**: Upload stock price data in CSV format
- **Automatic Analysis**: Automatically calculates daily percentage changes
- **Configurable Threshold**: Set minimum percentage change threshold (default: 4%)
- **Visual Results**: View analysis results in a clean, tabular format
- **List View**: Browse all stock analyses with summary cards
- **Detail View**: See complete analysis with transaction details

## Architecture

### Database Schema

Location: [prisma/schema.prisma](../prisma/schema.prisma)

```prisma
model StockAnalysis {
  id                Int      @id @default(autoincrement())
  symbol            String   // Stock symbol (e.g., SNAP, AAPL)
  name              String?  // Company name
  csvFilePath       String?  @map("csv_file_path")
  status            String?  // draft, analyzing, completed
  analysisResults   String?  @map("analysis_results") // JSON
  aiInsights        String?  @map("ai_insights")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  minPctChange      Float    @default(4.0) @map("min_pct_change")

  @@map("stock_analyses")
}
```

### Type Definitions

Location: [lib/types/stock-analysis.ts](../lib/types/stock-analysis.ts)

```typescript
export type StockAnalysisStatus = 'draft' | 'analyzing' | 'completed' | 'failed';

export interface Transaction {
  tx: number;
  date: string;
  close: number;
  pctChange: number;
}

export interface StockAnalysisResult {
  symbol: string;
  totalDays: number;
  transactionsFound: number;
  transactions: Transaction[];
  minPctChange: number;
}

export interface StockAnalysis {
  id: number;
  symbol: string;
  name: string | null;
  csvFilePath: string | null;
  status: StockAnalysisStatus | null;
  analysisResults: string | null;
  aiInsights: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  minPctChange: number;
}
```

### Service Layer

Location: [lib/services/stock-analysis.ts](../lib/services/stock-analysis.ts)

**Key Functions:**
- `parseCSV(csvContent: string)`: Parse CSV content into structured data
- `calculatePctChange(arr: number[])`: Calculate percentage changes
- `analyzeStockDataFromCSV(csvContent, symbol, minPctChange)`: Main analysis function

### API Routes

#### List & Create Analyses
**Location**: [app/api/stock-analyses/route.ts](../app/api/stock-analyses/route.ts)

```typescript
// GET /api/stock-analyses
// Returns list of all stock analyses sorted by creation date

// POST /api/stock-analyses
// Creates new analysis from uploaded CSV
// Body: { symbol, name?, csvContent, minPctChange? }
```

#### Get Single Analysis
**Location**: [app/api/stock-analyses/[id]/route.ts](../app/api/stock-analyses/[id]/route.ts)

```typescript
// GET /api/stock-analyses/[id]
// Returns single stock analysis by ID

// DELETE /api/stock-analyses/[id]
// Deletes a stock analysis
```

### UI Components

#### 1. Stock Analysis Upload
**Location**: [components/stock-analysis-upload.tsx](../components/stock-analysis-upload.tsx)

**Features:**
- File upload input (accepts .csv files)
- Symbol input (auto-extracts from filename)
- Company name input (optional)
- Minimum percentage change threshold
- CSV validation
- Loading states
- Error handling
- Auto-navigation to results after upload

**Form Fields:**
- Stock Symbol (required)
- Company Name (optional)
- Min % Change Threshold (default: 4.0)
- CSV File (required)

#### 2. Stock Analysis List
**Location**: [components/stock-analysis-list.tsx](../components/stock-analysis-list.tsx)

**Features:**
- Card-based grid layout
- Auto-refresh every 5 seconds (SWR)
- Status badges (draft, analyzing, completed, failed)
- Summary metrics per analysis
- Click-to-view detail
- Empty state with CTA
- Loading and error states

**Display Per Card:**
- Stock symbol (large)
- Company name
- Status badge
- Total days analyzed
- Transactions found
- Threshold percentage
- Creation date

#### 3. Stock Analysis Detail
**Location**: [components/stock-analysis-detail.tsx](../components/stock-analysis-detail.tsx)

**Features:**
- Back navigation
- Summary metrics cards
- Transaction table with:
  - Transaction number
  - Date
  - Close price
  - Percentage change badge
- AI insights section (for future integration)
- Empty state when no transactions found

**Summary Metrics:**
- Total Days Analyzed
- Transactions Found
- Min % Change
- Created Date

**Transaction Table Columns:**
- # (Transaction number)
- Date
- Close Price
- % Change

### Pages

#### List Page
**Location**: [app/stock-analyses/page.tsx](../app/stock-analyses/page.tsx)
**Route**: `/stock-analyses`

Main landing page showing all stock analyses in a grid.

#### Create Page
**Location**: [app/stock-analysis/create/page.tsx](../app/stock-analysis/create/page.tsx)
**Route**: `/stock-analysis/create`

Upload form for creating new analyses.

#### Detail Page
**Location**: [app/stock-analysis/[id]/page.tsx](../app/stock-analysis/[id]/page.tsx)
**Route**: `/stock-analysis/[id]`

View complete analysis results with transaction details.

### Navigation

The Stock Analysis feature is accessible via the main sidebar menu:

**Location**: [components/menu.tsx](../components/menu.tsx)

```typescript
<Button onClick={() => router.push("/stock-analyses")}>
  <TrendingUp className="mr-2 h-4 w-4" />
  Stock Analysis
</Button>
```

## CSV File Format

The application expects CSV files with the following format:

```csv
Date,Open,High,Low,Close,Volume
2024-01-02,12.50,12.80,12.40,12.75,15000000
2024-01-03,12.75,13.10,12.70,13.00,16000000
...
```

**Required Columns:**
- `Date`: Date in any standard format
- `Close`: Closing price (required for analysis)

**Optional Columns:**
- `Open`, `High`, `Low`, `Volume`

## Usage Flow

### 1. Create Analysis

1. Click "Stock Analysis" in sidebar
2. Click "New Analysis" button
3. Fill in form:
   - Enter stock symbol (e.g., SNAP)
   - Optionally enter company name
   - Set percentage threshold (default: 4%)
   - Upload CSV file
4. Click "Upload and Analyze"
5. Automatically redirected to results page

### 2. View Results

Results page shows:
- Summary statistics
- Table of all days meeting threshold
- Each transaction shows:
  - Transaction number
  - Date
  - Closing price
  - Percentage change

### 3. Browse Analyses

List page shows all analyses:
- Grid of cards
- Click any card to view details
- Create new analysis from header button

## Data Storage

**Current Implementation**: In-memory storage (development)
- Data stored in module-level variable
- Resets on server restart
- Suitable for testing and development

**Production Ready**: Database integration prepared
- Prisma schema already defined
- Can be activated by running migrations
- Replace in-memory storage with Prisma queries

## Future Enhancements

### Planned Features

1. **Database Integration**
   - Persistent storage with Prisma
   - Run migration: `npm run db:migrate`

2. **AI Insights**
   - Integrate with Inngest workflows
   - Generate AI-powered trading insights
   - Pattern recognition
   - Risk assessment

3. **Advanced Analytics**
   - Charts and visualizations
   - Moving averages
   - Trend analysis
   - Comparison across stocks

4. **Export Features**
   - Download results as PDF
   - Export to Excel
   - Share via email

5. **File Management**
   - Upload to cloud storage (S3, etc.)
   - File versioning
   - Bulk upload

6. **User Permissions**
   - Role-based access control
   - Similar to Blog Post permissions
   - Viewer, Editor, Admin roles

## UI Component Library

Uses the same components as Blog Posts:
- **Shadcn/ui** components
- **Lucide React** icons
- **Tailwind CSS** styling
- **SWR** for data fetching

## Testing

### Sample Data

Use the provided sample file: [SNAP_daily.csv](../SNAP_daily.csv)

### Manual Testing Steps

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/stock-analyses`

3. Click "New Analysis"

4. Upload the sample CSV file

5. Verify results show 7 transactions with ≥4% gains

### Expected Results

For SNAP_daily.csv with 4% threshold:
- Total Days: 20
- Transactions Found: 7
- Transactions:
  1. 2024-01-05: $14.00 (+4.09%)
  2. 2024-01-09: $14.50 (+4.32%)
  3. 2024-01-12: $15.35 (+4.07%)
  4. 2024-01-17: $15.35 (+4.42%)
  5. 2024-01-22: $16.45 (+4.11%)
  6. 2024-01-24: $17.05 (+4.28%)
  7. 2024-01-26: $17.30 (+4.22%)

## Comparison with Blog Post Feature

| Feature | Blog Posts | Stock Analysis |
|---------|-----------|----------------|
| **List Page** | `/blog-posts` | `/stock-analyses` |
| **Create** | `/blog-post/create` | `/stock-analysis/create` |
| **View** | `/blog-post/[id]` | `/stock-analysis/[id]` |
| **Edit** | `/blog-post/[id]/edit` | N/A (not needed) |
| **Input** | Text editor | File upload |
| **Preview** | MDX preview | Results table |
| **Status** | draft, review, approved, published | draft, analyzing, completed, failed |
| **API** | `/api/blog-posts` | `/api/stock-analyses` |
| **Navigation** | Posts (FileText icon) | Stock Analysis (TrendingUp icon) |

## Technical Details

### Client-Side Components

All UI components use `"use client"` directive:
- `stock-analysis-upload.tsx`
- `stock-analysis-list.tsx`
- `stock-analysis-detail.tsx`

### Server Components

Pages are server components by default:
- `app/stock-analyses/page.tsx`
- `app/stock-analysis/create/page.tsx`
- `app/stock-analysis/[id]/page.tsx`

### Data Fetching

- **Client**: SWR with auto-refresh
- **Server**: Direct API fetch (for SSR)

### State Management

- Form state: React `useState`
- Global state: SWR cache
- Server state: API + Database (future)

## Troubleshooting

### Issue: CSV Parse Error

**Solution**: Ensure CSV has proper format with headers in first row

### Issue: No Transactions Found

**Solution**: Try lowering the percentage threshold

### Issue: Build Errors

**Solution**: Run `npm run build` to check TypeScript errors

### Issue: Data Not Persisting

**Solution**: Currently using in-memory storage. Run database migration for persistence.

## Related Documentation

- [Stock Data Analysis - Python to TypeScript](./STOCK_ANALYSIS.md)
- [Blog Post Feature Documentation](../README.md)
- [Prisma Schema](../prisma/schema.prisma)
- [API Routes](../app/api/stock-analyses/)

## Summary

The Stock Analysis feature provides a complete, production-ready UI for analyzing stock price data. It follows the same architectural patterns as the Blog Post feature, ensuring consistency and maintainability. The feature is currently functional with in-memory storage and ready for database integration when needed.
