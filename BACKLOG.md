# Stock Analysis Enhancement Backlog

## Overview
Implementation plan for enhancing stock analysis with AI-powered earnings, news sentiment, and market factors integration, plus a comprehensive scoring engine and "Today's Hot Stocks" dashboard.

## Features

### 1. Earnings Data Integration with AI

#### Database Schema Extension
```sql
-- Add to existing schema
model EarningsData {
  id              Int      @id @default(autoincrement())
  symbol          String
  company         String?
  earningsDate    DateTime @map("earnings_date")
  reportType      String   // "quarterly", "annual"
  expectedEPS     Float?   @map("expected_eps")
  actualEPS       Float?   @map("actual_eps")
  surprise        Float?   // (actual - expected) / expected
  revenue         Float?
  expectedRevenue Float?   @map("expected_revenue")
  
  // AI-generated insights
  aiSummary       String?  @map("ai_summary")
  aiSentiment     String?  // "positive", "negative", "neutral"
  aiKeyPoints     String?  // JSON array of key points
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  @@unique([symbol, earningsDate])
  @@map("earnings_data")
}
```

#### API Endpoints
- `POST /api/earnings/fetch` - Fetch earnings data from external API
- `POST /api/earnings/analyze` - AI analysis of earnings data
- `GET /api/earnings/[symbol]` - Get earnings history for symbol

#### Implementation Steps
- [ ] **Data Collection Service**: Integrate with earnings API (Alpha Vantage, Yahoo Finance)
- [ ] **AI Analysis Pipeline**: Use GPT-4 to analyze earnings reports and generate insights
- [ ] **Sentiment Analysis**: Extract sentiment from earnings call transcripts
- [ ] **Surprise Calculations**: Calculate earnings surprises and impact

### 2. News Sentiment Analysis Integration

#### Database Schema
```sql
model NewsData {
  id              Int      @id @default(autoincrement())
  symbol          String
  title           String
  content         String?
  source          String?
  url             String?
  publishedAt     DateTime @map("published_at")
  
  // AI analysis results
  sentiment       String   // "positive", "negative", "neutral"
  sentimentScore  Float    @map("sentiment_score") // -1 to 1
  topics          String?  // JSON array of topics
  impact          String?  // "high", "medium", "low"
  aiSummary       String?  @map("ai_summary")
  
  createdAt       DateTime @default(now()) @map("created_at")
  
  @@index([symbol, publishedAt])
  @@map("news_data")
}
```

#### API Endpoints
- `POST /api/news/fetch` - Fetch news for specific symbols
- `POST /api/news/analyze` - AI sentiment analysis
- `GET /api/news/[symbol]` - Get news with sentiment

#### Implementation Steps
- [ ] **News Aggregation**: Integrate with news APIs (NewsAPI, Bloomberg, Reuters)
- [ ] **AI Sentiment Analysis**: Use GPT-4 for nuanced sentiment analysis
- [ ] **Topic Extraction**: Identify key topics and themes
- [ ] **Impact Scoring**: Rate potential market impact

### 3. Market Factors Data Integration

#### Database Schema
```sql
model MarketData {
  id              Int      @id @default(autoincrement())
  date            String   // YYYY-MM-DD
  symbol          String?  // null for market-wide data
  
  // Market indices
  nasdaqClose      Float?   @map("nasdaq_close")
  nasdaqChange     Float?   @map("nasdaq_change")
  sp500Close       Float?   @map("sp500_close")
  sp500Change      Float?   @map("sp500_change")
  
  // Sector data
  sector           String?
  sectorChange     Float?   @map("sector_change")
  
  // Macro indicators
  cpi              Float?
  interestRate     Float?   @map("interest_rate")
  fedDecision      String?  @map("fed_decision")
  
  // AI insights
  aiMarketSummary  String?  @map("ai_market_summary")
  aiOutlook        String?  @map("ai_outlook")
  
  createdAt        DateTime @default(now()) @map("created_at")
  
  @@unique([date, symbol])
  @@map("market_data")
}
```

