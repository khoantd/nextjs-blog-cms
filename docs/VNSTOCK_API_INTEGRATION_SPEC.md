# Vnstock API Integration Specification

## Overview

This specification defines the integration of the remote Vnstock API (`http://72.60.233.159:8002/`) into the Next.js frontend application. The integration provides Vietnamese stock market data including company information, financial reports, trading data, and CSV downloads.

## API Base Configuration

- **Base URL**: `http://72.60.233.159:8002`
- **Environment Variable**: `NEXT_PUBLIC_VNSTOCK_API_URL` (default: `http://72.60.233.159:8002`)
- **Authentication**: JWT Bearer Token (required for all endpoints except health check)
- **Content-Type**: `application/json` for all requests

## Authentication Specification

### 1. User Registration

**Endpoint**: `POST /auth/register`

**Request**:
```typescript
interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}
```

**Response**:
```typescript
interface RegisterResponse {
  message: string;
  user_id?: string;
}
```

**Error Responses**:
- `400`: Bad Request (validation errors, user already exists)
- `500`: Internal Server Error

### 2. User Login

**Endpoint**: `POST /auth/login`

**Request**:
```typescript
interface LoginRequest {
  username: string;
  password: string;
}
```

**Response**:
```typescript
interface LoginResponse {
  access_token: string;
  token_type: "bearer";
}
```

**Error Responses**:
- `401`: Unauthorized (invalid credentials)
- `400`: Bad Request (missing fields)

### 3. Get Current User

**Endpoint**: `GET /auth/me`

**Headers**: `Authorization: Bearer {token}`

**Response**:
```typescript
interface UserResponse {
  id: string;
  username: string;
  email: string;
}
```

**Error Responses**:
- `401`: Unauthorized (invalid/missing token)

## Company Information Endpoints

### 1. Company Overview

**Endpoint**: `POST /api/v1/company/overview`

**Request**:
```typescript
interface CompanyOverviewRequest {
  symbol: string; // e.g., "VCB"
  source?: "vci" | "tcbs"; // default: "vci"
  random_agent?: boolean; // default: false
  show_log?: boolean; // default: false
}
```

**Response**:
```typescript
interface CompanyOverviewResponse {
  symbol: string;
  data: {
    // Company basic information
    company_name?: string;
    industry?: string;
    sector?: string;
    exchange?: string;
    market_cap?: number;
    // Additional fields from vnstock API
    [key: string]: any;
  };
  source: string;
}
```

### 2. Shareholders

**Endpoint**: `POST /api/v1/company/shareholders`

**Request**:
```typescript
interface ShareholdersRequest {
  symbol: string;
  source?: "vci" | "tcbs";
}
```

**Response**:
```typescript
interface ShareholdersResponse {
  symbol: string;
  data: Array<{
    shareholder_name: string;
    ownership_percentage: number;
    shares: number;
    // Additional fields
    [key: string]: any;
  }>;
  source: string;
}
```

### 3. Officers

**Endpoint**: `POST /api/v1/company/officers`

**Request**:
```typescript
interface OfficersRequest {
  symbol: string;
  source?: "vci" | "tcbs";
  filter_by?: "all" | "current" | "former"; // default: "all"
}
```

**Response**:
```typescript
interface OfficersResponse {
  symbol: string;
  data: Array<{
    name: string;
    position: string;
    appointment_date?: string;
    // Additional fields
    [key: string]: any;
  }>;
  source: string;
}
```

### 4. Subsidiaries

**Endpoint**: `POST /api/v1/company/subsidiaries`

**Request**:
```typescript
interface SubsidiariesRequest {
  symbol: string;
  source?: "vci" | "tcbs";
  filter_by?: "all" | "major"; // default: "all"
}
```

**Response**:
```typescript
interface SubsidiariesResponse {
  symbol: string;
  data: Array<{
    company_name: string;
    ownership_percentage: number;
    // Additional fields
    [key: string]: any;
  }>;
  source: string;
}
```

### 5. Affiliate Information

**Endpoint**: `POST /api/v1/company/affiliate`

