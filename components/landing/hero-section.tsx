import Link from "next/link";
import { ArrowRight, TrendingUp, Brain, BarChart3 } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-20 sm:py-28">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] -z-10" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
            <TrendingUp className="h-4 w-4" />
            <span>AI-Powered Investment Intelligence</span>
          </div>

          {/* Main headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Make Smarter Investment Decisions with{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI-Powered Analysis
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mb-10 text-lg text-slate-600 sm:text-xl">
            Analyze stocks with 11 sophisticated factors, get AI-generated buy/sell recommendations,
            and predict high-probability movements with our daily scoring system.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/register"
              className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-8 py-4 text-base font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
            >
              Sign In
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="rounded-full bg-blue-100 p-3">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900">11 Stock Factors</h3>
              <p className="text-sm text-slate-600">Technical + Fundamental</p>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="rounded-full bg-indigo-100 p-3">
                <Brain className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-slate-900">AI Insights</h3>
              <p className="text-sm text-slate-600">Powered by LiteLLM</p>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="rounded-full bg-purple-100 p-3">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Daily Scoring</h3>
              <p className="text-sm text-slate-600">Predictive Algorithm</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
