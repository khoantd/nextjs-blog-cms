"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  BarChart3, 
  Upload, 
  Settings, 
  Home,
  Brain
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/stock-analyses", icon: Home },
  { name: "Analyses", href: "/stock-analyses", icon: TrendingUp },
  { name: "Create", href: "/stock-analysis/create", icon: Upload },
  { name: "Factors", href: "/factors", icon: BarChart3 },
  { name: "AI Insights", href: "/ai-insights", icon: Brain },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center space-x-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-slate-100 text-slate-900"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// Mobile navigation (for future implementation)
export function MobileNavigation() {
  return (
    <div className="md:hidden">
      {/* Mobile navigation implementation */}
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-slate-200 rounded"></div>
      </div>
    </div>
  );
}
