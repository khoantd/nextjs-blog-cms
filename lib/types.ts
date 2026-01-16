export type UserRole = 'viewer' | 'editor' | 'admin';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
}

export interface StockAnalysis {
  id: number;
  symbol: string;
  name: string | null;
  csvFilePath: string | null;
  status: string;
  analysisResults: string | null;
  aiInsights: string | null;
  latestPrice: number | null;
  priceChange: number | null;
  priceChangePercent: number | null;
  priceUpdatedAt: Date | string | null;
  favorite: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  minPctChange: number;
  buyPrice: number | null;
  sellPrice: number | null;
  priceRecommendations: string | null;
}
