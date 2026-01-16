"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Info, LogIn, UserPlus, LogOut, CheckCircle2, XCircle, Settings } from "lucide-react";
import { vnstockApi } from "@/lib/vnstock-api";

interface VnstockApiConfigProps {
  className?: string;
}

export function VnstockApiConfig({ className }: VnstockApiConfigProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Auth states
  const [showAuth, setShowAuth] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<{ username: string; email: string } | null>(null);
  
  // API URL from environment
  const apiUrl = process.env.NEXT_PUBLIC_VNSTOCK_API_URL || 'http://72.60.233.159:8002';

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsChecking(true);
    try {
      const user = await vnstockApi.getCurrentUser();
      setCurrentUser(user);
      setIsAuthenticated(true);
    } catch (err) {
      // Not authenticated or token expired
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setIsChecking(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      await vnstockApi.register({
        username: authUsername,
        email: authEmail,
        password: authPassword,
      });
      
      setSuccess("Registration successful! Logging in...");
      
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
    setSuccess(null);
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
      
      // Clear form
      setAuthUsername("");
      setAuthEmail("");
      setAuthPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
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
      setSuccess("Logged out successfully");
    } catch (err) {
      console.error('Logout error:', err);
      setError(err instanceof Error ? err.message : "Failed to logout");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Try to get current user to test connection
      const user = await vnstockApi.getCurrentUser();
      setSuccess(`Connection successful! Connected as ${user.username}`);
      setIsAuthenticated(true);
      setCurrentUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection test failed. Please login first.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Vnstock API Configuration
          </CardTitle>
          <CardDescription>
            Configure your Vnstock API account for Vietnamese stock data access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Checking authentication status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Vnstock API Configuration
        </CardTitle>
        <CardDescription>
          Configure your Vnstock API account for Vietnamese stock data access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* API URL Display */}
        <div className="space-y-2">
          <Label>API Endpoint</Label>
          <div className="flex items-center gap-2">
            <Input
              value={apiUrl}
              readOnly
              className="font-mono text-sm bg-muted"
            />
            <div className="flex-shrink-0">
              {isAuthenticated ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-medium">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <XCircle className="h-4 w-4" />
                  <span className="text-xs">Not Connected</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure via <code className="px-1 py-0.5 bg-muted rounded">NEXT_PUBLIC_VNSTOCK_API_URL</code> environment variable
          </p>
        </div>

        <div className="border-t border-slate-200" />

        {/* Authentication Status */}
        {isAuthenticated && currentUser ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="font-medium text-green-900">Authenticated</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Logged in as: <span className="font-semibold">{currentUser.username}</span>
                  {currentUser.email && (
                    <span className="ml-2">({currentUser.email})</span>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Info className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Not Authenticated</div>
                <div className="text-sm text-muted-foreground">
                  Please login or register to access the Vnstock API. This account is separate from your main platform account.
                </div>
              </AlertDescription>
            </Alert>

            {!showAuth ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowAuth(true);
                    setIsRegistering(false);
                  }}
                  className="flex-1"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
                <Button
                  onClick={() => {
                    setShowAuth(true);
                    setIsRegistering(true);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register
                </Button>
              </div>
            ) : (
              <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="Enter username"
                    required
                    disabled={isLoading}
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
                      disabled={isLoading}
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
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAuth(false);
                      setError(null);
                      setSuccess(null);
                      setAuthUsername("");
                      setAuthEmail("");
                      setAuthPassword("");
                    }}
                    disabled={isLoading}
                  >
                    Cancel
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
                        disabled={isLoading}
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
                        disabled={isLoading}
                      >
                        Register
                      </button>
                    </span>
                  )}
                </div>
              </form>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
