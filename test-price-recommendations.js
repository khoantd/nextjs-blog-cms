const { completion } = require("litellm");

// Test the LiteLLM completion function directly
async function testPriceRecommendations() {
  console.log("Testing price recommendations with LiteLLM...");
  
  const prompt = `
You are an expert financial analyst specializing in technical and fundamental analysis. 
Based on the provided stock data, generate specific buy and sell price recommendations.

STOCK SYMBOL: SNAP
CURRENT PRICE: 15.20
ANALYSIS PERIOD: 30 days
SIGNIFICANT MOVES THRESHOLD: 2%

TRANSACTION DATA (Significant Price Increases):
Date: 2024-12-01, Close: $15.20, Change: +2.5%, Factors: earnings, product_launch
Date: 2024-12-02, Close: $15.55, Change: +2.3%, Factors: market_sentiment, technical_breakout

FACTOR ANALYSIS:
- Total Factors Identified: 5
- Average Factors Per Day: 1.2
- Factor Frequency: {"earnings": 3, "product_launch": 2, "market_sentiment": 4, "technical_breakout": 2}
- Top Performing Factors: earnings: +3.2% avg return, market_sentiment: +2.8% avg return

ANALYSIS REQUIREMENTS:
1. Provide specific BUY and SELL price targets based on technical analysis
2. Consider support/resistance levels from the price data
3. Factor in the identified market factors and their historical performance
4. Include risk management recommendations (stop loss, position sizing considerations)
5. Provide confidence level based on data quality and pattern strength
6. Suggest appropriate time horizon for the recommendations

RESPONSE FORMAT (JSON only):
{
  "buyPrice": <number>,
  "sellPrice": <number>,
  "confidence": "low|medium|high",
  "reasoning": ["<reason 1>", "<reason 2>", "<reason 3>"],
  "riskFactors": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "targetUpside": <percentage>,
  "stopLoss": <number>,
  "timeHorizon": "short|medium|long",
  "technicalIndicators": {
    "support": [<level1>, <level2>],
    "resistance": [<level1>, <level2>],
    "trend": "bullish|bearish|neutral"
  },
  "fundamentalFactors": {
    "sentiment": "positive|negative|neutral",
    "keyDrivers": ["<driver 1>", "<driver 2>"]
  }
}

ANALYSIS GUIDELINES:
- Buy price should be below current price (if available) or near recent support levels
- Sell price should provide reasonable upside potential (15-30% typically)
- Consider the stock's volatility and historical price movements
- Factor in the frequency and impact of identified market factors
- Provide conservative estimates for higher confidence recommendations
- Include realistic stop-loss levels based on recent price action
`;

  try {
    const response = await completion({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert financial analyst providing data-driven stock price recommendations. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      apiKey: process.env.LITELLM_API_KEY || "sk-a2hvYWR1ZTpzay0xMjM0",
      baseUrl: process.env.LITELLM_BASE_URL || "http://khoadue.me:4010",
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    console.log("Raw response:", content);
    
    if (!content) {
      throw new Error('No response content from AI model');
    }

    // Extract JSON from AI response (handle markdown code blocks)
    let jsonContent = content.trim();
    
    // Remove markdown code block wrappers if present
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    console.log("Cleaned JSON:", jsonContent);

    // Parse the JSON response
    const recommendations = JSON.parse(jsonContent);
    console.log("Parsed recommendations:", recommendations);
    
    return recommendations;

  } catch (error) {
    console.error('Error generating price recommendations:', error);
    throw error;
  }
}

// Run the test
testPriceRecommendations()
  .then(result => {
    console.log("✅ Test successful!");
    console.log("Recommendations:", JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  });
