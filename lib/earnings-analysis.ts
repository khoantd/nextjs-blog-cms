export interface EarningsAnalysis {
  aiSummary: string;
  aiSentiment: 'positive' | 'negative' | 'neutral';
  aiKeyPoints: string[];
}

export interface EarningsData {
  id: number;
  symbol: string;
  company?: string | null;
  earningsDate: string | Date;
  reportType: 'quarterly' | 'annual';
  expectedEPS?: number | null;
  actualEPS?: number | null;
  surprise?: number | null;
  revenue?: number | null;
  expectedRevenue?: number | null;
}

export class EarningsAnalysisService {
  /**
   * Trigger earnings analysis via backend API
   * This is a fire-and-forget operation - the backend processes analysis asynchronously
   */
  async triggerAnalysis(symbols?: string[], earningsIds?: number[]): Promise<void> {
    try {
      const response = await fetch('/api/earnings/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          symbols,
          earningsIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Analysis is triggered asynchronously, no immediate result
      return;
    } catch (error) {
      console.error('Failed to trigger earnings analysis:', error);
      throw error;
    }
  }

  /**
   * Fetch earnings data by ID from backend API
   * Note: This fetches from the list endpoint and filters by ID
   * For better performance, consider adding a GET /api/earnings/:id endpoint to the backend
   */
  private async fetchEarningsById(earningsId: number): Promise<EarningsData> {
    try {
      // Fetch from earnings list endpoint and filter by ID
      // Note: Backend doesn't have a direct GET /api/earnings/:id endpoint
      const response = await fetch('/api/earnings?limit=1000', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch earnings: HTTP ${response.status}`);
      }

      const result = await response.json();
      const earningsList = result.data?.items || result.data || [];
      
      const earnings = earningsList.find((e: EarningsData) => e.id === earningsId);
      
      if (!earnings) {
        throw new Error(`Earnings data with ID ${earningsId} not found`);
      }

      return earnings;
    } catch (error) {
      console.error('Failed to fetch earnings data:', error);
      throw error;
    }
  }

  /**
   * Analyze a single earnings record
   * Note: This triggers backend analysis asynchronously. Use triggerAnalysis() for direct control.
   */
  async analyzeEarnings(earningsId: number): Promise<void> {
    return this.triggerAnalysis(undefined, [earningsId]);
  }

  /**
   * Trigger analysis for multiple earnings records
   */
  async analyzeMultipleEarnings(earningsIds: number[]): Promise<void> {
    return this.triggerAnalysis(undefined, earningsIds);
  }

  /**
   * Trigger analysis for multiple symbols
   */
  async analyzeBySymbols(symbols: string[]): Promise<void> {
    return this.triggerAnalysis(symbols);
  }
}

export const earningsAnalysisService = new EarningsAnalysisService();