**Request**:
```typescript
interface AffiliateRequest {
  symbol: string;
  source?: "vci" | "tcbs";
}
```

**Response**:
```typescript
interface AffiliateResponse {
  symbol: string;
  data: {
    // Affiliate company information
    [key: string]: any;
  };
  source: string;
}
```

### 6. Company News

**Endpoint**: `POST /api/v1/company/news`

**Request**:
```typescript
interface CompanyNewsRequest {
  symbol: string;
  source?: "vci" | "tcbs";
}
```

**Response**:
```typescript
interface CompanyNewsResponse {
  symbol: string;
  data: Array<{
    title: string;
    date: string;
    url?: string;
    summary?: string;
    // Additional fields
    [key: string]: any;
  }>;
  source: string;
}
```

### 7. Company Events

**Endpoint**: `POST /api/v1/company/events`

**Request**:
```typescript
interface CompanyEventsRequest {
  symbol: string;
  source?: "vci" | "tcbs";
}
```

**Response**:
```typescript
interface CompanyEventsResponse {
  symbol: string;
  data: Array<{
    event_type: string;
    date: string;
    description: string;
    // Additional fields
    [key: string]: any;
  }>;
  source: string;
}
```

## Financial Information Endpoints

### 1. Balance Sheet

**Endpoint**: `POST /api/v1/financial/balance-sheet`

**Request**:
```typescript
interface BalanceSheetRequest {
  symbol: string;
  source?: "vci" | "tcbs";
  period?: "quarter" | "year"; // default: "quarter"
  lang?: "vi" | "en"; // default: "vi"
  dropna?: boolean; // default: true
  get_all?: boolean; // default: true
  show_log?: boolean; // default: false
}
```

**Response**:
```typescript
interface BalanceSheetResponse {
  symbol: string;
  data: {
    // DataFrame converted to dict/array format
    // Columns: Date, Assets, Liabilities, Equity, etc.
    [key: string]: any;
  };
  source: string;
}
```

### 2. Income Statement

**Endpoint**: `POST /api/v1/financial/income-statement`

**Request**:
```typescript
interface IncomeStatementRequest {
  symbol: string;
  source?: "vci" | "tcbs";
  period?: "quarter" | "year";
  lang?: "vi" | "en";
  dropna?: boolean;
  get_all?: boolean;
  show_log?: boolean;
}
```

**Response**:
```typescript
interface IncomeStatementResponse {
  symbol: string;
  data: {
    // DataFrame: Date, Revenue, Expenses, Net Income, etc.
    [key: string]: any;
  };
  source: string;
}
```

### 3. Cash Flow

**Endpoint**: `POST /api/v1/financial/cash-flow`

**Request**:
```typescript
interface CashFlowRequest {
  symbol: string;
  source?: "vci" | "tcbs";
  period?: "quarter" | "year";
  lang?: "vi" | "en";
  dropna?: boolean;
  get_all?: boolean;
  show_log?: boolean;
}
```

**Response**:
```typescript
interface CashFlowResponse {
  symbol: string;
  data: {
    // DataFrame: Date, Operating Cash Flow, Investing, Financing, etc.
    [key: string]: any;
  };
  source: string;
}
```

### 4. Financial Ratios

**Endpoint**: `POST /api/v1/financial/ratios`

**Request**:
```typescript
interface FinancialRatiosRequest {
  symbol: string;
  source?: "vci" | "tcbs";
  period?: "quarter" | "year";
  flatten_columns?: boolean; // default: true
  separator?: string; // default: "_"
  get_all?: boolean; // default: true
  show_log?: boolean; // default: false
}
```

**Response**:
```typescript
interface FinancialRatiosResponse {
  symbol: string;
  data: {
    // DataFrame: Date, ROE, ROA, P/E, P/B, etc.
    [key: string]: any;
  };
  source: string;
}
```

## Trading Data Endpoints

### 1. Trading Statistics

**Endpoint**: `POST /api/v1/trading/stats`

