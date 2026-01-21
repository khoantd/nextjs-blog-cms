import { StockFactor, FactorAnalysis } from '../stock-factors';

export type StockAnalysisStatus = 'draft' | 'analyzing' | 'completed' | 'factors_ready' | 'failed' | 'processing' | 'factor_failed' | 'ai_processing' | 'ai_completed';

export interface Transaction {
  tx: number;
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  pctChange: number;
  factors?: StockFactor[];
  factorCount?: number;
  // Technical indicators
  ma20?: number;
  ma50?: number;
  ma200?: number;
  rsi?: number;
  // Daily scores
  score?: number;
  aboveThreshold?: boolean;
}

export interface StockAnalysisResult {
  symbol: string;
  totalDays: number;
  transactionsFound: number;
  transactions: Transaction[];
  minPctChange: number;
  factorAnalysis?: {
    analyses: FactorAnalysis[];
    summary: {
      totalDays: number;
      factorCounts: Partial<Record<StockFactor, number>>;
      factorFrequency: Partial<Record<StockFactor, number>>;
      averageFactorsPerDay: number;
    };
    correlation?: Record<StockFactor, {
      correlation: number;
      avgReturn: number;
      occurrences: number;
    }>;
  };
}

export interface StockAnalysis {
  id: number;
  symbol: string;
  market: string | null; // Market identifier (e.g., 'US', 'VN')
  name: string | null;
  csvFilePath: string | null;
  status: StockAnalysisStatus | null;
  analysisResults: string | null; // JSON stringified StockAnalysisResult (legacy)
  results?: StockAnalysisResult | null; // Direct results object from API (preferred)
  aiInsights: string | null;
  latestPrice: number | null;
  priceChange: number | null;
  priceChangePercent: number | null;
  priceUpdatedAt: Date | string | null;
  favorite: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  minPctChange: number;
  // AI-powered price recommendations
  buyPrice: number | null;
  sellPrice: number | null;
  priceRecommendations: string | null; // JSON stringified price recommendations
}

export interface CreateStockAnalysisInput {
  symbol: string;
  name?: string;
  csvContent: string;
  minPctChange?: number;
  market?: string;
  overwrite?: boolean;
  forceCreate?: boolean;
}
