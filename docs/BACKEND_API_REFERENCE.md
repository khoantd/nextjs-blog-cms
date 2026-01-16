# Backend API Reference

Complete documentation of all exposed APIs from the Express backend server running on `http://localhost:3001`.

**Base URL**: `http://localhost:3001`  
**API Documentation**: `http://localhost:3001/api-docs/` (Swagger UI)

## Authentication

All API endpoints (except `/api/auth/*` and `/health`) require authentication via NextAuth session cookies. The backend extracts the JWT token from the `next-auth.session-token` cookie (development) or `__Secure-next-auth.session-token` cookie (production).

### Authentication Flow
1. Frontend authenticates via NextAuth (Google OAuth)
2. NextAuth sets session cookie in browser
3. Server-side Next.js API routes forward cookies to backend
4. Backend extracts JWT token from cookie using `getToken` from `next-auth/jwt`
5. Backend validates token and attaches user to request

---

## Public Endpoints

### Health Check
- **GET** `/health`
- **Description**: Server health status
- **Authentication**: None required
- **Response**: `{ status: 'ok', timestamp: string }`

---

## Auth Endpoints (`/api/auth`)

### Get Development Token
- **GET** `/api/auth/dev-token`
- **Description**: Generate a development JWT token (dev only)
- **Authentication**: None (dev environment only)
- **Response**: `{ token: string }`
- **Note**: Only available in non-production environments

### Get Auth Providers
- **GET** `/api/auth/providers`
- **Description**: List available authentication providers
- **Authentication**: None required
- **Response**: 
```json
{
  "providers": {
    "google": {
      "id": "google",
      "name": "Google",
      "type": "oauth",
      "signinUrl": "/api/auth/signin/google",
      "callbackUrl": "/api/auth/callback/google"
    }
  }
}
```

---

## Stock Analyses Endpoints (`/api/stock-analyses`)

All endpoints require authentication and `canViewPosts` permission (viewer role or higher).

### List Stock Analyses
- **GET** `/api/stock-analyses`
- **Query Parameters**:
  - `page` (integer, default: 1): Page number
  - `limit` (integer, default: 20): Items per page
- **Response**: 
```json
{
  "data": {
    "items": [StockAnalysis[]],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### Create Stock Analysis
- **POST** `/api/stock-analyses`
- **Body**:
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "market": "US",
  "csvFilePath": "/path/to/file.csv" // Optional
}
```
- **Response**: `{ data: { stockAnalysis: StockAnalysis } }`
- **Status**: 201 Created

### Get Stock Analysis by ID
- **GET** `/api/stock-analyses/:id`
- **Query Parameters**:
  - `excludeData` (boolean, default: false): Exclude daily factor data and scores
- **Response**: 
```json
{
  "data": {
    "stockAnalysis": {
      ...StockAnalysis,
      "dailyFactorData": [...], // if excludeData=false
      "dailyScores": [...], // if excludeData=false
      "factorTables": [...],
      "results": {...} // Structured analysis results
    }
  }
}
```

### Import CSV Data
- **POST** `/api/stock-analyses/:id/import`
- **Description**: Import CSV data from existing file path to database
- **Response**: `{ success: true, message: string, data: { stockAnalysis: StockAnalysis } }`

### Upload CSV File
- **POST** `/api/stock-analyses/:id/upload`
- **Content-Type**: `multipart/form-data`
- **Body**: Form data with `csvFile` field
- **Description**: Upload CSV file and trigger analysis
- **Response**: `{ success: true, message: string, data: { stockAnalysis: StockAnalysis } }`

### Get Daily Factor Data
- **GET** `/api/stock-analyses/:id/daily-factor-data`
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
- **Description**: Get paginated daily factor data with calculated factors
- **Response**: 
```json
{
  "data": {
    "items": [DailyFactorData[]],
    "pagination": {...}
  }
}
```

### Get Daily Scores
- **GET** `/api/stock-analyses/:id/daily-scores`
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
- **Description**: Get paginated daily scoring data
- **Response**: 
```json
{
  "data": {
    "items": [DailyScore[]],
    "pagination": {...}
  }
}
```

### Perform Full Analysis
- **POST** `/api/stock-analyses/:id/analyze`
- **Description**: Trigger full analysis including factor calculation, scoring, and AI analysis
- **Response**: `{ success: true, message: string, data: {...} }`

---

## Stocks Endpoints (`/api/stocks`)

### Get Stock Price
- **GET** `/api/stocks/price`
- **Query Parameters**:
  - `symbol` (string, required): Stock symbol (e.g., AAPL, VIC)
  - `country` (string, enum: ['US', 'VN'], default: 'US'): Market country code
- **Response**: 
```json
{
  "symbol": "AAPL",
  "price": 150.25,
  "change": 2.50,
  "changePercent": 1.69,
  "volume": 50000000,
  "marketCap": 2500000000000,
  "lastUpdate": "2025-01-05T10:00:00Z"
}
```

---

## Blog Posts Endpoints (`/api/blog-posts`)

All endpoints require authentication. `canViewPosts` permission required for GET, `canCreatePost` permission required for POST.