**Request**:
```typescript
interface TradingStatsRequest {
  symbol: string;
  source?: "vci" | "tcbs";
  start: string; // ISO date: "YYYY-MM-DD"
  end: string; // ISO date: "YYYY-MM-DD"
  limit?: number; // default: 1000
  random_agent?: boolean; // default: false
  show_log?: boolean; // default: false
}
```

**Response**:
```typescript
interface TradingStatsResponse {
  symbol: string;
  data: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    // Additional fields
    [key: string]: any;
  }>;
  source: string;
}
```

### 2. Side Statistics (Bid/Ask)

**Endpoint**: `POST /api/v1/trading/side-stats`

**Request**:
```typescript
interface SideStatsRequest {
  symbol: string;
  source?: "vci" | "tcbs";
}
```

**Response**:
```typescript
interface SideStatsResponse {
  symbol: string;
  data: {
    bid_price: number;
    ask_price: number;
    bid_volume: number;
    ask_volume: number;
    // Additional fields
    [key: string]: any;
  };
  source: string;
}
```

### 3. Price Board

**Endpoint**: `POST /api/v1/trading/price-board`

**Request**:
```typescript
interface PriceBoardRequest {
  symbols_list: string[]; // e.g., ["VCB", "FPT", "HPG"]
  source?: "vci" | "tcbs";
}
```

**Response**:
```typescript
interface PriceBoardResponse {
  data: {
    [symbol: string]: {
      price: number;
      change: number;
      change_percent: number;
      volume: number;
      // Additional fields
      [key: string]: any;
    };
  };
  source: string;
}
```

### 4. Price History

**Endpoint**: `POST /api/v1/trading/price-history`

**Request**:
```typescript
interface PriceHistoryRequest {
  symbol: string;
  source?: "vci" | "tcbs";
  start: string; // ISO date: "YYYY-MM-DD"
  end: string; // ISO date: "YYYY-MM-DD"
  interval?: "D" | "W" | "M"; // default: "D"
}
```

**Response**:
```typescript
interface PriceHistoryResponse {
  symbol: string;
  data: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    // Additional fields
    [key: string]: any;
  }>;
  source: string;
}
```

**Data Transformation**: This endpoint's response must be transformed to match the existing `HistoricalDataPoint[]` format:

```typescript
interface HistoricalDataPoint {
  date: string; // ISO date string: "YYYY-MM-DD"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number; // Use close if not available
}
```

### 5. Foreign Trade Data

**Endpoint**: `POST /api/v1/trading/foreign-trade`

**Request**:
```typescript
interface ForeignTradeRequest {
  symbol: string;
  source?: "vci" | "tcbs";
}
```

**Response**:
```typescript
interface ForeignTradeResponse {
  symbol: string;
  data: {
    // Foreign trading statistics
    [key: string]: any;
  };
  source: string;
}
```

### 6. Property Trade Data

**Endpoint**: `POST /api/v1/trading/prop-trade`

**Request**:
```typescript
interface PropTradeRequest {
  symbol: string;
  source?: "vci" | "tcbs";
}
```

**Response**:
```typescript
interface PropTradeResponse {
  symbol: string;
  data: {
    // Proprietary trading statistics
    [key: string]: any;
  };
  source: string;
}
```

### 7. Insider Deal Data

**Endpoint**: `POST /api/v1/trading/insider-deal`

**Request**:
```typescript
interface InsiderDealRequest {
  symbol: string;
  source?: "vci" | "tcbs";
}
```

**Response**:
```typescript
interface InsiderDealResponse {
  symbol: string;
  data: Array<{
    date: string;
    insider_name: string;
    transaction_type: string;
    shares: number;
    price: number;
    // Additional fields
    [key: string]: any;
  }>;
  source: string;
}
```

### 8. Order Statistics

**Endpoint**: `POST /api/v1/trading/order-stats`

**Request**:
```typescript
interface OrderStatsRequest {
  symbol: string;
  source?: "vci" | "tcbs";
}
```

**Response**:
```typescript
interface OrderStatsResponse {
  symbol: string;
  data: {
    // Order statistics
    [key: string]: any;
  };
  source: string;
}
```

## CSV Download Endpoints

