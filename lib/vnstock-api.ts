// Vnstock API Service
// Client-side service for calling vnstock API endpoints via Next.js API routes

import type {
  CompanyOverviewRequest,
  CompanyOverviewResponse,
  ShareholdersRequest,
  ShareholdersResponse,
  OfficersRequest,
  OfficersResponse,
  SubsidiariesRequest,
  SubsidiariesResponse,
  AffiliateRequest,
  AffiliateResponse,
  CompanyNewsRequest,
  CompanyNewsResponse,
  CompanyEventsRequest,
  CompanyEventsResponse,
  BalanceSheetRequest,
  BalanceSheetResponse,
  IncomeStatementRequest,
  IncomeStatementResponse,
  CashFlowRequest,
  CashFlowResponse,
  FinancialRatiosRequest,
  FinancialRatiosResponse,
  TradingStatsRequest,
  TradingStatsResponse,
  SideStatsRequest,
  SideStatsResponse,
  PriceBoardRequest,
  PriceBoardResponse,
  PriceHistoryRequest,
  PriceHistoryResponse,
  ForeignTradeRequest,
  ForeignTradeResponse,
  PropTradeRequest,
  PropTradeResponse,
  InsiderDealRequest,
  InsiderDealResponse,
  OrderStatsRequest,
  OrderStatsResponse,
  DownloadCSVRequest,
  DownloadCSVResponse,
  DownloadMultipleCSVRequest,
  DownloadMultipleCSVResponse,
  LoginRequest,
  RegisterRequest,
  VnstockErrorResponse,
} from './types/vnstock';

/**
 * Base API request function for vnstock endpoints
 */
async function vnstockRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let response: Response;
  
  try {
    response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });
  } catch (fetchError: any) {
    // Handle network errors (connection refused, DNS errors, etc.)
    const errorMessage = fetchError?.message || String(fetchError);
    const isConnectionError = 
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('network') ||
      errorMessage.includes('Failed to fetch');
    
    if (isConnectionError) {
      throw new Error(`Cannot connect to API at ${endpoint}. Please check if the server is running.`);
    }
    
    throw new Error(`Request failed: ${errorMessage}`);
  }

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    
    // Read response body once as text, then try to parse as JSON
    try {
      const responseText = await response.text();
      
      if (responseText) {
        // Try to parse as JSON
        try {
          const errorData = JSON.parse(responseText);
          // Handle different error response formats:
          // - Vnstock API format: { detail: "..." }
          // - Next.js API route format: { error: "..." } or { message: "..." }
          errorDetail = errorData.detail || errorData.error || errorData.message || errorDetail;
        } catch (jsonError) {
          // Not JSON, use text directly
          errorDetail = responseText.length > 200 ? responseText.substring(0, 200) : responseText;
        }
      }
    } catch (readError) {
      // If reading response fails, use status text
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    
    // Provide more context for specific status codes
    if (response.status === 401) {
      throw new Error(`Authentication failed: ${errorDetail}`);
    } else if (response.status === 404) {
      throw new Error(`Endpoint not found: ${errorDetail}`);
    } else if (response.status === 500) {
      throw new Error(`Internal server error: ${errorDetail}`);
    } else if (response.status === 503) {
      throw new Error(`Service unavailable: ${errorDetail}`);
    }
    
    throw new Error(errorDetail);
  }

  // Check content type before parsing
  const contentType = response.headers.get('content-type') || '';
  
  // If content type indicates CSV or plain text, read as text first to provide better error
  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    const text = await response.text();
    throw new Error(`Expected JSON response but received ${contentType}. Response preview: ${text.substring(0, 200)}...`);
  }
  
  try {
    return await response.json();
  } catch (parseError: any) {
    // If JSON parsing fails, provide a helpful error message
    const errorMessage = parseError.message || String(parseError);
    throw new Error(`Failed to parse JSON response from ${endpoint}. The server may have returned non-JSON content. Error: ${errorMessage}`);
  }
}

/**
 * Vnstock API Service Class
 */
export class VnstockApiService {
  private baseUrl: string;

  constructor() {
    // Use Next.js API routes as proxy (client-side)
    this.baseUrl = '/api/vnstock';
  }