#### API Endpoints
- `POST /api/market/fetch` - Fetch market data
- `POST /api/market/analyze` - AI market analysis
- `GET /api/market/latest` - Get latest market conditions

#### Implementation Steps
- [ ] **Market Data Collection**: Real-time index and sector data
- [ ] **Macro Indicator Tracking**: CPI, interest rates, Fed decisions
- [ ] **AI Market Analysis**: Generate market summaries and outlooks
- [ ] **Sector Correlation**: Track sector-specific performance

### 4. Comprehensive Scoring Engine

#### Enhanced Scoring Architecture
```typescript
// Extend existing stock-factors.ts
export interface EnhancedFactorConfig extends DailyScoreConfig {
  earningsWeight: number;
  newsWeight: number;
  marketWeight: number;
  aiInsightsWeight: number;
}

export interface AIDrivenScore {
  baseScore: number;
  earningsBoost: number;
  newsBoost: number;
  marketBoost: number;
  aiAdjustment: number;
  finalScore: number;
  confidence: number;
  reasoning: string[];
}
```

#### Implementation Steps
- [ ] **Multi-factor Integration**: Combine earnings, news, and market data
- [ ] **AI Weight Optimization**: Use ML to optimize factor weights
- [ ] **Dynamic Thresholds**: Adjust thresholds based on market conditions
- [ ] **Confidence Scoring**: Add confidence intervals to predictions
- [ ] **Backtesting Framework**: Historical performance analysis

### 5. User Interaction & Edit Features Enhancement

#### 5.1 Analysis Configuration Panel
**Current State**: Basic upload form with symbol, name, and threshold
**Enhancement**: Add comprehensive configuration options

```typescript
interface AnalysisConfig {
  // Existing
  symbol: string;
  name?: string;
  minPctChange: number;
  
  // New editable parameters
  factorWeights: {
    volume_spike: number;
    break_ma50: number;
    break_ma200: number;
    rsi_over_60: number;
    market_up: number;
    sector_up: number;
    earnings_window: number;
    news_positive: number;
    short_covering: number;
    macro_tailwind: number;
  };
  technicalIndicators: {
    rsiPeriod: number;
    ma20Period: number;
    ma50Period: number;
    ma200Period: number;
  };
  scoringThreshold: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}
```

**UI Components to Add**:
- [ ] **Weight Sliders**: Interactive sliders for factor weights (0-100%)
- [ ] **Technical Indicator Settings**: Editable periods for RSI and MAs
- [ ] **Date Range Picker**: Start/end date selection for analysis
- [ ] **Threshold Controls**: Adjustable scoring thresholds
- [ ] **Save Configuration**: Named configuration presets

#### 5.2 Factor Table Editor
**Current State**: Read-only factor display with generate/regenerate buttons
**Enhancement**: Interactive factor editing capabilities

```typescript
interface EditableFactor {
  transactionId: number;
  date: string;
  factors: {
    [key: string]: {
      value: number | null;
      source: 'ai' | 'user' | 'technical';
      confidence: number;
      notes?: string;
    };
  };
  userNotes?: string;
  tags?: string[];
}
```

**UI Components to Add**:
- [ ] **Factor Override Toggles**: Switch AI factors on/off
- [ ] **Manual Factor Input**: Add custom factors with weights
- [ ] **Batch Edit Mode**: Select multiple transactions for bulk editing
- [ ] **Factor Notes**: Add comments to specific factor detections
- [ ] **Confidence Indicators**: Visual confidence scores for AI factors
- [ ] **Factor History**: Track changes and revert options

#### 5.3 Interactive Chart Controls
**Current State**: Basic price and volume charts
**Enhancement**: Comprehensive chart customization

```typescript
interface ChartConfig {
  chartType: 'line' | 'candlestick' | 'area' | 'bar';
  timePeriod: '1M' | '3M' | '6M' | '1Y' | 'ALL';
  indicators: {
    ma20: boolean;
    ma50: boolean;
    ma200: boolean;
    volume: boolean;
    rsi: boolean;
  };
  factorHighlighting: {
    enabled: boolean;
    selectedFactors: string[];
    opacity: number;
  };
  annotations: {
    enabled: boolean;
    userNotes: Array<{
      date: string;
      note: string;
      type: 'event' | 'insight' | 'alert';
    }>;
  };
}
```