### 1. Download Single Symbol CSV

**Endpoint**: `POST /api/v1/download/csv`

**Request**:
```typescript
interface DownloadCSVRequest {
  symbol: string;
  start_date: string; // ISO date: "YYYY-MM-DD"
  end_date: string; // ISO date: "YYYY-MM-DD"
  source?: "vci" | "tcbs";
  interval?: "D" | "W" | "M"; // default: "D"
}
```

**Response**:
```typescript
interface DownloadCSVResponse {
  symbol: string;
  csv_content: string; // CSV text content
  start_date: string;
  end_date: string;
  source: string;
}
```

**CSV Format**: The CSV should match the existing format expected by the stock analysis system:

```csv
Date,Open,High,Low,Close,Volume
2024-01-01,100.0,105.0,99.0,103.0,1000000
2024-01-02,103.0,107.0,102.0,106.0,1200000
...
```

### 2. Download Multiple Symbols CSV

**Endpoint**: `POST /api/v1/download/multiple`

**Request**:
```typescript
interface DownloadMultipleCSVRequest {
  symbols: string[]; // e.g., ["VCB", "FPT", "HPG"]
  start_date: string;
  end_date: string;
  source?: "vci" | "tcbs";
  interval?: "D" | "W" | "M";
  combine?: boolean; // default: false
}
```

**Response**:
```typescript
interface DownloadMultipleCSVResponse {
  symbols: string[];
  csv_content: string; // Combined CSV if combine=true, otherwise separate files
  start_date: string;
  end_date: string;
  source: string;
}
```

## Type Definitions

### Core Types

```typescript
// lib/types/vnstock.ts

export type VnstockSource = "vci" | "tcbs";
export type FinancialPeriod = "quarter" | "year";
export type TradingInterval = "D" | "W" | "M";
export type Language = "vi" | "en";

export interface VnstockApiResponse<T> {
  symbol?: string;
  data: T;
  source: string;
  [key: string]: any;
}

export interface VnstockErrorResponse {
  detail: string;
  status_code?: number;
}
```

### Authentication Types

```typescript
export interface VnstockAuthToken {
  access_token: string;
  token_type: "bearer";
  expires_at?: number; // Unix timestamp
}

export interface VnstockUser {
  id: string;
  username: string;
  email: string;
}
```

### Company Data Types

```typescript
export interface CompanyOverview {
  company_name?: string;
  industry?: string;
  sector?: string;
  exchange?: string;
  market_cap?: number;
  [key: string]: any;
}

export interface Shareholder {
  shareholder_name: string;
  ownership_percentage: number;
  shares: number;
  [key: string]: any;
}

export interface Officer {
  name: string;
  position: string;
  appointment_date?: string;
  [key: string]: any;
}

export interface CompanyNews {
  title: string;
  date: string;
  url?: string;
  summary?: string;
  [key: string]: any;
}
```

### Financial Data Types

```typescript
export interface FinancialStatement {
  date: string;
  [key: string]: number | string; // Dynamic columns from DataFrame
}

export interface FinancialRatios {
  date: string;
  roe?: number;
  roa?: number;
  pe_ratio?: number;
  pb_ratio?: number;
  [key: string]: number | string;
}
```

### Trading Data Types

```typescript
export interface TradingDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  [key: string]: any;
}

export interface PriceBoardEntry {
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  [key: string]: any;
}
```

## Integration Points

### 1. Stock Price Service Integration

**File**: `app/api/stock-price/[symbol]/route.ts`

**Integration Logic**:
- When `country === 'VN'`, check if vnstock API is available
- Use `/api/v1/trading/price-board` endpoint with single symbol
- Transform response to match existing `StockPriceData` format:

```typescript
// Transform vnstock price board response
const vnstockPrice = priceBoardData.data[symbol];
const stockPriceData: StockPriceData = {
  symbol: symbol,
  price: vnstockPrice.price,
  change: vnstockPrice.change,
  changePercent: vnstockPrice.change_percent,
  volume: vnstockPrice.volume,
  lastUpdate: new Date().toISOString(),
};
```

### 2. Historical Data Integration

