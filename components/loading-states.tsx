"use client";

import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
}

interface LoadingCardProps {
  title?: string;
  lines?: number;
}

export function LoadingCard({ title = "Loading...", lines = 3 }: LoadingCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div className="animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded" style={{ width: `${Math.random() * 40 + 60}%` }}></div>
        ))}
      </div>
    </div>
  );
}

interface LoadingPageProps {
  message?: string;
}

export function LoadingPage({ message = "Loading..." }: LoadingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-slate-900">{message}</p>
        <p className="text-sm text-slate-500">Please wait while we process your request</p>
      </div>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export function Skeleton({ className = "", children }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded ${className}`}>
      {children}
    </div>
  );
}

export function LoadingButton({ children, isLoading, ...props }: any) {
  return (
    <button
      {...props}
      disabled={isLoading || props.disabled}
      className={`
        relative inline-flex items-center justify-center
        px-4 py-2 text-sm font-medium rounded-lg
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${props.className || ''}
      `}
    >
      {isLoading && (
        <LoadingSpinner size="sm" className="mr-2" />
      )}
      {children}
    </button>
  );
}

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressRing({ 
  value, 
  max = 100, 
  size = 120, 
  strokeWidth = 8, 
  className = "" 
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (value / max) * circumference;
  
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="text-blue-600 transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-slate-900">
          {Math.round((value / max) * 100)}%
        </span>
      </div>
    </div>
  );
}