**UI Components to Add**:
- [ ] **Chart Type Selector**: Switch between chart types
- [ ] **Time Period Controls**: Quick period selection buttons
- [ ] **Indicator Toggles**: Show/hide technical indicators
- [ ] **Factor Highlighting**: Click factors to highlight on chart
- [ ] **Chart Annotations**: Add notes and markers to charts
- [ ] **Export Options**: Save charts as images or data

#### 5.4 Prediction Configuration Panel
**Current State**: Read-only predictions with fixed parameters
**Enhancement**: User-configurable prediction system

```typescript
interface PredictionConfig {
  modelWeights: Partial<Record<StockFactor, number>>;
  confidenceThreshold: number;
  predictionDate: string;
  scenarioFactors: {
    [key: string]: boolean | null; // null = use AI, boolean = user override
  };
  whatIfScenarios: Array<{
    name: string;
    factorOverrides: Partial<Record<StockFactor, boolean>>;
    description: string;
  }>;
}
```

**UI Components to Add**:
- [ ] **Model Weight Editor**: Adjust prediction algorithm weights
- [ ] **Confidence Threshold Slider**: Set minimum confidence for predictions
- [ ] **Custom Date Prediction**: Analyze specific future dates
- [ ] **Factor Scenario Builder**: Enable/disable factors for analysis
- [ ] **What-If Analysis**: Create and compare different scenarios
- [ ] **Prediction Comparison**: Side-by-side scenario results

#### 5.5 Analysis Notes & Annotations
**Current State**: No user annotation capability
**Enhancement**: Comprehensive note-taking system

```typescript
interface AnalysisAnnotations {
  overallNotes: string;
  transactionNotes: Array<{
    transactionId: number;
    note: string;
    category: 'insight' | 'question' | 'strategy' | 'correction';
    createdAt: Date;
  }>;
  factorCorrections: Array<{
    transactionId: number;
    factor: string;
    originalValue: number | null;
    correctedValue: number;
    reason: string;
  }>;
  strategyNotes: Array<{
    title: string;
    description: string;
    applicableFactors: string[];
    successRate?: number;
  }>;
}
```

**UI Components to Add**:
- [ ] **Analysis Notes Editor**: Rich text editor for overall observations
- [ ] **Transaction Tags**: Categorize significant price movements
- [ ] **Factor Correction Interface**: Flag and correct incorrect detections
- [ ] **Strategy Documentation**: Document trading strategies based on analysis
- [ ] **Note Search & Filter**: Find and filter annotations
- [ ] **Collaborative Notes**: Multiple user contributions (future)

#### 5.6 Enhanced Export & Sharing
**Current State**: Basic JSON export
**Enhancement**: Comprehensive export and sharing system

```typescript
interface ExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'excel';
  sections: {
    basicData: boolean;
    factorAnalysis: boolean;
    charts: boolean;
    predictions: boolean;
    notes: boolean;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
  customization: {
    includeCompanyBranding: boolean;
    watermark: string;
    chartResolution: 'low' | 'medium' | 'high';
  };
}

interface SharingOptions {
  shareType: 'public' | 'private' | 'team';
  permissions: {
    canView: boolean;
    canExport: boolean;
    canComment: boolean;
    canEdit: boolean;
  };
  expiresAt?: Date;
  password?: string;
}
```

**UI Components to Add**:
- [ ] **Custom Report Builder**: Select specific data points for export
- [ ] **Chart Image Export**: Save charts as PNG/SVG
- [ ] **PDF Report Generation**: Professional formatted reports
- [ ] **Shareable Links**: Generate links with customizable permissions
- [ ] **Scheduled Reports**: Set up recurring automated reports
- [ ] **Export Templates**: Save and reuse export configurations

### 6. "Today's Hot Stocks" App Flow

