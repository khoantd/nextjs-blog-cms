import { PrismaClient } from '@prisma/client';
import { completion } from 'litellm';

const prisma = new PrismaClient();

export interface EarningsAnalysis {
  aiSummary: string;
  aiSentiment: 'positive' | 'negative' | 'neutral';
  aiKeyPoints: string[];
}

export class EarningsAnalysisService {
  async analyzeEarnings(earningsId: number): Promise<EarningsAnalysis> {
    const earnings = await prisma.earningsData.findUnique({
      where: { id: earningsId },
    });

    if (!earnings) {
      throw new Error('Earnings data not found');
    }

    const prompt = this.createAnalysisPrompt(earnings);
    
    try {
      const response = await completion({
        model: process.env["OPENAI_MODEL"] || "gpt-4o-mini",
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst specializing in earnings analysis. Provide concise, data-driven insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        apiKey: process.env["LITELLM_API_KEY"] || process.env["OPENAI_API_KEY"],
        baseUrl: process.env["LITELLM_BASE_URL"],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      return this.parseAIResponse(content);
    } catch (error) {
      console.error('AI API error:', error);
      throw new Error('Failed to analyze earnings with AI');
    }
  }

  private createAnalysisPrompt(earnings: any): string {
    const surpriseInfo = earnings.surprise 
      ? `Earnings surprise: ${(earnings.surprise * 100).toFixed(2)}%`
      : 'No earnings surprise data available';

    const revenueInfo = earnings.revenue && earnings.expectedRevenue
      ? `Revenue: $${earnings.revenue.toLocaleString()}M vs Expected: $${earnings.expectedRevenue.toLocaleString()}M`
      : 'No revenue comparison data available';

    return `
Analyze the following earnings data for ${earnings.company} (${earnings.symbol}):

Report Type: ${earnings.reportType}
Earnings Date: ${earnings.earningsDate.toLocaleDateString()}
Expected EPS: ${earnings.expectedEPS || 'N/A'}
Actual EPS: ${earnings.actualEPS || 'N/A'}
${surpriseInfo}
${revenueInfo}

Please provide:
1. A concise summary (2-3 sentences) of the earnings performance
2. Overall sentiment (positive, negative, or neutral)
3. 3-5 key bullet points highlighting the most important aspects

Focus on:
- EPS performance vs expectations
- Revenue performance if available
- Any significant surprises
- Overall business health indicators
- Market implications

Respond in JSON format:
{
  "summary": "Your summary here",
  "sentiment": "positive/negative/neutral",
  "keyPoints": ["Point 1", "Point 2", "Point 3"]
}
`;
  }

  private parseAIResponse(response: string): EarningsAnalysis {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        aiSummary: parsed.summary || 'No summary available',
        aiSentiment: this.validateSentiment(parsed.sentiment),
        aiKeyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      
      // Fallback parsing
      return {
        aiSummary: response.substring(0, 200) + '...',
        aiSentiment: 'neutral',
        aiKeyPoints: ['AI analysis available'],
      };
    }
  }

  private validateSentiment(sentiment: string): 'positive' | 'negative' | 'neutral' {
    const validSentiments = ['positive', 'negative', 'neutral'];
    return validSentiments.includes(sentiment.toLowerCase()) 
      ? sentiment.toLowerCase() as 'positive' | 'negative' | 'neutral'
      : 'neutral';
  }

  async analyzeMultipleEarnings(earningsIds: number[]): Promise<Map<number, EarningsAnalysis>> {
    const results = new Map<number, EarningsAnalysis>();
    
    for (const id of earningsIds) {
      try {
        const analysis = await this.analyzeEarnings(id);
        results.set(id, analysis);
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to analyze earnings ${id}:`, error);
        
        // Add fallback analysis
        results.set(id, {
          aiSummary: 'Analysis failed',
          aiSentiment: 'neutral',
          aiKeyPoints: ['AI analysis unavailable'],
        });
      }
    }
    
    return results;
  }

  async updateEarningsWithAI(earningsId: number): Promise<void> {
    const analysis = await this.analyzeEarnings(earningsId);
    
    await prisma.earningsData.update({
      where: { id: earningsId },
      data: {
        aiSummary: analysis.aiSummary,
        aiSentiment: analysis.aiSentiment,
        aiKeyPoints: JSON.stringify(analysis.aiKeyPoints),
      },
    });
  }
}

export const earningsAnalysisService = new EarningsAnalysisService();
