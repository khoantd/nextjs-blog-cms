import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // In a real implementation, you would fetch the stock analysis from the database
    // to get the CSV file path. For now, we'll assume a standard path structure.
    
    // This is a simplified approach - in production you'd:
    // 1. Fetch the stock analysis from database using the ID
    // 2. Get the csvFilePath from the analysis record
    // 3. Read the actual file
    
    // For demo purposes, we'll try to read from a common uploads directory
    const possiblePaths = [
      join(process.cwd(), 'uploads', `stock-analysis-${id}.csv`),
      join(process.cwd(), 'public', 'uploads', `stock-analysis-${id}.csv`),
      join(process.cwd(), 'data', `${id}.csv`),
    ];

    let csvContent = null;
    let fileFound = false;

    for (const filePath of possiblePaths) {
      try {
        const content = await readFile(filePath, 'utf-8');
        csvContent = content;
        fileFound = true;
        break;
      } catch (error) {
        // File doesn't exist at this path, try the next one
        continue;
      }
    }

    if (!fileFound) {
      return NextResponse.json(
        { error: 'CSV file not found for this analysis' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      csvContent
    });

  } catch (error) {
    console.error('Error fetching CSV content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CSV content' },
      { status: 500 }
    );
  }
}
