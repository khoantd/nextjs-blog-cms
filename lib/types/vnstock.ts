// Vnstock API Type Definitions

export type VnstockSource = "vci" | "tcbs";
export type FinancialPeriod = "quarter" | "year";
export type TradingInterval = "D" | "W" | "M";
export type Language = "vi" | "en";

// Base API Response
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

// Authentication Types
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

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  user_id?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
}

// Company Data Types
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

export interface Subsidiary {
  company_name: string;
  ownership_percentage: number;
  [key: string]: any;
}

export interface CompanyNews {
  title: string;
  date: string;
  url?: string;
  summary?: string;
  [key: string]: any;
}

export interface CompanyEvent {
  event_type: string;
  date: string;
  description: string;
  [key: string]: any;
}

// Company Request Types
export interface CompanyOverviewRequest {
  symbol: string;
  source?: VnstockSource;
  random_agent?: boolean;
  show_log?: boolean;
}

export interface ShareholdersRequest {
  symbol: string;
  source?: VnstockSource;
}

export interface OfficersRequest {
  symbol: string;
  source?: VnstockSource;
  filter_by?: "all" | "current" | "former";
}

export interface SubsidiariesRequest {
  symbol: string;
  source?: VnstockSource;
  filter_by?: "all" | "major";
}

export interface AffiliateRequest {
  symbol: string;
  source?: VnstockSource;
}

export interface CompanyNewsRequest {
  symbol: string;
  source?: VnstockSource;
}

export interface CompanyEventsRequest {
  symbol: string;
  source?: VnstockSource;
}

// Financial Data Types
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
  [key: string]: number | string | undefined;
}

export interface BalanceSheetRequest {
  symbol: string;
  source?: VnstockSource;
  period?: FinancialPeriod;
  lang?: Language;
  dropna?: boolean;
  get_all?: boolean;
  show_log?: boolean;
}

export interface IncomeStatementRequest {
  symbol: string;
  source?: VnstockSource;
  period?: FinancialPeriod;
  lang?: Language;
  dropna?: boolean;
  get_all?: boolean;
  show_log?: boolean;
}

export interface CashFlowRequest {
  symbol: string;
  source?: VnstockSource;
  period?: FinancialPeriod;
  lang?: Language;
  dropna?: boolean;
  get_all?: boolean;
  show_log?: boolean;
}

export interface FinancialRatiosRequest {
  symbol: string;
  source?: VnstockSource;
  period?: FinancialPeriod;
  flatten_columns?: boolean;
  separator?: string;
  get_all?: boolean;
  show_log?: boolean;
}

// Trading Data Types
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

export interface TradingStatsRequest {
  symbol: string;
  source?: VnstockSource;
  start: string; // ISO date: "YYYY-MM-DD"
  end: string; // ISO date: "YYYY-MM-DD"
  limit?: number;
  random_agent?: boolean;
  show_log?: boolean;
}

export interface SideStatsRequest {
  symbol: string;
  source?: VnstockSource;
}

export interface PriceBoardRequest {
  symbols_list: string[];
  source?: VnstockSource;
}

export interface PriceHistoryRequest {
  symbol: string;
  source?: VnstockSource;
  start: string; // ISO date: "YYYY-MM-DD"
  end: string; // ISO date: "YYYY-MM-DD"
  interval?: TradingInterval;
}

export interface ForeignTradeRequest {
  symbol: string;
  source?: VnstockSource;
}

export interface PropTradeRequest {
  symbol: string;
  source?: VnstockSource;
}

export interface InsiderDealRequest {
  symbol: string;
  source?: VnstockSource;
}

export interface OrderStatsRequest {
  symbol: string;
  source?: VnstockSource;
}

// CSV Download Types
export interface DownloadCSVRequest {
  symbol: string;
  start_date: string; // ISO date: "YYYY-MM-DD"
  end_date: string; // ISO date: "YYYY-MM-DD"
  source?: VnstockSource;
  interval?: TradingInterval;
}

export interface DownloadCSVResponse {
  symbol: string;
  csv_content: string;
  start_date: string;
  end_date: string;
  source: string;
}

export interface DownloadMultipleCSVRequest {
  symbols: string[];
  start_date: string;
  end_date: string;
  source?: VnstockSource;
  interval?: TradingInterval;
  combine?: boolean;
}

export interface DownloadMultipleCSVResponse {
  symbols: string[];
  csv_content: string;
  start_date: string;
  end_date: string;
  source: string;
}

// Response Types
export interface CompanyOverviewResponse extends VnstockApiResponse<CompanyOverview> {}
export interface ShareholdersResponse extends VnstockApiResponse<Shareholder[]> {}
export interface OfficersResponse extends VnstockApiResponse<Officer[]> {}
export interface SubsidiariesResponse extends VnstockApiResponse<Subsidiary[]> {}
export interface AffiliateResponse extends VnstockApiResponse<any> {}
export interface CompanyNewsResponse extends VnstockApiResponse<CompanyNews[]> {}
export interface CompanyEventsResponse extends VnstockApiResponse<CompanyEvent[]> {}

export interface BalanceSheetResponse extends VnstockApiResponse<any> {}
export interface IncomeStatementResponse extends VnstockApiResponse<any> {}
export interface CashFlowResponse extends VnstockApiResponse<any> {}
export interface FinancialRatiosResponse extends VnstockApiResponse<any> {}

export interface TradingStatsResponse extends VnstockApiResponse<TradingDataPoint[]> {}
export interface SideStatsResponse extends VnstockApiResponse<any> {}
export interface PriceBoardResponse extends VnstockApiResponse<Record<string, PriceBoardEntry>> {}
export interface PriceHistoryResponse extends VnstockApiResponse<TradingDataPoint[]> {}
export interface ForeignTradeResponse extends VnstockApiResponse<any> {}
export interface PropTradeResponse extends VnstockApiResponse<any> {}
export interface InsiderDealResponse extends VnstockApiResponse<any> {}
export interface OrderStatsResponse extends VnstockApiResponse<any> {}
