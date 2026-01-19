"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface PasswordStatus {
  hasPassword: boolean;
  requiresPassword: boolean;
  email: string;
}

export function PasswordSettings() {
  const { data: session } = useSession();
  const [passwordStatus, setPasswordStatus] = useState<PasswordStatus | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Check password status on mount
  useEffect(() => {
    const checkPasswordStatus = async () => {
      if (!session?.user?.email) {
        setIsCheckingStatus(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/password-status?email=${encodeURIComponent(session.user.email)}`
        );

        if (response.ok) {
          const data = await response.json();
          setPasswordStatus(data.data);
        } else {
          console.error("Failed to check password status");
        }
      } catch (error) {
        console.error("Error checking password status:", error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkPasswordStatus();
  }, [session]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!password) {
      setError("Password is required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!session?.user?.email) {
      setError("You must be signed in to set a password");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: session.user.email,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Password set successfully! You can now login with your email and password.");
        setPassword("");
        setConfirmPassword("");
        // Refresh password status
        const statusResponse = await fetch(
          `/api/auth/password-status?email=${encodeURIComponent(session.user.email)}`
        );
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setPasswordStatus(statusData.data);
        }
      } else {
        setError(data.message || data.error || "Failed to set password");
      }
    } catch (error: any) {
      console.error("Set password error:", error);
      setError(error.message || "An error occurred while setting your password");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password Settings</CardTitle>
          <CardDescription>
            Manage your account password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const requiresPassword = passwordStatus?.requiresPassword ?? false;
  const hasPassword = passwordStatus?.hasPassword ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password Settings</CardTitle>
        <CardDescription>
          {hasPassword
            ? "Your account has a password set. You can login with email and password."
            : "Set a password to enable email/password login for your account."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Password Status */}
        <div className="flex items-center space-x-2">
          {hasPassword ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-600 font-medium">
                Password is set
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-amber-600 font-medium">
                Password not set
              </span>
            </>
          )}
        </div>

        {/* Warning for OAuth users without password */}
        {requiresPassword && (
          <Alert>
            <AlertDescription>
              You signed in with Google OAuth. To enable email/password login,
              please set a password below.
            </AlertDescription>
          </Alert>
        )}

        {/* Set Password Form */}
        {!hasPassword && (
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password (min. 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
              />
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting Password...
                </>
              ) : (
                "Set Password"
              )}
            </Button>
          </form>
        )}

        {/* Info for users with password */}
        {hasPassword && (
          <Alert>
            <AlertDescription>
              Your account is configured for both Google OAuth and email/password
              authentication. You can use either method to sign in.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
