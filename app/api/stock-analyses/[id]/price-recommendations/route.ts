import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { canCreateStockAnalysis } from '@/lib/auth';
import { generatePriceRecommendations, validatePriceRecommendations, StockAnalysisData } from '@/lib/ai-price-recommendations';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!canCreateStockAnalysis(user.role)) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions to generate price recommendations" },
        { status: 403 }
      );
    }

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

    // Check if analysis results are available
    if (!stockAnalysis.analysisResults) {
      return NextResponse.json(
        { error: 'Stock analysis results not available. Complete the analysis first.' },
        { status: 400 }
      );
    }

    try {
      // Parse analysis results to get data for AI price recommendations
      const analysisResults = JSON.parse(stockAnalysis.analysisResults);

      if (!analysisResults.transactions || analysisResults.transactions.length === 0) {
        return NextResponse.json(
          { error: 'No transaction data available for price recommendations' },
          { status: 400 }
        );
      }

      // Prepare data for AI analysis
      const stockData: StockAnalysisData = {
        symbol: stockAnalysis.symbol,
        transactions: analysisResults.transactions,
        factorAnalysis: analysisResults.factorAnalysis,
        totalDays: analysisResults.totalDays,
        minPctChange: analysisResults.minPctChange,
        currentPrice: stockAnalysis.latestPrice || undefined
      };

      // Generate AI price recommendations
      const recommendations = await generatePriceRecommendations(stockData);

      // Validate the recommendations
      if (!validatePriceRecommendations(recommendations)) {
        throw new Error('Invalid price recommendations generated');
      }

      // Update the analysis with price recommendations
      const updatedAnalysis = await prisma.stockAnalysis.update({
        where: { id: analysisId },
        data: {
          buyPrice: recommendations.buyPrice,
          sellPrice: recommendations.sellPrice,
          priceRecommendations: JSON.stringify({
            ...recommendations,
            generatedAt: new Date().toISOString(),
            analysisId: analysisId,
            symbol: stockAnalysis.symbol
          })
        }
      });

      return NextResponse.json({
        success: true,
        message: 'AI price recommendations generated successfully',
        analysis: {
          id: updatedAnalysis.id,
          symbol: updatedAnalysis.symbol,
          buyPrice: updatedAnalysis.buyPrice,
          sellPrice: updatedAnalysis.sellPrice,
          priceRecommendations: updatedAnalysis.priceRecommendations
        },
        recommendations: {
          buyPrice: recommendations.buyPrice,
          sellPrice: recommendations.sellPrice,
          confidence: recommendations.confidence,
          reasoning: recommendations.reasoning,
          riskFactors: recommendations.riskFactors,
          targetUpside: recommendations.targetUpside,
          stopLoss: recommendations.stopLoss,
          timeHorizon: recommendations.timeHorizon,
          technicalIndicators: recommendations.technicalIndicators,
          fundamentalFactors: recommendations.fundamentalFactors
        }
      });

    } catch (analysisError) {
      console.error('Price recommendation generation failed:', analysisError);

      return NextResponse.json(
        { 
          error: 'Failed to generate price recommendations',
          details: analysisError instanceof Error ? analysisError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Price recommendations endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process price recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!canCreateStockAnalysis(user.role)) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions to view price recommendations" },
        { status: 403 }
      );
    }

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
        buyPrice: true,
        sellPrice: true,
        priceRecommendations: true,
        latestPrice: true,
        updatedAt: true
      }
    });

    if (!stockAnalysis) {
      return NextResponse.json(
        { error: 'Stock analysis not found' },
        { status: 404 }
      );
    }

    let recommendations = null;
    if (stockAnalysis.priceRecommendations) {
      try {
        recommendations = JSON.parse(stockAnalysis.priceRecommendations);
      } catch (parseError) {
        console.error('Error parsing price recommendations:', parseError);
        recommendations = null;
      }
    }

    return NextResponse.json({
      success: true,
      analysis: {
        id: stockAnalysis.id,
        symbol: stockAnalysis.symbol,
        buyPrice: stockAnalysis.buyPrice,
        sellPrice: stockAnalysis.sellPrice,
        currentPrice: stockAnalysis.latestPrice,
        lastUpdated: stockAnalysis.updatedAt
      },
      hasRecommendations: !!stockAnalysis.buyPrice && !!stockAnalysis.sellPrice,
      recommendations: recommendations
    });

  } catch (error) {
    console.error('Get price recommendations error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get price recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
