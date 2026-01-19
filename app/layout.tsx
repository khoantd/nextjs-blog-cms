import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navigation } from '@/components/navigation';
import { UserMenu } from '@/components/user-menu';
import { PasswordRedirect } from '@/components/password-redirect';
import { Button } from '@/components/ui/button';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Stock Analysis Platform',
  description: 'Advanced stock price analysis with AI-powered insights and factor analysis',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <PasswordRedirect />
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
        </Providers>
      </body>
    </html>
  );
}