**File**: `app/api/stock-analyses/[id]/fetch-historical/route.ts` (backend) or new frontend route

**Integration Logic**:
- Use `/api/v1/trading/price-history` endpoint
- Transform response to `HistoricalDataPoint[]` format
- Convert to CSV format using existing `historicalDataToCSV()` function

**Transformation**:
```typescript
function transformVnstockPriceHistory(
  response: PriceHistoryResponse
): HistoricalDataPoint[] {
  return response.data.map((point) => ({
    date: point.date,
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close,
    volume: point.volume,
    adjClose: point.close, // Use close as adjClose
  }));
}
```

### 3. CSV Download Integration

**File**: `components/stock-analysis-upload.tsx`

**Integration Logic**:
- Add option to fetch Vietnamese stock data from vnstock API
- When symbol is Vietnamese and user selects "Fetch from Vnstock API":
  - Call `/api/v1/download/csv` endpoint
  - Use date range from form inputs (period1, period2)
  - Transform CSV content to match existing format
  - Save to database using existing CSV upload flow

### 4. Company Information Display

**New Component**: `components/vnstock-company-info.tsx`

**Integration Logic**:
- Fetch company overview, shareholders, officers using vnstock API
- Display in stock analysis detail page
- Add new tab or section for company information

## Error Handling Specification

### Error Response Format

All errors follow this format:

```typescript
interface VnstockError {
  detail: string;
  status_code?: number;
}
```

### Error Codes

- `400`: Bad Request
  - Invalid parameters
  - Missing required fields
  - Data fetch errors from source

- `401`: Unauthorized
  - Missing or invalid JWT token
  - Token expired

- `404`: Not Found
  - Symbol not found
  - Endpoint not found

- `500`: Internal Server Error
  - Server-side errors
  - External API failures

### Error Handling Strategy

1. **Authentication Errors (401)**:
   - Attempt token refresh
   - If refresh fails, redirect to login
   - Store error message for user feedback

2. **Rate Limiting**:
   - Implement exponential backoff
   - Queue requests if rate limit exceeded
   - Show user-friendly message

3. **Network Errors**:
   - Retry with exponential backoff (max 3 retries)
   - Fallback to existing CafeF scraping if available
   - Log error for debugging

4. **Data Transformation Errors**:
   - Validate response structure before transformation
   - Provide fallback values for missing fields
   - Log transformation errors

## Authentication Flow

### Token Storage Strategy

**Server-Side Only**:
- Store JWT token in HTTP-only cookie or server-side session
- Never expose token to client-side JavaScript
- Use Next.js API routes as proxy to add Authorization header

### Token Refresh Strategy

1. Check token expiration before each request
2. If token expires within 5 minutes, refresh automatically
3. Use refresh token endpoint if available, otherwise re-login
4. Store new token securely

### Implementation Pattern

```typescript
// Server-side API route pattern
export async function POST(request: NextRequest) {
  // Get token from server-side storage
  const token = await getVnstockToken();
  
  if (!token) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }
  
  // Make request to vnstock API with token
  const response = await fetch(`${VNSTOCK_API_URL}/api/v1/...`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  // Handle response
  if (response.status === 401) {
    // Token expired, attempt refresh
    const newToken = await refreshVnstockToken();
    if (!newToken) {
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }
    // Retry request with new token
  }
  
  return NextResponse.json(await response.json());
}
```

## Data Transformation Requirements

### 1. Price History to CSV

Transform vnstock price history response to CSV format:

```typescript
function vnstockPriceHistoryToCSV(
  data: TradingDataPoint[]
): string {
  const headers = "Date,Open,High,Low,Close,Volume";
  const rows = data.map((point) =>
    `${point.date},${point.open},${point.high},${point.low},${point.close},${point.volume}`
  );
  return [headers, ...rows].join("\n");
}
```

### 2. Price Board to Stock Price Data

Transform price board response to `StockPriceData`:

