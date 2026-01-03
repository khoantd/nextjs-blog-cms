"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, Info } from "lucide-react";

export function StockAnalysisUpload() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [minPctChange, setMinPctChange] = useState("4.0");
  const [market, setMarket] = useState<string>("us");
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      
      // For Vietnamese market, also extract from ticket column if present
      if (market === "vietnamese" && !symbol) {
        // Try to read first few lines to extract ticket symbol
        const lines = content.split('\n');
        if (lines.length > 1) {
          const firstDataRow = lines[1].split(',');
          if (firstDataRow.length > 1) {
            const ticketSymbol = firstDataRow[1]; // ticket is second column
            if (ticketSymbol && /^[A-Z]{3,4}$/.test(ticketSymbol)) {
              setSymbol(ticketSymbol);
            }
          }
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
          market,
          overwrite,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));

        // Handle overlapping data detection (409 Conflict)
        if (response.status === 409 && errorData.requiresConfirmation) {
          const dateRange = errorData.dateRange;
          const message = dateRange 
            ? `${errorData.details}\n\nWould you like to:\n- Click "OK" to OVERWRITE the overlapping data\n- Click "Cancel" to view the existing analysis without uploading`
            : `${errorData.details}\n\nWould you like to:\n- Click "OK" to OVERWRITE the existing data\n- Click "Cancel" to view the existing analysis without uploading`;
          
          const shouldOverwrite = window.confirm(message);

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
              <Label htmlFor="market">Market *</Label>
              <Select value={market} onValueChange={setMarket}>
                <SelectTrigger>
                  <SelectValue placeholder="Select market" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">US Market</SelectItem>
                  <SelectItem value="vietnamese">Vietnamese Market</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose the market where your stock data is from
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">Stock Symbol *</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder={market === "vietnamese" ? "e.g., TCB, VNM" : "e.g., SNAP, AAPL"}
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
                placeholder={market === "vietnamese" ? "e.g., Techcombank" : "e.g., Snap Inc."}
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
              <div className="text-sm text-muted-foreground">
                {market === "vietnamese" ? (
                  <>
                    Vietnamese CSV format: date,ticket,open,high,low,close,volume
                    <div className="mt-2 p-2 bg-blue-50 rounded-md">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-blue-800">
                          <div className="font-medium mb-1">Example Vietnamese format:</div>
                          <div className="font-mono">date,ticket,open,high,low,close,volume</div>
                          <div className="font-mono">01/03/2025,TCB,24350,24350,23600,23600,17426900</div>
                          <div className="font-mono">01/06/2025,TCB,23600,23850,23500,23600,8132700</div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    CSV should contain columns: Date, Open, High, Low, Close, Volume
                    <div className="mt-2 p-2 bg-gray-50 rounded-md">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-gray-700">
                          <div className="font-medium mb-1">Example US format:</div>
                          <div className="font-mono">Date,Open,High,Low,Close,Volume</div>
                          <div className="font-mono">2024-01-03,175.00,178.50,174.00,177.25,1000000</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
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

    </>
  );
}