#### User Interface Design
```
Dashboard Layout:
┌─────────────────────────────────────────────────┐
│ 📈 Today's Hot Stocks - [Date]                   │
├─────────────────────────────────────────────────┤
│ 🔥 Top Picks (Score > 75%)                      │
│ ┌─────────┬─────────┬─────────┬─────────┐       │
│ │ Symbol  │ Score   │ News    │ Action  │       │
│ └─────────┴─────────┴─────────┴─────────┘       │
├─────────────────────────────────────────────────┤
│ 📊 Market Overview                              │
│ ┌─────────┬─────────┬─────────┬─────────┐       │
│ │ Index   │ Change  │ Sentiment│ Outlook │       │
│ └─────────┴─────────┴─────────┴─────────┘       │
├─────────────────────────────────────────────────┤
│ 📰 Breaking News Impact                          │
│ ┌─────────┬─────────┬─────────┬─────────┐       │
│ │ Stock   │ News    │ Impact  │ Time    │       │
│ └─────────┴─────────┴─────────┴─────────┘       │
└─────────────────────────────────────────────────┘
```

#### Implementation Steps
- [ ] **Real-time Dashboard**: Live scoring and updates
- [ ] **Alert System**: Notifications for scoring changes
- [ ] **Watchlist Integration**: Personalized stock tracking
- [ ] **Historical Performance**: Track prediction accuracy
- [ ] **Mobile Responsive**: Optimized for mobile devices

## Implementation Timeline

### Phase 1 (Week 1-2): Foundation & User Interaction
- [ ] Database schema updates
- [ ] **Analysis Configuration Panel** - Weight sliders, technical indicator settings
- [ ] **Factor Table Editor** - Basic factor override capabilities
- [ ] Basic earnings data integration
- [ ] News aggregation setup
- [ ] Market data collection foundation

### Phase 2 (Week 3-4): AI Integration & Advanced Editing
- [ ] AI sentiment analysis pipeline
- [ ] **Interactive Chart Controls** - Chart customization and annotations
- [ ] **Enhanced Factor Editor** - Batch editing, confidence indicators
- [ ] Earnings insights generation
- [ ] Market analysis AI
- [ ] Factor weight optimization

### Phase 3 (Week 5-6): Scoring Engine & Predictions
- [ ] Enhanced scoring algorithm
- [ ] **Prediction Configuration Panel** - Model weights, what-if scenarios
- [ ] **Analysis Notes System** - Annotations, corrections, strategy notes
- [ ] Multi-factor integration
- [ ] Dynamic thresholds
- [ ] Confidence scoring

### Phase 4 (Week 7-8): UI, Dashboard & Export
- [ ] "Today's Hot Stocks" interface
- [ ] **Enhanced Export & Sharing** - Custom reports, PDF generation, sharing
- [ ] Real-time updates
- [ ] Alert system
- [ ] Performance optimization
- [ ] Mobile responsiveness

## Technical Requirements

### External APIs Needed
- **Earnings**: Alpha Vantage, Yahoo Finance Earnings API
- **News**: NewsAPI, Bloomberg Terminal API
- **Market Data**: Polygon.io, IEX Cloud
- **AI**: OpenAI GPT-4 for analysis

### Infrastructure
- **Background Jobs**: Inngest for data processing
- **Caching**: Redis for real-time data
- **Database**: Extended Prisma schema
- **Monitoring**: Error tracking and performance metrics

### Dependencies to Add
```json
{
  "redis": "^4.6.0",
  "@redis/client": "^1.5.0",
  "alpha-vantage": "^2.4.1",
  "newsapi": "^2.4.1",
  "polygon.io": "^3.0.0",
  "node-cron": "^3.0.3",
  "jspdf": "^2.5.1",
  "html2canvas": "^1.4.1",
  "xlsx": "^0.18.5",
  "react-chartjs-2": "^5.2.0",
  "chartjs-adapter-date-fns": "^3.0.0",
  "react-draggable": "^4.4.6",
  "react-select": "^5.7.3",
  "react-slider": "^2.0.6",
  "@types/react-slider": "^2.0.6"
}
```

