"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Info, Download, LogIn, UserPlus, LogOut, CheckCircle2 } from "lucide-react";
import { vnstockApi } from "@/lib/vnstock-api";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VnstockDownloadProps {
  onDownloadComplete?: (csvData: string, symbol: string) => void;
}

export function VnstockDownload({ onDownloadComplete }: VnstockDownloadProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Auth states
  const [showAuth, setShowAuth] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<{ username: string; email: string } | null>(null);
  
  // Download states
  const [symbol, setSymbol] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [source, setSource] = useState("vci");
  const [interval, setInterval] = useState("D");
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [loadingSymbols, setLoadingSymbols] = useState(false);

  // Helper function to format date as YYYY-MM-DD (API format)
  const formatDateYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to format date as DD-MM-YYYY (display format)
  const formatDateDDMMYYYY = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Helper function to convert DD-MM-YYYY to YYYY-MM-DD
  const convertToYYYYMMDD = (ddmmyyyy: string): string => {
    const [day, month, year] = ddmmyyyy.split('-');
    return `${year}-${month}-${day}`;
  };

  // Helper function to validate DD-MM-YYYY format
  const isValidDDMMYYYY = (dateStr: string): boolean => {
    const regex = /^(\d{2})-(\d{2})-(\d{4})$/;
    if (!regex.test(dateStr)) return false;
    const [, day, month, year] = dateStr.match(regex)!;
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    const date = new Date(y, m - 1, d);
    return date.getDate() === d && date.getMonth() === m - 1 && date.getFullYear() === y;
  };

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
    // Set default dates (1 year ago to today) in DD-MM-YYYY format
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    setEndDate(formatDateDDMMYYYY(today));
    setStartDate(formatDateDDMMYYYY(oneYearAgo));
  }, []);

  const checkAuth = async () => {
    try {
      const user = await vnstockApi.getCurrentUser();
      setCurrentUser(user);
      setIsAuthenticated(true);
    } catch (err) {
      // Not authenticated or token expired
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  const loadAvailableSymbols = async () => {
    // Symbols list not available in current API, leave empty for now
    setAvailableSymbols([]);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await vnstockApi.register({
        username: authUsername,
        email: authEmail,
        password: authPassword,
      });
      
      // Auto-login after registration
      await handleLogin(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await vnstockApi.login({
        username: authUsername,
        password: authPassword,
      });
      
      const user = await vnstockApi.getCurrentUser();
      setCurrentUser(user);
      setIsAuthenticated(true);
      setShowAuth(false);
      setSuccess("Successfully logged in!");
      loadAvailableSymbols();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/vnstock/auth/logout', { 
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Logout failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      setIsAuthenticated(false);
      setCurrentUser(null);
      setAvailableSymbols([]);
      setSuccess("Logged out successfully");
    } catch (err) {
      console.error('Logout error:', err);
      setError(err instanceof Error ? err.message : "Failed to logout");
    }
  };

  const handleDownload = async (asFile: boolean = false) => {
    setError(null);
    setSuccess(null);

    if (!symbol || !startDate || !endDate) {
      setError("Please fill in all required fields");
      return;
    }

    // Validate date formats
    if (!isValidDDMMYYYY(startDate)) {
      setError("Start date must be in DD-MM-YYYY format (e.g., 01-01-2026)");
      return;
    }
    if (!isValidDDMMYYYY(endDate)) {
      setError("End date must be in DD-MM-YYYY format (e.g., 06-01-2026)");
      return;
    }

    setIsLoading(true);

    try {
      // Convert dates from DD-MM-YYYY to YYYY-MM-DD for API
      const startDateAPI = convertToYYYYMMDD(startDate);
      const endDateAPI = convertToYYYYMMDD(endDate);

      // Download CSV from vnstock API
      const response = await vnstockApi.downloadCSV({
        symbol: symbol.toUpperCase(),
        start_date: startDateAPI,
        end_date: endDateAPI,
        source: source as "vci" | "tcbs",
        interval: interval as "D" | "W" | "M",
      });

      if (asFile) {
        // Download as file
        const blob = new Blob([response.csv_content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${symbol.toUpperCase()}_${startDate}_${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setSuccess(`CSV file downloaded: ${symbol.toUpperCase()}_${startDate}_${endDate}.csv`);
      } else {
        // Download as text and create analysis

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
            name: undefined,
            market: "VN", // Vietnamese market
          }),
          credentials: 'include',
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error?.message || errorData.error || errorData.message || 'Failed to create stock analysis');
        }

        const createData = await createResponse.json();

        if (!createData.data || !createData.data.stockAnalysis) {
          throw new Error("Failed to create stock analysis");
        }

        const analysisId = createData.data.stockAnalysis.id;

        // Upload CSV file via Next.js API route proxy
        const formData = new FormData();
        const blob = new Blob([response.csv_content], { type: 'text/csv' });
        formData.append('csvFile', blob, `${symbol.toUpperCase()}.csv`);

        const uploadResponse = await fetch(`/api/stock-analyses/${analysisId}/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error?.message || errorData.error || errorData.message || 'Failed to upload CSV');
        }

        setSuccess(`Successfully downloaded and created analysis for ${symbol.toUpperCase()}`);
        
        // Navigate to analysis detail page
        router.push(`/stock-analysis/${analysisId}`);
        
        // Call callback if provided
        if (onDownloadComplete) {
          onDownloadComplete(response.csv_content, symbol.toUpperCase());
        }
      }
    } catch (err) {
      console.error("Error downloading CSV:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Vnstock API Authentication</CardTitle>
          <CardDescription>
            Login or register to download Vietnamese stock data from vnstock API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showAuth ? (
            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Vnstock API Authentication</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Please login or register to access the vnstock API. 
                    The API is running at {process.env.NEXT_PUBLIC_VNSTOCK_API_URL || 'http://72.60.233.159:8002'}
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>

              {isRegistering && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="Enter email"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isRegistering ? "Registering..." : "Logging in..."}
                    </>
                  ) : (
                    <>
                      {isRegistering ? (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Register
                        </>
                      ) : (
                        <>
                          <LogIn className="mr-2 h-4 w-4" />
                          Login
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                {isRegistering ? (
                  <span>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsRegistering(false)}
                      className="text-primary hover:underline"
                    >
                      Login
                    </button>
                  </span>
                ) : (
                  <span>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsRegistering(true)}
                      className="text-primary hover:underline"
                    >
                      Register
                    </button>
                  </span>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You need to authenticate with the vnstock API to download stock data.
                  The API is running at {process.env.NEXT_PUBLIC_VNSTOCK_API_URL || 'http://72.60.233.159:8002'}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Button
                  onClick={() => setShowAuth(true)}
                  className="w-full"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Login or Register
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Download from Vnstock API</CardTitle>
            <CardDescription>
              Download Vietnamese stock data from vnstock API ({process.env.NEXT_PUBLIC_VNSTOCK_API_URL || 'http://72.60.233.159:8002'})
              {currentUser && (
                <span className="block mt-1 text-xs">
                  Logged in as: <span className="font-semibold">{currentUser.username}</span>
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleDownload(false);
          }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="symbol">Stock Symbol *</Label>
            <div className="relative">
              <Input
                id="symbol"
                list="symbol-suggestions"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Type symbol (e.g., VCI, FPT, TCB)"
                className="w-full"
                required
                maxLength={10}
              />
              {availableSymbols.length > 0 && (
                <datalist id="symbol-suggestions">
                  {availableSymbols.map((sym) => (
                    <option key={sym} value={sym} />
                  ))}
                </datalist>
              )}
              {loadingSymbols && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {loadingSymbols 
                ? "Loading available symbols..." 
                : availableSymbols.length > 0
                ? `Type to search or select from ${availableSymbols.length} available symbols`
                : "Enter Vietnamese stock symbol (e.g., VCI, FPT, TCB)"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date * (DD-MM-YYYY)</Label>
              <Input
                id="startDate"
                type="text"
                value={startDate}
                onChange={(e) => {
                  let value = e.target.value;
                  // Auto-format as user types (DD-MM-YYYY)
                  value = value.replace(/\D/g, ''); // Remove non-digits
                  if (value.length > 2) value = value.slice(0, 2) + '-' + value.slice(2);
                  if (value.length > 5) value = value.slice(0, 5) + '-' + value.slice(5, 9);
                  setStartDate(value);
                }}
                placeholder="DD-MM-YYYY (e.g., 01-01-2026)"
                maxLength={10}
                required
              />
              {startDate && !isValidDDMMYYYY(startDate) && (
                <p className="text-sm text-red-500">Invalid date format. Use DD-MM-YYYY</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date * (DD-MM-YYYY)</Label>
              <Input
                id="endDate"
                type="text"
                value={endDate}
                onChange={(e) => {
                  let value = e.target.value;
                  // Auto-format as user types (DD-MM-YYYY)
                  value = value.replace(/\D/g, ''); // Remove non-digits
                  if (value.length > 2) value = value.slice(0, 2) + '-' + value.slice(2);
                  if (value.length > 5) value = value.slice(0, 5) + '-' + value.slice(5, 9);
                  setEndDate(value);
                }}
                placeholder="DD-MM-YYYY (e.g., 06-01-2026)"
                maxLength={10}
                required
              />
              {endDate && !isValidDDMMYYYY(endDate) && (
                <p className="text-sm text-red-500">Invalid date format. Use DD-MM-YYYY</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Data Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vci">VCI</SelectItem>
                  <SelectItem value="tcbs">TCBS</SelectItem>
                  <SelectItem value="msn">MSN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval">Interval</Label>
              <Select value={interval} onValueChange={setInterval}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="D">Daily (D)</SelectItem>
                  <SelectItem value="1W">Weekly (1W)</SelectItem>
                  <SelectItem value="1M">Monthly (1M)</SelectItem>
                  <SelectItem value="1m">1 Minute</SelectItem>
                  <SelectItem value="5m">5 Minutes</SelectItem>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                  <SelectItem value="30m">30 Minutes</SelectItem>
                  <SelectItem value="1H">1 Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download & Create Analysis
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => handleDownload(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download File Only
            </Button>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">About Vnstock Download</div>
                <div>
                  Downloads Vietnamese stock data from the vnstock API. 
                  "Download & Create Analysis" will automatically create a stock analysis 
                  in the system. "Download File Only" will just download the CSV file.
                </div>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

