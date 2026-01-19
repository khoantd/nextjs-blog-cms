"use client";

import { useState, Suspense, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
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
import Link from "next/link";
import { API_CONFIG } from "@/lib/api-config";

// Check if Google OAuth is enabled (NEXT_PUBLIC_ vars are available in client components)
const isGoogleOAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH === 'true';

/**
 * Get list of users who should prioritize password login over Google OAuth
 * Configured via NEXT_PUBLIC_PASSWORD_PRIORITY_USERS environment variable (comma-separated emails)
 * Example: NEXT_PUBLIC_PASSWORD_PRIORITY_USERS=user1@example.com,user2@example.com
 */
function getPasswordPriorityUsers(): string[] {
  const envUsers = process.env.NEXT_PUBLIC_PASSWORD_PRIORITY_USERS;
  if (!envUsers) {
    // Default fallback for backward compatibility
    return ['khoa0702@gmail.com'];
  }
  
  return envUsers
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);
}

const PASSWORD_PRIORITY_USERS = getPasswordPriorityUsers();

// Prevent static generation
export const dynamic = 'force-dynamic';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const registered = searchParams.get("registered") === "true";
  const passwordRequired = searchParams.get("error") === "PasswordLoginRequired";
  const emailFromError = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromError);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(passwordRequired ? "Please use your password to sign in instead of Google OAuth." : "");
  const [success, setSuccess] = useState(registered);
  const [isLoading, setIsLoading] = useState(false);
  const [showGoogleOAuth, setShowGoogleOAuth] = useState(isGoogleOAuthEnabled);
  const [checkingPassword, setCheckingPassword] = useState(false);

  // Check if user has password when email changes (for password priority users)
  useEffect(() => {
    const checkPasswordStatus = async () => {
      if (!email || !PASSWORD_PRIORITY_USERS.includes(email.toLowerCase())) {
        setShowGoogleOAuth(isGoogleOAuthEnabled);
        return;
      }

      setCheckingPassword(true);
      try {
        const response = await fetch(
          `${API_CONFIG.BASE_URL}/api/auth/password-status?email=${encodeURIComponent(email)}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          }
        );

        if (response.ok) {
          const data = await response.json();
          const hasPassword = data.data?.hasPassword ?? false;
          
          // Hide Google OAuth if user has password (prioritize password login)
          setShowGoogleOAuth(isGoogleOAuthEnabled && !hasPassword);
        } else {
          // If check fails, show Google OAuth as fallback
          setShowGoogleOAuth(isGoogleOAuthEnabled);
        }
      } catch (error) {
        console.warn('Failed to check password status:', error);
        // On error, show Google OAuth as fallback
        setShowGoogleOAuth(isGoogleOAuthEnabled);
      } finally {
        setCheckingPassword(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkPasswordStatus, 500);
    return () => clearTimeout(timeoutId);
  }, [email]);

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Handle error - NextAuth returns error as string
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || String(result.error) || "Invalid credentials";
        setError(errorMessage);
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError("An unexpected error occurred");
      }
    } catch (err: any) {
      // Handle error object properly
      const errorMessage = err?.message || err?.error?.message || String(err) || "An error occurred during sign in";
      setError(errorMessage);
      console.error("Sign in error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Stock Analysis Platform
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to access stock analysis features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email/Password Form */}
          <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            {success && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
                Registration successful! Please sign in with your credentials.
              </div>
            )}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Divider */}
          {showGoogleOAuth && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or continue with</span>
                </div>
              </div>

              {/* Google OAuth Button */}
              <Button
                onClick={() => signIn("google", { callbackUrl })}
                className="w-full"
                size="lg"
                variant="outline"
                disabled={isLoading || checkingPassword}
              >
                <svg
                  className="mr-2 h-5 w-5"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
            </>
          )}
          
          {/* Message for password priority users */}
          {email && PASSWORD_PRIORITY_USERS.includes(email.toLowerCase()) && !showGoogleOAuth && (
            <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded text-center">
              Please use your password to sign in.
            </div>
          )}

          {/* Register Link */}
          <div className="text-sm text-center text-gray-600">
            Don't have an account?{" "}
            <Link href="/auth/register" className="text-blue-600 hover:underline">
              Register
            </Link>
          </div>

          <div className="text-xs text-gray-500 text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Stock Analysis Platform
            </CardTitle>
            <CardDescription className="text-center">
              Loading...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
