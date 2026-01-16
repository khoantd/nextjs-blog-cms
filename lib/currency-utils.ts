/**
 * Currency utilities for stock analysis
 * Handles Vietnamese and US currency formatting
 */

// List of Vietnamese stock symbols
export const VIETNAMESE_STOCKS = [
  'FPT', 'VNM', 'VIC', 'VRE', 'ACB', 'BID', 'CTG', 'HDB', 'MBB', 'TCB', 
  'VCB', 'VGI', 'GAS', 'HPG', 'MSN', 'MWG', 'PLX', 'POW', 'SAB', 'SSI', 
  'STB', 'TPB', 'VCB', 'VHM', 'VIB', 'VIN', 'VJC', 'VLB', 'VND', 'VPB'
];

/**
 * Check if a stock symbol belongs to Vietnamese market
 */
export function isVietnameseStock(symbol: string): boolean {
  return VIETNAMESE_STOCKS.includes(symbol.toUpperCase());
}

/**
 * Format price based on stock symbol (Vietnamese stocks use VND, others use USD)
 * For Vietnamese stocks, multiplies by 1000 as API returns prices in thousands
 */
export function formatPrice(price: number, symbol: string): string {
  if (isVietnameseStock(symbol)) {
    // Vietnamese currency formatting - multiply by 1000 (API returns in thousands)
    // Show up to 2 decimal places, but don't force trailing zeros
    const priceInVND = price * 1000;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(priceInVND);
  } else {
    // US currency formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }
}

/**
 * Get currency code for a stock symbol
 */
export function getCurrencyCode(symbol: string): 'VND' | 'USD' {
  return isVietnameseStock(symbol) ? 'VND' : 'USD';
}
