"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import { Loader2, Lock } from "lucide-react";

function SetPasswordForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);

  // Check if password is required
  useEffect(() => {
    const checkPasswordStatus = async () => {
      if (status === "loading") return;
      
      if (status === "unauthenticated") {
        router.push("/auth/signin");
        return;
      }

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
          const needsPassword = data.data?.requiresPassword ?? false;
          setRequiresPassword(needsPassword);
          
          // If password is already set, redirect to dashboard
          if (!needsPassword) {
            router.push("/");
            return;
          }
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
  }, [session, status, router]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
        // Redirect to dashboard after successful password setup
        router.push("/");
        router.refresh();
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

  if (status === "loading" || isCheckingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Setting Up Your Account
            </CardTitle>
            <CardDescription className="text-center">
              Please wait...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!requiresPassword) {
    // Will redirect, but show loading state
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-blue-100 p-3">
              <Lock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Set Your Password
          </CardTitle>
          <CardDescription className="text-center">
            You signed in with Google. To enable email/password login, please set a password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password (min. 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
                autoFocus
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
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
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
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                Setting Up Your Account
              </CardTitle>
              <CardDescription className="text-center">
                Loading...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <SetPasswordForm />
    </Suspense>
  );
}