### List Blog Posts
- **GET** `/api/blog-posts`
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
- **Response**: 
```json
{
  "data": {
    "items": [BlogPost[]],
    "pagination": {...}
  }
}
```

### Create Blog Post
- **POST** `/api/blog-posts`
- **Body**:
```json
{
  "title": "Blog Post Title",
  "subtitle": "Optional subtitle",
  "markdown": "# Content in markdown format"
}
```
- **Required Fields**: `title`, `markdown`
- **Response**: `{ data: { blogPost: BlogPost } }`
- **Status**: 201 Created

---

## Earnings Endpoints (`/api/earnings`)

All endpoints require authentication and `canViewPosts` permission.

### List Earnings Data
- **GET** `/api/earnings`
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
- **Response**: 
```json
{
  "data": {
    "items": [EarningsData[]],
    "pagination": {...}
  }
}
```

### Create Earnings Data
- **POST** `/api/earnings`
- **Body**:
```json
{
  "symbol": "AAPL",
  "company": "Apple Inc.",
  "earningsDate": "2025-01-15",
  "reportType": "quarterly", // or "annual"
  "expectedEPS": 1.50,
  "actualEPS": 1.55,
  "revenue": 1000000000,
  "expectedRevenue": 950000000
}
```
- **Required Fields**: `symbol`, `earningsDate`
- **Response**: `{ data: { earnings: EarningsData } }`
- **Status**: 201 Created

### Sync Earnings from Alpha Vantage
- **POST** `/api/earnings/sync`
- **Body**:
```json
{
  "symbols": ["AAPL", "MSFT", "GOOGL"]
}
```
- **Description**: Trigger background sync of earnings data from Alpha Vantage API
- **Response**: `{ message: "Sync process started" }`
- **Status**: 202 Accepted (async operation)

### Analyze Earnings with AI
- **POST** `/api/earnings/analyze`
- **Body**:
```json
{
  "symbols": ["AAPL"],
  "earningsIds": [1, 2, 3] // Optional
}
```
- **Description**: Trigger AI-powered earnings analysis
- **Response**: `{ message: "Analysis process started" }`
- **Status**: 202 Accepted (async operation)

---

## Users Endpoints (`/api/users`)

All endpoints require authentication and `canManageUsers` permission (admin role only).

### List Users
- **GET** `/api/users`
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
- **Response**: 
```json
{
  "data": {
    "items": [User[]],
    "pagination": {...}
  }
}
```
- **User Fields**: `id`, `email`, `name`, `role`, `createdAt`, `updatedAt`

### Update User Role
- **PUT** `/api/users/role`
- **Body**:
```json
{
  "email": "user@example.com",
  "role": "editor" // enum: ["viewer", "editor", "admin"]
}
```
- **Required Fields**: `email`, `role`
- **Response**: `{ data: { user: User } }`

---

## Workflows Endpoints (`/api/workflows`)

All endpoints require authentication and `canManageWorkflows` permission (editor role or higher).

### List Workflows
- **GET** `/api/workflows`
- **Response**: `{ data: { workflows: Workflow[] } }`

### Create Workflow
- **POST** `/api/workflows`
- **Body**:
```json
{
  "name": "Workflow Name",
  "description": "Optional description",
  "workflow": {...}, // Workflow configuration object
  "trigger": "...", // Optional trigger configuration
  "enabled": true
}
```
- **Required Fields**: `name`, `workflow`
- **Response**: `{ data: { workflow: Workflow } }`
- **Status**: 201 Created

### Update Workflow
- **PUT** `/api/workflows/:id`
- **Body**: Same as POST (all fields optional)
- **Response**: `{ data: { workflow: Workflow } }`

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": {
    "message": "Error description",
    "status": 400,
    "timestamp": "2025-01-05T10:00:00Z"
  }
}
```

### Common Status Codes
- **200**: Success
- **201**: Created
- **202**: Accepted (async operation)
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (missing or invalid authentication)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **500**: Internal Server Error

---

## Pagination

Paginated endpoints return data in this format:

```json
{
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## Role-Based Access Control

### Roles Hierarchy
1. **viewer** (lowest): Can view content
2. **editor**: Can create/edit content and manage workflows
3. **admin** (highest): Full access including user management

### Permission Functions
- `canViewPosts(role)`: viewer, editor, admin
- `canCreatePost(role)`: editor, admin
- `canEditPost(role)`: editor, admin
- `canDeletePost(role)`: admin only
- `canManageWorkflows(role)`: editor, admin
- `canManageUsers(role)`: admin only

---

## Notes

1. **Cookie Authentication**: The backend uses NextAuth JWT tokens extracted from cookies, not Bearer tokens in headers
2. **CORS**: Backend is configured to accept requests from `http://localhost:3000` (or configured CORS_ORIGIN)
3. **Rate Limiting**: 100 requests per 15 minutes per IP
4. **File Uploads**: CSV files are stored in `uploads/` directory
5. **Async Operations**: Some endpoints (earnings sync, analysis) return 202 Accepted and process in background

