import * as dfd from "danfojs-node";

/**
 * Analyze stock data using Danfo.js (pandas-like API for JavaScript)
 * This is a direct port of the Python pandas code
 */
export async function analyzeStockData(csvFilePath: string) {
  // Load data (equivalent to pd.read_csv)
  const df = await dfd.readCSV(csvFilePath);

  // Ensure Date is datetime format (convert to ISO strings for compatibility)
  const dateColumn = df['Date'];
  const dateValues = dateColumn.values as string[];
  const formattedDates = dateValues.map((val: string) => new Date(val).toISOString());
  df.addColumn('Date', formattedDates, { inplace: true });

  // Sort by date in ascending order (equivalent to df.sort_values('Date'))
  const sortedDf = df.sortValues('Date', { ascending: true });

  // Calculate % change day by day (close to close)
  // Manual calculation since pctChange() might not be available on Series
  const closeValues = sortedDf['Close'].values as number[];
  const pctChangeValues = [NaN]; // First value has no previous value
  for (let i = 1; i < closeValues.length; i++) {
    const pctChange = ((closeValues[i] - closeValues[i - 1]) / closeValues[i - 1]) * 100;
    pctChangeValues.push(pctChange);
  }
  sortedDf.addColumn('pct_change', pctChangeValues, { inplace: true });

  // Filter rows where pct_change >= 4
  const pctChangeCol = sortedDf['pct_change'].values as number[];
  const mask = pctChangeCol.map(val => !isNaN(val) && val >= 4);
  const tx = sortedDf.iloc({ rows: mask.map((val, idx) => val ? idx : -1).filter(idx => idx >= 0) });

  // Add Tx column (transaction number)
  const txNumbers = Array.from({ length: tx.shape[0] }, (_, i) => i + 1);
  tx.addColumn('Tx', txNumbers, { inplace: true });

  // Print selected columns
  const resultDf = tx.loc({ columns: ['Tx', 'Date', 'Close', 'pct_change'] });
  console.log(resultDf.toString());

  return tx;
}

/**
 * Create factor table for each transaction (Tx)
 * Equivalent to the Python code that creates factor_rows DataFrame
 */
export async function createFactorTable(tx: dfd.DataFrame, df: dfd.DataFrame) {
  const factorRows: any[] = [];

  // Get the data as arrays for easier manipulation
  const txData = tx.toDict() as any;
  const dfData = df.toDict() as any;
  
  // Iterate through each transaction
  for (let i = 0; i < tx.shape[0]; i++) {
    const txDate = txData['Date'][i];
    const txValue = txData['Tx'][i];
    
    // Find the corresponding row in the main dataframe
    const dfIndex = dfData['Date'].findIndex((date: string) => date === txDate);
    
    if (dfIndex !== -1) {
      factorRows.push({
        "Tx": txValue,
        "Date": txDate,
        "volume_spike": parseInt(dfData['volume_spike'][dfIndex]) || 0,
        "break_ma50": dfData['Close'][dfIndex] > dfData['MA50'][dfIndex] ? 1 : 0,
        "break_ma200": dfData['Close'][dfIndex] > dfData['MA200'][dfIndex] ? 1 : 0,
        "rsi_over_60": parseInt(dfData['rsi_over_60'][dfIndex]) || 0,
        // Các yếu tố dưới sẽ gán sau bằng AI / API
        "market_up": null,
        "sector_up": null,
        "earnings_window": null,
        "news_positive": null,
        "short_covering": null,
        "macro_tailwind": null
      });
    }
  }

  // Create DataFrame from factor rows
  const factorDf = new dfd.DataFrame(factorRows);
  
  // Print first few rows (equivalent to factor_df.head())
  console.log(factorDf.head().toString());
  
  return factorDf;
}

// Example usage:
// createFactorTable(tx, df).then(result => {
//   console.log('Factor table created');
// });
