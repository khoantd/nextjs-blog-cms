"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface HoverCardProps {
  children: React.ReactNode;
  className?: string;
}

export function HoverCard({ children, className = "" }: HoverCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        "hover:scale-105 hover:shadow-xl hover:-translate-y-1",
        isHovered && "scale-105 shadow-xl -translate-y-1",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  );
}

interface PulseButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function PulseButton({ children, onClick, className = "" }: PulseButtonProps) {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    onClick?.();
    setTimeout(() => setIsClicked(false), 600);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        "before:absolute before:inset-0 before:bg-white before:opacity-0",
        "hover:before:opacity-20",
        isClicked && "animate-pulse ring-2 ring-blue-400 ring-opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

interface SlideInTextProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function SlideInText({ children, delay = 0, className = "" }: SlideInTextProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className={cn(
        "transition-all duration-700 ease-out",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
      onAnimationEnd={() => setIsVisible(true)}
    >
      {children}
    </div>
  );
}

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, duration = 500, className = "" }: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className={cn(
        "transition-opacity ease-out",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
      style={{ 
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`
      }}
      onAnimationEnd={() => setIsVisible(true)}
    >
      {children}
    </div>
  );
}

interface BounceIconProps {
  children: React.ReactNode;
  trigger?: "hover" | "click";
  className?: string;
}

export function BounceIcon({ children, trigger = "hover", className = "" }: BounceIconProps) {
  const [isBouncing, setIsBouncing] = useState(false);

  const handleInteraction = () => {
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 600);
  };

  const props = trigger === "hover" 
    ? { onMouseEnter: handleInteraction }
    : { onClick: handleInteraction };

  return (
    <div
      className={cn(
        "inline-block transition-transform duration-300",
        isBouncing && "animate-bounce",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface ShimmerProps {
  className?: string;
  children?: React.ReactNode;
}

export function Shimmer({ className = "", children }: ShimmerProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
      {children}
    </div>
  );
}

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className = "" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div className={cn(
          "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2",
          "px-2 py-1 text-xs text-white bg-slate-900 rounded",
          "whitespace-nowrap z-50",
          "after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2",
          "after:border-4 after:border-l-transparent after:border-r-transparent after:border-t-slate-900",
          className
        )}>
          {content}
        </div>
      )}
    </div>
  );
}

interface NumberCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

export function NumberCounter({ value, duration = 2000, className = "" }: NumberCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  return (
    <span className={className}>
      {displayValue.toLocaleString()}
    </span>
  );
}

interface ProgressDotsProps {
  total: number;
  active: number;
  className?: string;
}

export function ProgressDots({ total, active, className = "" }: ProgressDotsProps) {
  return (
    <div className={cn("flex space-x-2", className)}>
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "w-2 h-2 rounded-full transition-all duration-300",
            index === active 
              ? "bg-blue-600 w-8" 
              : "bg-slate-300"
          )}
        />
      ))}
    </div>
  );
}

// Add shimmer animation to globals.css
export const shimmerKeyframes = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`;
