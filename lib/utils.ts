import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Enhanced utility types and functions
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type FetcherArgs = [string, RequestInit?];

// Type-safe fetcher function
export const fetcher = async <T = unknown>(...args: FetcherArgs): Promise<T> => {
  const [url, options] = args;
  
  // If it's a relative URL, use the backend API (defaults to remote backend)
  const fullUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL || 'http://72.60.233.159:3050'}${url.startsWith('/') ? url : '/' + url}`;
  
  const response = await fetch(fullUrl, {
    ...options,
    credentials: 'include', // For cookies/auth
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json() as Promise<T>;
};
