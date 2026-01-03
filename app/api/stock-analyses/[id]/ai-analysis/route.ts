import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const analysisId = parseInt(id);
    
    if (isNaN(analysisId)) {
      return NextResponse.json(
        { error: 'Invalid analysis ID' },
        { status: 400 }
      );
    }

    // Get the stock analysis
    const stockAnalysis = await prisma.stockAnalysis.findUnique({
      where: { id: analysisId }
    });

    if (!stockAnalysis) {
      return NextResponse.json(
        { error: 'Stock analysis not found' },
        { status: 404 }
      );
    }

    // Update status to AI processing
    await prisma.stockAnalysis.update({
      where: { id: analysisId },
      data: { status: 'ai_processing' }
    });

    try {
      // Parse analysis results to get data for AI analysis
      const analysisResults = stockAnalysis.analysisResults 
        ? JSON.parse(stockAnalysis.analysisResults) 
        : null;

      if (!analysisResults || !analysisResults.transactions) {
        throw new Error('No transaction data available for AI analysis');
      }

      // Generate AI insights based on the analysis data
      const aiInsights = await generateAIInsights(stockAnalysis.symbol, analysisResults);

      // Update the analysis with AI insights and mark as completed
      const updatedAnalysis = await prisma.stockAnalysis.update({
        where: { id: analysisId },
        data: {
          aiInsights: JSON.stringify({
            summary: aiInsights.summary,
            keyPoints: aiInsights.keyPoints,
            confidence: aiInsights.confidence,
            dataPoints: aiInsights.dataPoints,
            factorsAnalyzed: aiInsights.factorsAnalyzed,
            generatedAt: new Date().toISOString()
          }),
          status: 'ai_completed'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'AI analysis completed successfully',
        analysis: updatedAnalysis,
        insights: aiInsights
      });

    } catch (analysisError) {
      console.error('AI analysis failed:', analysisError);
      
      // Update status to failed
      await prisma.stockAnalysis.update({
        where: { id: analysisId },
        data: { status: 'failed' }
      });

      return NextResponse.json(
        { 
          error: 'AI analysis failed',
          details: analysisError instanceof Error ? analysisError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('AI analysis endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process AI analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function generateAIInsights(symbol: string, analysisResults: any) {
  const { transactions, factorAnalysis, totalDays, minPctChange } = analysisResults;
  
  // Generate comprehensive AI insights
  const insights = [];
  
  // Overall performance insights
  if (transactions && transactions.length > 0) {
    const avgChange = transactions.reduce((sum: number, tx: any) => sum + tx.pctChange, 0) / transactions.length;
    insights.push(`${symbol} showed ${transactions.length} significant price increases of ${minPctChange}% or more over ${totalDays} analyzed days.`);
    insights.push(`The average significant increase was ${avgChange.toFixed(2)}%, indicating strong upward momentum on key days.`);
    
    // Best and worst performing days
    const bestDay = transactions.reduce((best: any, tx: any) => 
      tx.pctChange > best.pctChange ? tx : best, transactions[0]);
    const worstDay = transactions.reduce((worst: any, tx: any) => 
      tx.pctChange < worst.pctChange ? tx : worst, transactions[0]);
    
    insights.push(`The strongest single-day gain was ${bestDay.pctChange}% on ${new Date(bestDay.date).toLocaleDateString()}.`);
    insights.push(`The smallest significant increase was ${worstDay.pctChange}% on ${new Date(worstDay.date).toLocaleDateString()}.`);
  }

  // Factor analysis insights
  if (factorAnalysis && factorAnalysis.summary) {
    const { factorCounts, averageFactorsPerDay } = factorAnalysis.summary;
    const totalFactors = Object.values(factorCounts).reduce((sum: number, count: any) => sum + count, 0);
    
    insights.push(`Analysis identified ${totalFactors} market factors across ${Object.keys(factorCounts).length} categories.`);
    insights.push(`On average, ${averageFactorsPerDay.toFixed(2)} factors influenced significant price movements per day.`);
    
    // Top factors
    const topFactors = Object.entries(factorCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3);
    
    insights.push(`The most influential factors were: ${topFactors.map(([factor, count]: any) => {
      const factorNames: { [key: string]: string } = {
        'volume_spike': 'Volume Spike',
        'ma_cross': 'Moving Average Cross',
        'rsi_oversold': 'RSI Oversold',
        'price_breakout': 'Price Breakout',
        'gap_up': 'Gap Up',
        'news_sentiment': 'News Sentiment'
      };
      return factorNames[factor] || factor;
    }).join(', ')}.`);
  }

  // Correlation insights
  if (factorAnalysis && factorAnalysis.correlation) {
    const bestPerforming = Object.entries(factorAnalysis.correlation)
      .sort((a: any, b: any) => b[1].avgReturn - a[1].avgReturn)
      .slice(0, 3);
    
    if (bestPerforming.length > 0) {
      insights.push(`Factors with highest returns: ${bestPerforming.map(([factor, data]: any) => 
        `${factor} (+${data.avgReturn.toFixed(2)}% avg return)`
      ).join(', ')}.`);
    }
  }

  // Investment recommendation
  insights.push(`Based on the analysis, ${symbol} shows predictable patterns that could be exploited for trading opportunities.`);
  insights.push(`Consider monitoring the identified factors for early signals of future significant price movements.`);
  insights.push(`Risk management remains crucial - not all factor signals result in profitable outcomes.`);

  return {
    summary: insights.join(' '),
    keyPoints: insights,
    confidence: transactions && transactions.length > 5 ? 'high' : 'medium',
    dataPoints: transactions?.length || 0,
    factorsAnalyzed: factorAnalysis ? Object.keys(factorAnalysis.summary?.factorCounts || {}).length : 0
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const analysisId = parseInt(id);
    
    if (isNaN(analysisId)) {
      return NextResponse.json(
        { error: 'Invalid analysis ID' },
        { status: 400 }
      );
    }

    const stockAnalysis = await prisma.stockAnalysis.findUnique({
      where: { id: analysisId },
      select: {
        id: true,
        symbol: true,
        status: true,
        aiInsights: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!stockAnalysis) {
      return NextResponse.json(
        { error: 'Stock analysis not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: stockAnalysis,
      hasAIInsights: !!stockAnalysis.aiInsights,
      status: stockAnalysis.status
    });

  } catch (error) {
    console.error('Get AI analysis status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get AI analysis status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
