import { inngest } from '@/lib/inngest/client';
import { earningsService } from '@/lib/earnings-service';
import { earningsAnalysisService } from '@/lib/earnings-analysis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const earningsDataWorkflow = inngest.createFunction(
  { id: 'earnings-data-workflow' },
  { event: 'earnings/fetch-data' },
  async ({ event, step }) => {
    const { symbols } = event.data;

    const results = await step.run('fetch-earnings-data', async () => {
      const fetchResults = [];
      
      for (const symbol of symbols) {
        try {
          // Fetch earnings data from Alpha Vantage
          const earningsData = await earningsService.getEarningsData(symbol);
          
          // Store in database
          for (const earning of earningsData) {
            const existingRecord = await prisma.earningsData.findUnique({
              where: {
                symbol_earningsDate: {
                  symbol: earning.symbol,
                  earningsDate: earning.earningsDate,
                },
              },
            });

            if (!existingRecord) {
              await prisma.earningsData.create({
                data: {
                  symbol: earning.symbol,
                  company: earning.company,
                  earningsDate: earning.earningsDate,
                  reportType: earning.reportType,
                  expectedEPS: earning.expectedEPS,
                  actualEPS: earning.actualEPS,
                  surprise: earning.surprise,
                  revenue: earning.revenue,
                  expectedRevenue: earning.expectedRevenue,
                },
              });
            }
          }

          fetchResults.push({
            symbol,
            status: 'success',
            dataCount: earningsData.length,
          });
        } catch (error) {
          console.error(`Failed to process ${symbol}:`, error);
          fetchResults.push({
            symbol,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      return fetchResults;
    });

    return {
      success: true,
      message: 'Earnings data fetch completed',
      results,
    };
  }
);

export const earningsAnalysisWorkflow = inngest.createFunction(
  { id: 'earnings-analysis-workflow' },
  { event: 'earnings/analyze-data' },
  async ({ event, step }) => {
    const { symbols, earningsIds } = event.data;

    const targetIds = await step.run('determine-targets', async () => {
      if (earningsIds && Array.isArray(earningsIds)) {
        return earningsIds;
      } else if (symbols && Array.isArray(symbols)) {
        // Find earnings records for these symbols
        const earningsRecords = await prisma.earningsData.findMany({
          where: {
            symbol: {
              in: symbols,
            },
            aiSummary: null, // Only analyze those without AI analysis
          },
          select: {
            id: true,
          },
        });
        
        return earningsRecords.map((record: any) => record.id);
      } else {
        // Analyze all earnings without AI analysis
        const earningsRecords = await prisma.earningsData.findMany({
          where: {
            aiSummary: null,
          },
          select: {
            id: true,
          },
          take: 10, // Limit to prevent excessive API calls
        });
        
        return earningsRecords.map((record: any) => record.id);
      }
    });

    const analysisResults = await step.run('analyze-earnings', async () => {
      const results = [];
      
      for (const id of targetIds) {
        try {
          await earningsAnalysisService.updateEarningsWithAI(id);
          results.push({
            earningsId: id,
            status: 'success',
          });
        } catch (error) {
          console.error(`Failed to analyze earnings ${id}:`, error);
          results.push({
            earningsId: id,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      return results;
    });

    return {
      success: true,
      message: 'Earnings analysis completed',
      analyzed: analysisResults.length,
      results: analysisResults,
    };
  }
);

export const scheduledEarningsWorkflow = inngest.createFunction(
  { 
    id: 'scheduled-earnings-workflow',
    cron: '0 8 * * 1-5', // Run at 8 AM on weekdays
  },
  async ({ step }) => {
    // Get list of symbols to monitor (could be from database or config)
    const monitoredSymbols = await step.run('get-monitored-symbols', async () => {
      // For now, return a default list - this could be dynamic
      return ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'SNAP'];
    });

    // Fetch latest earnings data
    const fetchResults = await step.run('fetch-latest-earnings', async () => {
      const results = [];
      
      for (const symbol of monitoredSymbols) {
        try {
          const earningsData = await earningsService.getEarningsData(symbol);
          
          // Store new earnings data
          for (const earning of earningsData) {
            const existingRecord = await prisma.earningsData.findUnique({
              where: {
                symbol_earningsDate: {
                  symbol: earning.symbol,
                  earningsDate: earning.earningsDate,
                },
              },
            });

            if (!existingRecord) {
              await prisma.earningsData.create({
                data: {
                  symbol: earning.symbol,
                  company: earning.company,
                  earningsDate: earning.earningsDate,
                  reportType: earning.reportType,
                  expectedEPS: earning.expectedEPS,
                  actualEPS: earning.actualEPS,
                  surprise: earning.surprise,
                  revenue: earning.revenue,
                  expectedRevenue: earning.expectedRevenue,
                },
              });
            }
          }

          results.push({
            symbol,
            status: 'success',
            dataCount: earningsData.length,
          });
        } catch (error) {
          console.error(`Failed to fetch earnings for ${symbol}:`, error);
          results.push({
            symbol,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      return results;
    });

    // Trigger analysis for new earnings data
    await step.run('trigger-analysis', async () => {
      // Get newly added earnings (those without AI analysis)
      const newEarnings = await prisma.earningsData.findMany({
        where: {
          symbol: {
            in: monitoredSymbols,
          },
          aiSummary: null,
        },
        select: {
          id: true,
        },
        take: 20, // Limit to prevent excessive API calls
      });

      // Send event to trigger analysis
      if (newEarnings.length > 0) {
        await inngest.send({
          name: 'earnings/analyze-data',
          data: {
            earningsIds: newEarnings.map((record: any) => record.id),
          },
        });
      }

      return {
        triggeredAnalysis: newEarnings.length,
      };
    });

    return {
      success: true,
      message: 'Scheduled earnings workflow completed',
      monitoredSymbols: monitoredSymbols.length,
      fetchResults,
    };
  }
);
