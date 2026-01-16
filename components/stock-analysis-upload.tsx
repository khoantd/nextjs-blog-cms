"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, Info, Download, Calendar, PlusCircle } from "lucide-react";
import { apiRequest } from "@/lib/api-config";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VnstockDownload } from "@/components/vnstock-download";
import type { StockAnalysis } from "@/lib/types/stock-analysis";
import { getStockAnalyses } from "@/lib/stock-api";

type DataSource = "csv" | "api" | "vnstock" | "supplement";

export function StockAnalysisUpload() {
  const router = useRouter();
  const [dataSource, setDataSource] = useState<DataSource>("api"); // Default to API
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [minPctChange, setMinPctChange] = useState("4.0");
  const [market, setMarket] = useState<string>("us");
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period1, setPeriod1] = useState<string>(""); // Start date for API fetch
  const [period2, setPeriod2] = useState<string>(""); // End date for API fetch (defaults to today)
  
  // State for supplementation
  const [existingAnalyses, setExistingAnalyses] = useState<StockAnalysis[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>("");
  const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(false);

  // Fetch existing analyses when supplement tab is selected
  useEffect(() => {
    if (dataSource === "supplement") {
      fetchExistingAnalyses();
    }
  }, [dataSource]);

  const fetchExistingAnalyses = async () => {
    setIsLoadingAnalyses(true);
    try {
      // Use the proper API function that handles authentication correctly
      const response = await getStockAnalyses(1, 1000); // Get all analyses
      setExistingAnalyses(response.data || []);
    } catch (error) {
      console.error('Error fetching existing analyses:', error);
    } finally {
      setIsLoadingAnalyses(false);
    }
  };

  const handleSupplement = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedAnalysisId) {
      setError("Please select an existing analysis to supplement");
      return;
    }

    if (!file) {
      setError("Please upload a CSV file to supplement the analysis");
      return;
    }

    setIsLoading(true);

    try {
      // Use Next.js API route as proxy to avoid CORS and mixed content issues
      // The API route forwards the request to the remote backend server-side
      // This allows HTTPS frontend to call HTTP backend without browser blocking
      const formData = new FormData();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      formData.append('csvFile', blob, file.name);

      const supplementResponse = await fetch(`/api/stock-analyses/${selectedAnalysisId}/supplement`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!supplementResponse.ok) {
        const errorData = await supplementResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error?.message || errorData.error || 'Failed to supplement analysis');
      }

      const response = await supplementResponse.json();

      // Navigate to the analysis detail page
      router.push(`/stock-analysis/${selectedAnalysisId}`);
    } catch (err) {
      console.error("Error supplementing analysis:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleFetchFromAPI = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!symbol) {
      setError("Please provide a stock symbol");
      return;
    }

    // Both US and Vietnamese stocks are now supported via API
    // Vietnamese stocks use .VN suffix in Yahoo Finance

    setIsLoading(true);

    try {
      // Create analysis directly in backend (defaults to remote backend)
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://72.60.233.159:3050';
      const createResponse = await fetch(`${baseUrl}/api/stock-analyses`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          name: name || undefined,
          market: "US",
        }),
        credentials: 'include',
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error?.message || errorData.error || 'Failed to create stock analysis');
      }

      const createData = await createResponse.json();

      if (!createData.data || !createData.data.stockAnalysis) {
        throw new Error("Failed to create stock analysis");
      }

      const analysisId = createData.data.stockAnalysis.id;

      // Fetch historical data from API
      const fetchResponse = await fetch(`${baseUrl}/api/stock-analyses/${analysisId}/fetch-historical`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          period1: period1 || undefined, // If empty, defaults to 1 year ago
          period2: period2 || undefined, // If empty, defaults to today
          interval: '1d'
        }),
      });

      if (!fetchResponse.ok) {
        const errorData = await fetchResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error?.message || errorData.error || 'Failed to fetch historical data from API');
      }

      const response = await fetchResponse.json();

      // Navigate to the analysis detail page
      router.push(`/stock-analysis/${response.data.stockAnalysis.id}`);
    } catch (err) {
      console.error("Error fetching historical data:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, overwrite = false) => {
    e.preventDefault();
    setError(null);

    if (dataSource === "api") {
      return handleFetchFromAPI(e);
    }

    if (!symbol || !file) {
      setError("Please provide a symbol and upload a CSV file");
      return;
    }

    setIsLoading(true);

    try {
      // Read file content (already stored in csvContent state)
      const content = csvContent;

      // Use Next.js API route as proxy to avoid CORS and mixed content issues
      // The API route forwards the request to the remote backend server-side
      // This allows HTTPS frontend to call HTTP backend without browser blocking
      const createResponse = await fetch('/api/stock-analyses', {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          name: name || undefined,
          market: market === "us" ? "US" : market === "vietnamese" ? "VN" : market,
        }),
        credentials: 'include',
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[handleSubmit] Create response error:', {
          status: createResponse.status,
          statusText: createResponse.statusText,
          errorData,
        });
        throw new Error(errorData.error?.message || errorData.error || errorData.message || 'Failed to create stock analysis');
      }

      const createData = await createResponse.json();
      console.log('[handleSubmit] Create response data:', createData);

      if (!createData.data || !createData.data.stockAnalysis) {
        console.error('[handleSubmit] Invalid response structure:', {
          createData,
          hasData: !!createData.data,
          hasStockAnalysis: !!createData.data?.stockAnalysis,
        });
        throw new Error(`Failed to create stock analysis. Response: ${JSON.stringify(createData)}`);
      }

      const analysisId = createData.data.stockAnalysis.id;

      // Upload CSV file via Next.js API route proxy
      const formData = new FormData();
      const blob = new Blob([content], { type: 'text/csv' });
      formData.append('csvFile', blob, `${symbol.toUpperCase()}.csv`);

      const uploadResponse = await fetch(`/api/stock-analyses/${analysisId}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.message || errorData.error?.message || errorData.error || 'Failed to upload CSV';
        console.error('Upload error details:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          errorData,
          analysisId
        });
        throw new Error(errorMessage);
      }

      const response = await uploadResponse.json();

      // Handle overlapping data detection (409 Conflict)
      if (response.error && response.error.includes("Overlapping data detected")) {
        const dateRange = response.dateRange;
        const message = dateRange 
          ? `${response.details}\n\nOptions:\n- Click "OK" to OVERWRITE the overlapping data (existing analysis will be merged with new data)\n- Click "Cancel" to CREATE A SEPARATE ANALYSIS (recommended to preserve existing analysis)`
          : `${response.details}\n\nOptions:\n- Click "OK" to OVERWRITE the existing data\n- Click "Cancel" to CREATE A SEPARATE ANALYSIS`;
        
        const shouldOverwrite = window.confirm(message);

        if (shouldOverwrite) {
          // Retry with overwrite flag
          setIsLoading(false);
          const overwriteEvent = new Event('submit') as any;
          await handleSubmit(overwriteEvent, true);
          return;
        } else {
          // Create a separate analysis with a unique name
          const uniqueName = name ? `${name} - ${new Date().toLocaleDateString()}` : `${symbol.toUpperCase()} - ${new Date().toLocaleDateString()}`;
          
          // Retry with unique name but no overwrite
          setIsLoading(false);
          const formData = {
            symbol: symbol.toUpperCase(),
            name: uniqueName,
            csvContent: content,
            minPctChange: parseFloat(minPctChange),
            market,
            overwrite: false,
            forceCreate: true // Add a flag to force creation
          };
          
          // Create separate analysis via Next.js API route proxy
          const createResponse = await fetch('/api/stock-analyses', {
            method: "POST",
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              symbol: formData.symbol,
              name: formData.name,
              market: formData.market === "us" ? "US" : formData.market === "vietnamese" ? "VN" : formData.market,
            }),
            credentials: 'include',
          });

          if (!createResponse.ok) {
            const errorData = await createResponse.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error?.message || errorData.error || 'Failed to create stock analysis');
          }

          const createData = await createResponse.json();
          
          if (createData.data && createData.data.stockAnalysis) {
            const analysisId = createData.data.stockAnalysis.id;
            
            // Upload CSV via Next.js API route proxy
            const uploadFormData = new FormData();
            const blob = new Blob([csvContent], { type: 'text/csv' });
            uploadFormData.append('csvFile', blob, `${formData.symbol}.csv`);
            
            const uploadResponse = await fetch(`/api/stock-analyses/${analysisId}/upload`, {
              method: 'POST',
              body: uploadFormData,
              credentials: 'include',
            });
            
            if (uploadResponse.ok) {
              router.push(`/stock-analysis/${analysisId}`);
            } else {
              const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }));
              const errorMessage = errorData.message || errorData.error?.message || errorData.error || 'Failed to upload CSV for separate analysis';
              console.error('Upload error in retry flow:', errorData);
              throw new Error(errorMessage);
            }
          } else {
            throw new Error("Failed to create separate analysis");
          }
          return;
        }
      }

      // Navigate to the analysis detail page
      router.push(`/stock-analysis/${response.data.stockAnalysis.id}`);
    } catch (err) {
      console.error("Error uploading stock analysis:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      console.error("Full error details:", {
        message: errorMessage,
        error: err,
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(errorMessage);
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
          <Tabs value={dataSource} onValueChange={(value) => setDataSource(value as DataSource)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="api" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Fetch from API
              </TabsTrigger>
              <TabsTrigger value="csv" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload CSV
              </TabsTrigger>
              <TabsTrigger value="supplement" className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Supplement Data
              </TabsTrigger>
              <TabsTrigger value="vnstock" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Vnstock API
              </TabsTrigger>
            </TabsList>

            <TabsContent value="api" className="space-y-6 mt-6">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">Fetch from API (Recommended)</div>
                    <div>Automatically fetch historical data from Yahoo Finance API. Supports both US and Vietnamese stocks.</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="csv" className="space-y-6 mt-6">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-700">
                    <div className="font-medium mb-1">Upload CSV File</div>
                    <div>Upload your own CSV file with historical stock data. Useful for custom datasets or when API data is unavailable.</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="supplement" className="space-y-6 mt-6">
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-start gap-2">
                  <PlusCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-800">
                    <div className="font-medium mb-1">Supplement Existing Analysis</div>
                    <div>Upload additional CSV data to merge with an existing analysis. New data will be combined with existing data.</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="vnstock" className="space-y-6 mt-6">
              <VnstockDownload />
            </TabsContent>
          </Tabs>

          {dataSource !== "vnstock" && (
            <form onSubmit={dataSource === "supplement" ? handleSupplement : handleSubmit} className="space-y-6 mt-6">

            {dataSource === "supplement" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="existingAnalysis">Select Existing Analysis *</Label>
                  <Select value={selectedAnalysisId} onValueChange={setSelectedAnalysisId} disabled={isLoadingAnalyses}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingAnalyses ? "Loading analyses..." : "Choose an analysis to supplement"} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingAnalyses ? (
                        <div className="flex items-center justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading...
                        </div>
                      ) : existingAnalyses.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No existing analyses found. Create an analysis first.
                        </div>
                      ) : (
                        existingAnalyses.map((analysis) => (
                          <SelectItem key={analysis.id} value={analysis.id.toString()}>
                            {analysis.symbol} - {analysis.name || 'Unnamed'} ({new Date(analysis.createdAt).toLocaleDateString()})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Choose the existing analysis you want to supplement with additional data
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="csvFile">CSV File to Supplement *</Label>
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    required
                  />
                  <div className="text-sm text-muted-foreground">
                    Upload a CSV file with additional stock data. The data will be merged with the existing analysis.
                    <div className="mt-2 p-2 bg-green-50 rounded-md">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-green-800">
                          <div className="font-medium mb-1">Note:</div>
                          <div>• New data for existing dates will update existing records</div>
                          <div>• New data for new dates will be added to the analysis</div>
                          <div>• CSV format should match the original analysis format</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {dataSource !== "supplement" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="market">Market *</Label>
                  <Select value={market} onValueChange={setMarket} disabled={dataSource === "api"}>
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

                {dataSource === "api" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="period1">Start Date (Optional)</Label>
                      <Input
                        id="period1"
                        type="date"
                        value={period1}
                        onChange={(e) => setPeriod1(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Leave empty to fetch last 1 year of data
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="period2">End Date (Optional)</Label>
                      <Input
                        id="period2"
                        type="date"
                        value={period2}
                        onChange={(e) => setPeriod2(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-sm text-muted-foreground">
                        Leave empty to fetch up to today
                      </p>
                    </div>
                  </>
                )}

                {dataSource === "csv" && (
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
                )}
              </>
            )}

            {error && (
              <div className="p-3 bg-destructive/20 text-destructive rounded-md text-sm border border-destructive/30">
                {error}
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {dataSource === "api" ? "Fetching data..." : dataSource === "supplement" ? "Supplementing..." : "Analyzing..."}
                </>
              ) : (
                <>
                  {dataSource === "api" ? (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Fetch and Analyze
                    </>
                  ) : dataSource === "supplement" ? (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Supplement Analysis
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload and Analyze
                    </>
                  )}
                </>
              )}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>

    </>
  );
}
