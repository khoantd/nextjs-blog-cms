# Stock Analysis Duplicate Detection Test

## Test Scenarios

### 1. Same Symbol, Different Date Ranges (Should Allow)
- Upload SNAP data for Jan 2024
- Upload SNAP data for Feb 2024 
- Expected: Both should be allowed as separate analyses

### 2. Same Symbol, Overlapping Date Ranges (Should Prompt)
- Upload SNAP data for Jan 2024
- Upload SNAP data for Jan 15 - Feb 15 2024
- Expected: Should prompt for overwrite due to overlap

### 3. Different Symbols, Same Date Range (Should Allow)
- Upload SNAP data for Jan 2024
- Upload AAPL data for Jan 2024
- Expected: Both should be allowed as different symbols

### 4. Exact Same Data (Should Prompt)
- Upload SNAP data for Jan 2024
- Upload identical SNAP data for Jan 2024
- Expected: Should prompt for overwrite

## Testing Steps

1. Navigate to `/stock-analysis/create`
2. Upload CSV files with different scenarios
3. Verify duplicate detection behavior
4. Test overwrite functionality
5. Confirm new analyses are created when appropriate

## Key Changes Made

1. **API Route**: Updated `/api/stock-analyses/route.ts`
   - Changed from exact JSON comparison to date range overlap detection
   - Extracts date ranges from analysis results
   - Compares date ranges for overlap

2. **Client Component**: Updated `components/stock-analysis-upload.tsx`
   - Enhanced error messages for overlapping data
   - Shows specific date ranges in confirmation dialog

3. **Logic**: Date overlap detection uses:
   - `newRangeEnd < existingStart` OR `newRangeStart > existingEnd` = NO overlap
   - Otherwise = overlap detected

## Benefits

- Allows multiple analyses for same symbol with different time periods
- Prevents data duplication for overlapping periods
- Clear user feedback on conflicts
- Flexible overwrite option when needed