### New UI Components Required
```typescript
// Enhanced form components
- WeightSlider: Interactive factor weight adjustment
- DateRangePicker: Start/end date selection
- ConfigurationPresets: Save/load named configurations

// Factor editing components  
- FactorToggle: On/off switches for factors
- BatchEditSelector: Multi-select for transactions
- ConfidenceIndicator: Visual confidence scores
- FactorNotes: Inline note editing

// Chart enhancement components
- ChartTypeSelector: Chart type switcher
- IndicatorControls: Technical indicator toggles
- FactorHighlighter: Click-to-highlight factors
- ChartAnnotation: Add notes/markers to charts

// Prediction components
- ModelWeightEditor: Adjust prediction weights
- ScenarioBuilder: What-if analysis builder
- ConfidenceThreshold: Minimum confidence slider
- PredictionComparison: Side-by-side results

// Notes & annotation components
- RichTextEditor: Markdown/RTF note editor
- TagManager: Transaction categorization
- CorrectionInterface: Factor correction UI
- StrategyDocumentation: Trading strategy notes

// Export & sharing components
- ReportBuilder: Custom report selection
- ExportFormatSelector: Multiple format options
- ShareDialog: Permission-based sharing
- ScheduledReports: Recurring report setup
```

## Success Metrics

### Technical Metrics
- API response time < 500ms
- Real-time data refresh < 30 seconds
- Scoring accuracy > 75%
- System uptime > 99.9%

### Business Metrics
- User engagement with dashboard
- Prediction accuracy tracking
- Alert response rates
- Feature adoption rates
- **User Edit Interaction**: Track usage of new editing features
- **Configuration Saves**: Number of saved custom configurations
- **Export Usage**: Frequency and types of exports
- **Note Creation**: Volume of user annotations and corrections

## Risks & Mitigations

### Technical Risks
- **API Rate Limits**: Implement caching and fallback data sources
- **Data Quality**: Add validation and error handling
- **Performance**: Use Redis caching and database optimization
- **UI Complexity**: Implement progressive disclosure and user onboarding
- **Edit Conflicts**: Handle concurrent user edits with locking/versioning

### Business Risks
- **API Costs**: Monitor usage and implement cost controls
- **Data Accuracy**: Multiple data sources for validation
- **User Adoption**: Gradual rollout and user feedback
- **Feature Overload**: Prioritize features based on user feedback
- **Edit Data Integrity**: Maintain audit trails for user changes

## Next Steps

1. **Immediate Actions**:
   - Set up external API accounts
   - Create development environment
   - Begin database schema implementation

2. **Week 1 Priorities**:
   - Database migrations
   - Basic API endpoints
   - Initial data collection
   - **Analysis Configuration Panel** - Implement weight sliders and basic settings
   - **Factor Table Editor** - Add basic factor override functionality

3. **Review Points**:
   - End of Phase 1: Foundation and basic user interaction review
   - End of Phase 2: AI integration and advanced editing review
   - End of Phase 4: Final user acceptance testing with all editing features

## Priority Matrix

### High Priority (Week 1-2)
- **Analysis Configuration Panel** - Core user customization
- **Factor Table Editor** - Basic factor editing capabilities
- **Interactive Chart Controls** - Essential for data visualization
- **Enhanced Export** - Basic PDF/CSV export functionality

### Medium Priority (Week 3-4)
- **Prediction Configuration** - Advanced user scenarios
- **Analysis Notes System** - User annotations and corrections
- **Batch Editing** - Power user features
- **Sharing System** - Collaboration features

### Low Priority (Week 5-8)
- **Advanced Chart Annotations** - Nice-to-have features
- **Scheduled Reports** - Automation features
- **Collaborative Notes** - Multi-user features
- **Custom Report Templates** - Advanced customization

---

## 7. UX/UI Improvements for Unified Factor Flow

### Status: High Priority - Required for New Data Flow

#### 7.1 Enhanced Status Indicators
- **New Status States**:
  - `processing` - Factor generation in progress (blue, animated)
  - `factor_failed` - Analysis succeeded but factors failed (orange)
  - `ai_processing` - AI analysis in progress (purple, animated)
  - `ai_completed` - AI analysis completed (emerald)