```typescript
function priceBoardToStockPrice(
  symbol: string,
  priceBoardData: PriceBoardResponse
): StockPriceData {
  const entry = priceBoardData.data[symbol];
  return {
    symbol: symbol,
    price: entry.price,
    change: entry.change,
    changePercent: entry.change_percent,
    volume: entry.volume,
    lastUpdate: new Date().toISOString(),
  };
}
```

### 3. Financial Data Normalization

Normalize financial statement data to consistent format:

```typescript
function normalizeFinancialData(
  rawData: any,
  statementType: "balance_sheet" | "income_statement" | "cash_flow"
): FinancialStatement[] {
  // Transform DataFrame-like structure to array of objects
  // Handle Vietnamese column names and translate if needed
  // Ensure consistent date format
  return normalizedData;
}
```

## Environment Variables

Add to `.env.local`:

```bash
# Vnstock API Configuration
NEXT_PUBLIC_VNSTOCK_API_URL=http://72.60.233.159:8002

# Optional: Auto-login credentials (for development)
VNSTOCK_USERNAME=your_username
VNSTOCK_PASSWORD=your_password
```

## API Rate Limiting

The vnstock API may have rate limits. Implementation should:

1. **Respect Rate Limits**:
   - Monitor response headers for rate limit information
   - Implement request queuing if rate limit exceeded
   - Show user-friendly message when rate limited

2. **Retry Strategy**:
   - Exponential backoff: 1s, 2s, 4s
   - Max 3 retries
   - Log retry attempts

3. **Fallback Strategy**:
   - If vnstock API unavailable, fallback to existing CafeF scraping
   - Show indicator when using fallback

## Testing Requirements

### Unit Tests

1. **Authentication Service**:
   - Token storage and retrieval
   - Token refresh logic
   - Error handling

2. **API Service**:
   - Request formatting
   - Response transformation
   - Error handling

3. **Data Transformation**:
   - Price history to CSV conversion
   - Price board to stock price conversion
   - Financial data normalization

### Integration Tests

1. **API Routes**:
   - Authentication flow
   - Endpoint proxying
   - Error handling

2. **Component Integration**:
   - Stock price display
   - CSV download flow
   - Company information display

### End-to-End Tests

1. **Complete Flows**:
   - Login → Fetch price → Display
   - Download CSV → Upload → Analyze
   - Fetch company info → Display

## Security Considerations

1. **Token Security**:
   - Never expose JWT token to client
   - Use HTTP-only cookies or server-side storage
   - Implement token rotation

2. **Input Validation**:
   - Validate all user inputs
   - Sanitize symbol names
   - Validate date ranges

3. **Error Information**:
   - Don't expose sensitive error details to client
   - Log detailed errors server-side only

4. **CORS Configuration**:
   - Ensure vnstock API allows requests from frontend domain
   - Use server-side proxy to avoid CORS issues

## Performance Considerations

1. **Caching Strategy**:
   - Cache company overview data (TTL: 1 hour)
   - Cache price board data (TTL: 5 minutes)
   - Cache financial statements (TTL: 1 day)

2. **Request Optimization**:
   - Batch multiple symbol requests when possible
   - Use price board endpoint for multiple symbols
   - Implement request deduplication

3. **Data Transformation**:
   - Transform data server-side to reduce client processing
   - Stream large CSV downloads
   - Paginate large datasets

## Migration Strategy

### Phase 1: Parallel Implementation
- Add vnstock API alongside existing CafeF scraping
- Feature flag to choose data source
- Test with limited symbols

### Phase 2: Gradual Migration
- Default to vnstock API for Vietnamese stocks
- Fallback to CafeF if vnstock fails
- Monitor error rates

### Phase 3: Full Migration
- Remove CafeF scraping code
- Use vnstock API exclusively
- Update documentation

## Success Criteria

1. ✅ All vnstock API endpoints integrated
2. ✅ Authentication flow working
3. ✅ Price data fetching from vnstock API
4. ✅ CSV download working
5. ✅ Company information display working
6. ✅ Error handling robust
7. ✅ Fallback to CafeF if vnstock unavailable
8. ✅ Performance acceptable (< 2s response time)
9. ✅ All tests passing
10. ✅ Documentation complete
