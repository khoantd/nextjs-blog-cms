"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Calendar, CalendarDays, TrendingUp, BarChart3, Clock, Target, Zap, Play, Loader2, AlertTriangle } from "lucide-react";
import { format, addDays, subDays, startOfYear, isWithinInterval, parseISO } from "date-fns";

export interface PeriodOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  getDateRange: (dataStartDate: Date, dataEndDate: Date) => { start: Date; end: Date };
}

export interface DateRange {
  start: Date;
  end: Date;
}

interface PeriodSelectorProps {
  dataStartDate: Date;
  dataEndDate: Date;
  onPeriodChange: (period: DateRange, periodId: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function PeriodSelector({ 
  dataStartDate, 
  dataEndDate, 
  onPeriodChange, 
  isLoading = false,
  className = "" 
}: PeriodSelectorProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [pendingPeriod, setPendingPeriod] = useState<{ period: DateRange; periodId: string } | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [showFeedback, setShowFeedback] = useState<boolean>(false);

  const periodOptions: PeriodOption[] = [
    {
      id: "30d",
      name: "Last 30 Days",
      description: "Recent market conditions",
      icon: <Clock className="h-4 w-4" />,
      getDateRange: (_, end) => ({ start: subDays(end, 30), end })
    },
    {
      id: "90d",
      name: "Last 90 Days",
      description: "Quarterly trend analysis",
      icon: <TrendingUp className="h-4 w-4" />,
      getDateRange: (_, end) => ({ start: subDays(end, 90), end })
    },
    {
      id: "6m",
      name: "Last 6 Months",
      description: "Medium-term patterns",
      icon: <CalendarDays className="h-4 w-4" />,
      getDateRange: (_, end) => ({ start: subDays(end, 180), end })
    },
    {
      id: "ytd",
      name: "Year to Date",
      description: "Current year performance",
      icon: <Target className="h-4 w-4" />,
      getDateRange: (_, end) => ({ start: new Date(end.getFullYear(), 0, 1), end })
    },
    {
      id: "custom",
      name: "Custom Range",
      description: "Choose specific dates",
      icon: <Calendar className="h-4 w-4" />,
      getDateRange: () => ({ start: new Date(), end: new Date() })
    }
  ];

  useEffect(() => {
    // Initialize with 30-day period on mount
    const period = periodOptions.find(p => p.id === "30d");
    if (period) {
      const range = period.getDateRange(dataStartDate, dataEndDate);
      // Ensure range is within data bounds
      const adjustedRange = {
        start: range.start < dataStartDate ? dataStartDate : range.start,
        end: range.end > dataEndDate ? dataEndDate : range.end
      };
      // Set as pending since user needs to click Run
      setPendingPeriod({ period: adjustedRange, periodId: "30d" });
    }
    
    // Listen for period analysis completion
    const handlePeriodComplete = (event: any) => {
      console.log('[PeriodSelector] Analysis completed:', event.detail);
      setFeedbackMessage('✅ ' + event.detail.message);
      setShowFeedback(true);
      
      // Hide completion feedback after 4 seconds
      setTimeout(() => {
        setShowFeedback(false);
      }, 4000);
    };
    
    window.addEventListener('periodAnalysisComplete', handlePeriodComplete);
    
    return () => {
      window.removeEventListener('periodAnalysisComplete', handlePeriodComplete);
    };
  }, []); // Only run once on mount

  const handlePeriodSelect = (periodId: string) => {
    setSelectedPeriod(periodId);
    if (periodId !== "custom") {
      const period = periodOptions.find(p => p.id === periodId);
      if (period) {
        const range = period.getDateRange(dataStartDate, dataEndDate);
        // Ensure range is within data bounds
        const adjustedRange = {
          start: range.start < dataStartDate ? dataStartDate : range.start,
          end: range.end > dataEndDate ? dataEndDate : range.end
        };
        
        // Store as pending for all periods (require user to click Run)
        setPendingPeriod({ period: adjustedRange, periodId });
      }
    }
  };

  const handleCustomRangeApply = () => {
    if (customStart && customEnd) {
      const start = parseISO(customStart);
      const end = parseISO(customEnd);
      
      if (start <= end && start >= dataStartDate && end <= dataEndDate) {
        setPendingPeriod({ period: { start, end }, periodId: "custom" });
      }
    }
  };

  const handleRunAnalysis = () => {
    console.log('[PeriodSelector] handleRunAnalysis called');
    console.log('[PeriodSelector] pendingPeriod:', pendingPeriod);
    
    if (pendingPeriod) {
      console.log('[PeriodSelector] Calling onPeriodChange with:', pendingPeriod);
      // Show React feedback message
      setFeedbackMessage(`Starting analysis for ${pendingPeriod.periodId} period...`);
      setShowFeedback(true);
      
      // Update feedback after 2 seconds to show progress
      setTimeout(() => {
        setFeedbackMessage(`Processing ${pendingPeriod.periodId} period data...`);
      }, 2000);
      
      // Hide feedback after 5 seconds
      setTimeout(() => {
        setShowFeedback(false);
      }, 5000);
      
      onPeriodChange(pendingPeriod.period, pendingPeriod.periodId);
    } else {
      console.log('[PeriodSelector] No pendingPeriod, cannot run analysis');
      // Show error feedback
      setFeedbackMessage('No period selected. Please select a period first.');
      setShowFeedback(true);
      
      // Hide feedback after 3 seconds
      setTimeout(() => {
        setShowFeedback(false);
      }, 3000);
    }
  };

  const formatPeriodInfo = (periodId: string) => {
    if (periodId === "custom" && customStart && customEnd) {
      try {
        const start = parseISO(customStart);
        const end = parseISO(customEnd);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return "Invalid date range";
        }
        return `${format(start, "MMM dd, yyyy")} - ${format(end, "MMM dd, yyyy")}`;
      } catch (error) {
        return "Invalid date range";
      }
    }
    
    const period = periodOptions.find(p => p.id === periodId);
    if (!period || periodId === "custom") return "";
    
    // Validate dataStartDate and dataEndDate
    if (isNaN(dataStartDate.getTime()) || isNaN(dataEndDate.getTime())) {
      return "Invalid data date range";
    }
    
    const range = period.getDateRange(dataStartDate, dataEndDate);
    const adjustedRange = {
      start: range.start < dataStartDate ? dataStartDate : range.start,
      end: range.end > dataEndDate ? dataEndDate : range.end
    };
    
    // Additional validation for adjusted dates
    if (isNaN(adjustedRange.start.getTime()) || isNaN(adjustedRange.end.getTime())) {
      return "Invalid adjusted date range";
    }
    
    const days = Math.ceil((adjustedRange.end.getTime() - adjustedRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const tradingDays = Math.ceil(days * 5/7); // Approximate trading days
    
    return `${format(adjustedRange.start, "MMM dd, yyyy")} - ${format(adjustedRange.end, "MMM dd, yyyy")} (${tradingDays} trading days)`;
  };

  return (
    <Card className={`bg-gradient-to-r from-slate-50 to-blue-50 border-blue-200 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Analysis Period
        </CardTitle>
        <CardDescription>
          Select time period for focused analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* React Feedback Message */}
        {showFeedback && (
          <div className={`p-3 rounded-lg border ${
            feedbackMessage.includes('Starting') 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {feedbackMessage.includes('Starting') ? (
                <Loader2 className="h-4 w-4 animate-spin text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${
                feedbackMessage.includes('Starting') ? 'text-green-800' : 'text-red-800'
              }`}>
                {feedbackMessage}
              </span>
            </div>
          </div>
        )}

        {/* Period Options Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {periodOptions.map((period) => (
            <Button
              key={period.id}
              variant={selectedPeriod === period.id ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodSelect(period.id)}
              disabled={isLoading}
              className={`h-auto p-3 flex flex-col items-center gap-1 transition-all ${
                selectedPeriod === period.id 
                  ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                  : "hover:bg-blue-50 hover:border-blue-300"
              }`}
            >
              <div className="flex items-center gap-1">
                {period.icon}
                <span className="font-medium text-xs">{period.name}</span>
              </div>
              <span className={`text-xs ${
                selectedPeriod === period.id ? "text-blue-100" : "text-gray-500"
              }`}>
                {period.description}
              </span>
            </Button>
          ))}
        </div>

        {/* Custom Date Range */}
        {selectedPeriod === "custom" && (
          <div className="space-y-3 p-4 bg-white rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  min={!isNaN(dataStartDate.getTime()) ? format(dataStartDate, "yyyy-MM-dd") : ""}
                  max={!isNaN(dataEndDate.getTime()) ? format(dataEndDate, "yyyy-MM-dd") : ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  min={!isNaN(dataStartDate.getTime()) ? format(dataStartDate, "yyyy-MM-dd") : ""}
                  max={!isNaN(dataEndDate.getTime()) ? format(dataEndDate, "yyyy-MM-dd") : ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <Button 
              onClick={handleCustomRangeApply}
              disabled={!customStart || !customEnd || isLoading}
              className="w-full"
            >
              Apply Custom Range
            </Button>
          </div>
        )}

        {/* Period Information */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Selected Period</span>
          </div>
          <p className="text-xs text-blue-700">
            {formatPeriodInfo(selectedPeriod)}
          </p>
        </div>

        {/* Progress Bar and Run Button */}
        <div className="space-y-3">
          {/* Debug Info */}
          <div className="bg-gray-100 p-2 rounded text-xs">
            Debug: selectedPeriod={selectedPeriod}, pendingPeriod={pendingPeriod ? 'exists' : 'null'}, isLoading={isLoading}, !isLoading={!isLoading}
          </div>
          
          {/* Progress Indicator */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Processing Analysis...</span>
              </div>
              <Progress value={undefined} className="w-full h-2" />
              <p className="text-xs text-blue-700">
                Analyzing period {pendingPeriod?.periodId === "custom" ? "custom range" : pendingPeriod?.periodId}...
              </p>
            </div>
          )}

          {/* Run Analysis Button - Always visible when not loading */}
          <div className="border-2 border-red-500 p-2">
            <p className="text-xs text-red-600 mb-2">Button Container (should always be visible when not loading)</p>
            <Button 
              onClick={handleRunAnalysis}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
              size="lg"
              disabled={isLoading}
            >
              <Play className="h-4 w-4 mr-2" />
              Run Period Analysis
            </Button>
          </div>

          {/* Pending Period Info */}
          {pendingPeriod && (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">Ready to Analyze</span>
              </div>
              <p className="text-xs text-amber-700">
                {pendingPeriod.periodId === "custom" && customStart && customEnd
                  ? (() => {
                      try {
                        const start = parseISO(customStart);
                        const end = parseISO(customEnd);
                        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                          return "Custom range: Invalid dates";
                        }
                        return `Custom range: ${format(start, "MMM dd, yyyy")} - ${format(end, "MMM dd, yyyy")}`;
                      } catch (error) {
                        return "Custom range: Invalid dates";
                      }
                    })()
                  : formatPeriodInfo(pendingPeriod.periodId)
                }
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Click "Run Period Analysis" to start processing
              </p>
            </div>
          )}
        </div>

        {/* Analysis Insights */}
        {!pendingPeriod && (
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
            <div className="text-xs text-amber-800">
              <strong>Period Analysis Benefits:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Focus on recent market conditions</li>
                <li>• Identify current factor effectiveness</li>
                <li>• Compare performance across periods</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PeriodSelector;