- **Visual Indicators**: Animated badges, progress bars, toast notifications
- **Real-time Updates**: WebSocket or polling for status changes

#### 7.2 Data Quality Dashboard Component
```typescript
// New component to display:
- Technical indicators calculation status
- Factor data completeness percentage
- Daily scoring availability
- AI analysis progress
- Error states with troubleshooting steps
```

#### 7.3 Enhanced Tab Organization
**Current**: Data | Chart | Factor Analysis | Daily Scoring | Earnings
**Proposed**: 
1. **Overview** - Status dashboard + data quality metrics
2. **Data** - Transaction data (existing)
3. **Chart** - Price charts (existing) 
4. **Factor Analysis** - Enhanced with technical indicators
5. **Daily Scoring** - Enhanced with real-time data
6. **Earnings** - From backlog
7. **AI Insights** - New tab for AI-generated content

#### 7.4 Progress Indicators
- **Factor Generation Progress**: Real-time progress bars during `processing` state
- **Loading States**: Skeleton loaders for each tab during data generation
- **Completion Notifications**: Success/error toasts with actionable options

#### 7.5 Error Handling & Recovery UI
- **Error Details Panel**: Show specific error messages and troubleshooting steps
- **Retry Mechanisms**: One-click retry for failed factor generation
- **Manual Triggers**: Options to manually start factor generation or AI analysis
- **Fallback Options**: Alternative data sources when primary fails

#### 7.6 Enhanced Factor Table
- **Technical Indicators Display**: Show MA20, MA50, MA200, RSI values
- **Factor Confidence Scores**: Visual indicators of calculation reliability
- **Data Source Labels**: Distinguish between calculated vs AI-generated factors
- **Export Options**: Download factor data in various formats

#### 7.7 Real-time Status Updates
```typescript
// Implementation options:
- WebSocket connections for live updates
- Polling every 2-3 seconds during processing
- Server-sent events for status changes
- Optimistic UI updates with rollback on error
```

### Implementation Priority

#### **Phase 1: Critical (Immediate)**
- [ ] **Status Badge Updates** - Handle new processing states
- [ ] **Loading States** - Show progress during factor generation  
- [ ] **Error UI** - Display factor_failed state with retry options
- [ ] **Basic Progress Bar** - Simple progress indication

#### **Phase 2: Enhanced Experience (Next Sprint)**
- [ ] **Data Quality Dashboard** - Comprehensive status component
- [ ] **Real-time Updates** - WebSocket/polling implementation
- [ ] **Enhanced Factor Table** - Show technical indicators
- [ ] **Tab Reorganization** - Add Overview tab, reorder existing

#### **Phase 3: Advanced Features (Future)**
- [ ] **AI Insights Tab** - Dedicated AI analysis interface
- [ ] **News Sentiment UI** - From backlog integration
- [ ] **Market Factors Visualization** - Enhanced charts and graphs
- [ ] **Export & Sharing** - Download and share analysis results

### User Experience Improvements

#### **Before Current Issues:**
- Users unaware factor generation was needed
- No indication of data quality/completeness  
- Manual API calls required for complete analysis
- Poor error visibility and recovery options

#### **After Improvements:**
- **Automatic Processing** with clear progress indication
- **Data Quality Transparency** at a glance
- **One-Click Analysis** from upload to completion
- **Graceful Error Handling** with recovery options
- **Real-time Feedback** throughout the process

### Technical Requirements

#### **Frontend Changes:**
- Update `StockAnalysisDetail` component with new status handling
- Create `DataQualityDashboard` component
- Add WebSocket client for real-time updates
- Implement loading states and error boundaries
- Enhance factor table with technical indicators

#### **Backend Changes:**
- Add WebSocket server for status updates
- Implement progress tracking in factor generation
- Enhanced error reporting with user-friendly messages
- Add retry mechanisms for failed operations

#### **Database Considerations:**
- Add progress tracking fields to stock_analysis table
- Consider adding analysis_logs table for debugging
- Index updates for better performance

---

*Last Updated: January 3, 2026*
*Status: Planning Phase - Enhanced with User Interaction Features*