  // Authentication Methods
  async login(credentials: LoginRequest) {
    return vnstockRequest(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: RegisterRequest) {
    return vnstockRequest(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser() {
    return vnstockRequest(`${this.baseUrl}/auth/me`, {
      method: 'GET',
    });
  }

  // Company Information Methods
  async getCompanyOverview(request: CompanyOverviewRequest): Promise<CompanyOverviewResponse> {
    return vnstockRequest(`${this.baseUrl}/company/overview`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getShareholders(request: ShareholdersRequest): Promise<ShareholdersResponse> {
    return vnstockRequest(`${this.baseUrl}/company/shareholders`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getOfficers(request: OfficersRequest): Promise<OfficersResponse> {
    return vnstockRequest(`${this.baseUrl}/company/officers`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getSubsidiaries(request: SubsidiariesRequest): Promise<SubsidiariesResponse> {
    return vnstockRequest(`${this.baseUrl}/company/subsidiaries`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getAffiliate(request: AffiliateRequest): Promise<AffiliateResponse> {
    return vnstockRequest(`${this.baseUrl}/company/affiliate`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getCompanyNews(request: CompanyNewsRequest): Promise<CompanyNewsResponse> {
    return vnstockRequest(`${this.baseUrl}/company/news`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getCompanyEvents(request: CompanyEventsRequest): Promise<CompanyEventsResponse> {
    return vnstockRequest(`${this.baseUrl}/company/events`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Financial Information Methods
  async getBalanceSheet(request: BalanceSheetRequest): Promise<BalanceSheetResponse> {
    return vnstockRequest(`${this.baseUrl}/financial/balance-sheet`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getIncomeStatement(request: IncomeStatementRequest): Promise<IncomeStatementResponse> {
    return vnstockRequest(`${this.baseUrl}/financial/income-statement`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getCashFlow(request: CashFlowRequest): Promise<CashFlowResponse> {
    return vnstockRequest(`${this.baseUrl}/financial/cash-flow`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getFinancialRatios(request: FinancialRatiosRequest): Promise<FinancialRatiosResponse> {
    return vnstockRequest(`${this.baseUrl}/financial/ratios`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Trading Data Methods
  async getTradingStats(request: TradingStatsRequest): Promise<TradingStatsResponse> {
    return vnstockRequest(`${this.baseUrl}/trading/stats`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getSideStats(request: SideStatsRequest): Promise<SideStatsResponse> {
    return vnstockRequest(`${this.baseUrl}/trading/side-stats`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getPriceBoard(request: PriceBoardRequest): Promise<PriceBoardResponse> {
    return vnstockRequest(`${this.baseUrl}/trading/price-board`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getPriceHistory(request: PriceHistoryRequest): Promise<PriceHistoryResponse> {
    return vnstockRequest(`${this.baseUrl}/trading/price-history`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getForeignTrade(request: ForeignTradeRequest): Promise<ForeignTradeResponse> {
    return vnstockRequest(`${this.baseUrl}/trading/foreign-trade`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getPropTrade(request: PropTradeRequest): Promise<PropTradeResponse> {
    return vnstockRequest(`${this.baseUrl}/trading/prop-trade`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getInsiderDeal(request: InsiderDealRequest): Promise<InsiderDealResponse> {
    return vnstockRequest(`${this.baseUrl}/trading/insider-deal`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getOrderStats(request: OrderStatsRequest): Promise<OrderStatsResponse> {
    return vnstockRequest(`${this.baseUrl}/trading/order-stats`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // CSV Download Methods
  async downloadCSV(request: DownloadCSVRequest): Promise<DownloadCSVResponse> {
    return vnstockRequest(`${this.baseUrl}/download/csv`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async downloadMultipleCSV(request: DownloadMultipleCSVRequest): Promise<DownloadMultipleCSVResponse> {
    return vnstockRequest(`${this.baseUrl}/download/multiple`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

// Export singleton instance
export const vnstockApi = new VnstockApiService();

// Helper function to transform price history to CSV format
export function vnstockPriceHistoryToCSV(data: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>): string {
  const headers = "Date,Open,High,Low,Close,Volume";
  const rows = data.map((point) =>
    `${point.date},${point.open},${point.high},${point.low},${point.close},${point.volume}`
  );
  return [headers, ...rows].join("\n");
}

// Helper function to transform price board to stock price data
export function priceBoardToStockPrice(
  symbol: string,
  priceBoardData: PriceBoardResponse
): { symbol: string; price: number; change: number; changePercent: number; volume: number; lastUpdate: string } {
  const entry = priceBoardData.data[symbol];
  if (!entry) {
    throw new Error(`No price data found for symbol ${symbol}`);
  }
  
  return {
    symbol: symbol,
    price: entry.price,
    change: entry.change,
    changePercent: entry.change_percent,
    volume: entry.volume,
    lastUpdate: new Date().toISOString(),
  };
}
