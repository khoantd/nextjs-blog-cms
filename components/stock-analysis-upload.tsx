"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2 } from "lucide-react";
import { StockFactorTable } from "@/components/stock-factor-table";

export function StockAnalysisUpload() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [minPctChange, setMinPctChange] = useState("4.0");
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFactorTable, setShowFactorTable] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Read and store CSV content
      const content = await selectedFile.text();
      setCsvContent(content);
      
      // Auto-extract symbol from filename if not already set
      if (!symbol && selectedFile.name.match(/^([A-Z]+)_/)) {
        const match = selectedFile.name.match(/^([A-Z]+)_/);
        if (match) {
          setSymbol(match[1]);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent, overwrite = false) => {
    e.preventDefault();
    setError(null);

    if (!symbol || !file) {
      setError("Please provide a symbol and upload a CSV file");
      return;
    }

    setIsLoading(true);

    try {
      // Read file content (already stored in csvContent state)
      const content = csvContent;

      // Submit to API
      const response = await fetch("/api/stock-analyses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          name: name || undefined,
          csvContent: content,
          minPctChange: parseFloat(minPctChange),
          overwrite,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));

        // Handle duplicate detection (409 Conflict)
        if (response.status === 409 && errorData.requiresConfirmation) {
          const shouldOverwrite = window.confirm(
            `${errorData.details}\n\nWould you like to:\n- Click "OK" to OVERWRITE the existing data\n- Click "Cancel" to view the existing analysis without uploading`
          );

          if (shouldOverwrite) {
            // Retry with overwrite flag
            setIsLoading(false);
            const overwriteEvent = new Event('submit') as any;
            await handleSubmit(overwriteEvent, true);
            return;
          } else {
            // Navigate to existing analysis
            router.push(`/stock-analysis/${errorData.existingId}`);
            return;
          }
        }

        throw new Error(errorData.error || "Failed to analyze stock data");
      }

      const { data } = await response.json();

      // Navigate to the analysis detail page
      router.push(`/stock-analysis/${data.stockAnalysis.id}`);
    } catch (err) {
      console.error("Error uploading stock analysis:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Upload Stock Data for Analysis</CardTitle>
          <CardDescription>
            Upload a CSV file with stock price data to analyze daily percentage changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="symbol">Stock Symbol *</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g., SNAP, AAPL"
                required
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Company Name (Optional)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Snap Inc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minPctChange">Minimum % Change Threshold</Label>
              <Input
                id="minPctChange"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={minPctChange}
                onChange={(e) => setMinPctChange(e.target.value)}
                placeholder="4.0"
              />
              <p className="text-sm text-muted-foreground">
                Only show days where the closing price increased by at least this percentage
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="csvFile">CSV File *</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                required
              />
              <p className="text-sm text-muted-foreground">
                CSV should contain columns: Date, Open, High, Low, Close, Volume
              </p>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload and Analyze
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Factor Table Section */}
      {csvContent && symbol && (
        <div className="mt-8">
          <StockFactorTable 
            csvContent={csvContent} 
            symbol={symbol}
            minPctChange={parseFloat(minPctChange)}
          />
        </div>
      )}
    </>
  );
}
