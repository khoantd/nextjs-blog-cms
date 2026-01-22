"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Check if we're on the landing page (public route)
  const isLandingPage = pathname === "/" && !pathname.startsWith("/stock-");

  // Check if we're on an auth page
  const isAuthPage = pathname.startsWith("/auth/");

  // For landing page, render without the app header and with full width
  if (isLandingPage) {
    return (
      <div className="min-h-screen bg-white">
        {/* Simple header for landing page */}
        <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200/80 sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-slate-900">Stock Analysis Platform</span>
              </Link>

              {/* Auth buttons */}
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/signin"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Full-width content for landing page */}
        <main>{children}</main>
      </div>
    );
  }

  // For auth pages, render with minimal styling
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {children}
      </div>
    );
  }

  // For authenticated pages, render with full app header and constrained width
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-slate-900">
      {/* Enhanced Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                    Stock Analysis Platform
                  </h1>
                  <p className="text-xs text-slate-500">AI-Powered Insights</p>
                </div>
                {/* Mobile logo only */}
                <div className="sm:hidden">
                  <h1 className="text-lg font-bold text-slate-900">SAP</h1>
                </div>
              </div>
            </div>

            {/* Navigation - Desktop */}
            <div className="hidden lg:flex items-center space-x-1">
              <Navigation />
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <UserMenu />
              {/* Mobile menu button */}
              <Button variant="ghost" size="sm" className="lg:hidden">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden border-t border-slate-200">
          <div className="px-4 py-2 space-y-1">
            <Navigation />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
