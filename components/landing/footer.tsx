import Link from "next/link";
import { TrendingUp } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-slate-900">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              Stock Analysis Platform
            </Link>
            <p className="mt-4 text-sm text-slate-600 max-w-md">
              Advanced stock price analysis with AI-powered insights and factor analysis. Make smarter investment decisions with data-driven intelligence.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/auth/register" className="text-sm text-slate-600 transition-colors hover:text-blue-600">
                  Get Started
                </Link>
              </li>
              <li>
                <Link href="/auth/signin" className="text-sm text-slate-600 transition-colors hover:text-blue-600">
                  Sign In
                </Link>
              </li>
              <li>
                <a href="#features" className="text-sm text-slate-600 transition-colors hover:text-blue-600">
                  Features
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="#about" className="text-sm text-slate-600 transition-colors hover:text-blue-600">
                  About
                </a>
              </li>
              <li>
                <a href="#contact" className="text-sm text-slate-600 transition-colors hover:text-blue-600">
                  Contact
                </a>
              </li>
              <li>
                <a href="#privacy" className="text-sm text-slate-600 transition-colors hover:text-blue-600">
                  Privacy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-slate-200 pt-8">
          <p className="text-center text-sm text-slate-600">
            © {currentYear} Stock Analysis Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
