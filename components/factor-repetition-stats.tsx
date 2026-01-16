"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Calendar, CalendarDays } from "lucide-react";
import { FACTOR_DESCRIPTIONS } from "@/lib/stock-factors";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface FactorData {
  Tx: number;
  Date: string;
  volume_spike: number;
  break_ma50: number;
  break_ma200: number;
  rsi_over_60: number;
  market_up: number | null;
  sector_up: number | null;
  earnings_window: number | null;
  news_positive: number | null;
  short_covering: number | null;
  macro_tailwind: number | null;
}

interface FactorRepetitionStatsProps {
  factorData: FactorData[];
}

export function FactorRepetitionStats({ factorData }: FactorRepetitionStatsProps) {
  // Get available years from the data
  const getAvailableYears = (): number[] => {
    if (!factorData || factorData.length === 0) return [];
    const years = new Set<number>();
    factorData.forEach(row => {
      const year = new Date(row.Date).getFullYear();
      if (!isNaN(year)) {
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending (most recent first)
  };

  const availableYears = getAvailableYears();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"yearly" | "monthly">("yearly");

  // Initialize selectedYear to most recent year if available
  useEffect(() => {
    if (availableYears.length > 0 && selectedYear === "all") {
      // Keep "all" as default, but could set to most recent: setSelectedYear(availableYears[0].toString());
    }
  }, [availableYears, selectedYear]);

  // Filter data by selected year
  const getFilteredData = (): FactorData[] => {
    if (!factorData || factorData.length === 0) return [];
    if (selectedYear === "all") return factorData;
    
    const year = parseInt(selectedYear);
    return factorData.filter(row => {
      const rowYear = new Date(row.Date).getFullYear();
      return rowYear === year;
    });
  };

  const filteredData = getFilteredData();

  // Convert Python logic: factor_counts = factor_df.drop(columns=["Tx", "Date"]).sum().sort_values(ascending=False)
  const calculateFactorCounts = () => {
    if (!filteredData || filteredData.length === 0) {
      console.log('[FactorRepetitionStats] No factor data provided');
      return [];
    }

    console.log(`[FactorRepetitionStats] Processing ${filteredData.length} factor records`);

    // Extract factor columns (exclude Tx and Date)
    const factorColumns = [
      'volume_spike', 'break_ma50', 'break_ma200', 'rsi_over_60',
      'market_up', 'sector_up', 'earnings_window', 'news_positive',
      'short_covering', 'macro_tailwind'
    ];

    // Calculate sum for each factor column
    const factorCounts: { [key: string]: number } = {};
    
    factorColumns.forEach(factor => {
      factorCounts[factor] = filteredData.reduce((sum, row) => {
        const value = row[factor as keyof FactorData];
        // Count values that are true or 1 (handle both boolean and number formats)
        if (value === true || value === 1) {
          return sum + 1;
        }
        return sum;
      }, 0);
    });

    // Debug: Log raw counts
    console.log('[FactorRepetitionStats] Raw factor counts:', factorCounts);

    // Sort by count in descending order and convert to array format
    const sortedFactors = Object.entries(factorCounts)
      .filter(([_, count]) => count > 0) // Only include factors that appear
      .sort((a, b) => b[1] - a[1]) // Sort descending
      .map(([factor, count]) => ({
        factor,
        count,
        percentage: ((count / filteredData.length) * 100).toFixed(1)
      }));

    console.log(`[FactorRepetitionStats] Found ${sortedFactors.length} factors with count > 0`);
    return sortedFactors;
  };

  // Calculate yearly statistics for the chart
  const calculateYearlyStats = () => {
    if (!filteredData || filteredData.length === 0) return [];

    const factorColumns = [
      'volume_spike', 'break_ma50', 'break_ma200', 'rsi_over_60',
      'market_up', 'sector_up', 'earnings_window', 'news_positive',
      'short_covering', 'macro_tailwind'
    ];

    // Group data by year
    const yearlyData: { [year: number]: FactorData[] } = {};
    filteredData.forEach(row => {
      const year = new Date(row.Date).getFullYear();
      if (!isNaN(year)) {
        if (!yearlyData[year]) {
          yearlyData[year] = [];
        }
        yearlyData[year].push(row);
      }
    });

    // Calculate factor counts for each year
    const yearlyStats = Object.entries(yearlyData).map(([year, rows]) => {
      const stats: { year: string; [key: string]: number | string } = { year };
      
      factorColumns.forEach(factor => {
        const count = rows.reduce((sum, row) => {
          const value = row[factor as keyof FactorData];
          if (value === true || value === 1) {
            return sum + 1;
          }
          return sum;
        }, 0);
        stats[factor] = count;
      });

      return stats;
    }).sort((a, b) => parseInt(a.year) - parseInt(b.year)); // Sort by year ascending

    return yearlyStats;
  };

  // Format month label for display (e.g., "2024-01" -> "Jan 2024")
  const formatMonthLabel = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  };

  // Calculate monthly statistics for the chart
  const calculateMonthlyStats = () => {
    if (!filteredData || filteredData.length === 0) return [];

    const factorColumns = [
      'volume_spike', 'break_ma50', 'break_ma200', 'rsi_over_60',
      'market_up', 'sector_up', 'earnings_window', 'news_positive',
      'short_covering', 'macro_tailwind'
    ];

    // Group data by year-month (YYYY-MM format)
    const monthlyData: { [monthKey: string]: FactorData[] } = {};
    filteredData.forEach(row => {
      const date = new Date(row.Date);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // getMonth() returns 0-11
        const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = [];
        }
        monthlyData[monthKey].push(row);
      }
    });

    // Calculate factor counts for each month
    const monthlyStats = Object.entries(monthlyData).map(([monthKey, rows]) => {
      const stats: { month: string; monthLabel: string; [key: string]: number | string } = { 
        month: monthKey,
        monthLabel: formatMonthLabel(monthKey)
      };
      
      factorColumns.forEach(factor => {
        const count = rows.reduce((sum, row) => {
          const value = row[factor as keyof FactorData];
          if (value === true || value === 1) {
            return sum + 1;
          }
          return sum;
        }, 0);
        stats[factor] = count;
      });

      return stats;
    }).sort((a, b) => a.month.localeCompare(b.month)); // Sort by month ascending

    return monthlyStats;
  };

  const getFactorColor = (category: string) => {
    switch (category) {
      case "technical":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "market":
        return "bg-green-100 text-green-800 border-green-200";
      case "fundamental":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "sentiment":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const factorCounts = calculateFactorCounts();
  const yearlyStats = calculateYearlyStats();
  const monthlyStats = calculateMonthlyStats();

  const getFactorDisplayName = (factorKey: string) => {
    const description = FACTOR_DESCRIPTIONS[factorKey as keyof typeof FACTOR_DESCRIPTIONS];
    return description ? description.name : factorKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getFactorCategory = (factorKey: string) => {
    const description = FACTOR_DESCRIPTIONS[factorKey as keyof typeof FACTOR_DESCRIPTIONS];
    return description ? description.category : 'other';
  };

  // Get top factors for chart (limit to top 5 for readability)
  const getTopFactorsForChart = () => {
    return factorCounts.slice(0, 5).map(item => item.factor);
  };

  // Prepare yearly chart data with top factors
  const prepareYearlyChartData = () => {
    const topFactors = getTopFactorsForChart();
    return yearlyStats.map(yearData => {
      const chartData: { year: string; [key: string]: number | string } = { year: yearData.year };
      topFactors.forEach(factor => {
        chartData[getFactorDisplayName(factor)] = yearData[factor] as number;
      });
      return chartData;
    });
  };

  // Prepare monthly chart data with top factors
  const prepareMonthlyChartData = () => {
    const topFactors = getTopFactorsForChart();
    return monthlyStats.map(monthData => {
      const chartData: { month: string; monthLabel: string; [key: string]: number | string } = { 
        month: monthData.month,
        monthLabel: monthData.monthLabel
      };
      topFactors.forEach(factor => {
        chartData[getFactorDisplayName(factor)] = monthData[factor] as number;
      });
      return chartData;
    });
  };

  const yearlyChartData = prepareYearlyChartData();
  const monthlyChartData = prepareMonthlyChartData();
  const topFactorsForChart = getTopFactorsForChart();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Repeated Factors
            </CardTitle>
            <CardDescription>
              Factor repetition statistics - Key factors that appear most frequently across analyzed transactions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {availableYears.length > 0 && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {factorCounts.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
            <p className="text-muted-foreground">
              {filteredData && filteredData.length > 0 
                ? `No factors detected in ${filteredData.length} transaction(s)${selectedYear !== "all" ? ` for ${selectedYear}` : ""}. All factor values are 0 or null.`
                : "No factor data available. Generate factor table first to see repetition statistics."}
            </p>
            {filteredData && filteredData.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                This may indicate that no significant factors were identified in the analyzed data.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{filteredData.length}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedYear === "all" ? "Total Transactions" : `Transactions (${selectedYear})`}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{factorCounts.length}</div>
                <div className="text-sm text-muted-foreground">Active Factors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {factorCounts[0]?.count || 0}
                </div>
                <div className="text-sm text-muted-foreground">Top Factor Count</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {factorCounts[0]?.percentage || 0}%
                </div>
                <div className="text-sm text-muted-foreground">Top Factor %</div>
              </div>
            </div>

            {/* View Mode Tabs */}
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "yearly" | "monthly")} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="yearly" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Yearly View
                </TabsTrigger>
                <TabsTrigger value="monthly" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Monthly View
                </TabsTrigger>
              </TabsList>

              {/* Yearly Chart */}
              <TabsContent value="yearly">
                {yearlyStats.length > 0 && topFactorsForChart.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-lg mb-4">Yearly Factor Trends</h4>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={yearlyChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="year" 
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px'
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="rect"
                          />
                          {topFactorsForChart.map((factor, index) => {
                            const colors = [
                              '#3b82f6', // blue
                              '#10b981', // green
                              '#8b5cf6', // purple
                              '#f59e0b', // orange
                              '#ef4444', // red
                            ];
                            return (
                              <Bar 
                                key={factor}
                                dataKey={getFactorDisplayName(factor)}
                                fill={colors[index % colors.length]}
                                radius={[4, 4, 0, 0]}
                              />
                            );
                          })}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Showing top {topFactorsForChart.length} factors by frequency across years
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Monthly Chart */}
              <TabsContent value="monthly">
                {monthlyStats.length > 0 && topFactorsForChart.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-lg mb-4">Monthly Factor Cycles</h4>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="monthLabel" 
                            tick={{ fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            interval="preserveStartEnd"
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px'
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="line"
                          />
                          {topFactorsForChart.map((factor, index) => {
                            const colors = [
                              '#3b82f6', // blue
                              '#10b981', // green
                              '#8b5cf6', // purple
                              '#f59e0b', // orange
                              '#ef4444', // red
                            ];
                            return (
                              <Line 
                                key={factor}
                                type="monotone"
                                dataKey={getFactorDisplayName(factor)}
                                stroke={colors[index % colors.length]}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Showing top {topFactorsForChart.length} factors by frequency across months - helps identify cyclical patterns
                    </p>
                    
                    {/* Monthly Summary Table */}
                    <div className="mt-6 rounded-lg border bg-muted/40 p-4">
                      <h5 className="font-semibold mb-3">Monthly Factor Summary</h5>
                      <div className="overflow-x-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {monthlyStats.slice(-12).map((monthData) => (
                            <div key={monthData.month} className="p-2 rounded border bg-background">
                              <div className="font-medium text-sm mb-1">{monthData.monthLabel}</div>
                              <div className="text-xs text-muted-foreground">
                                Total: {topFactorsForChart.reduce((sum, factor) => {
                                  return sum + (monthData[factor] as number || 0);
                                }, 0)} occurrences
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Factor Counts List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Factor Frequency Ranking</h4>
              {factorCounts.map((item, index) => (
                <div key={item.factor} className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {index + 1}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={getFactorColor(getFactorCategory(item.factor))}
                    >
                      {getFactorDisplayName(item.factor)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold text-lg">{item.count}</div>
                      <div className="text-sm text-muted-foreground">{item.percentage}%</div>
                    </div>
                    <div className="w-20 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Key Insights */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Key Insights</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>{getFactorDisplayName(factorCounts[0]?.factor)}</strong> is the most frequent factor ({factorCounts[0]?.percentage}% of transactions)</li>
                {factorCounts.length >= 3 && (
                  <li>• Top 3 factors account for {((parseInt(factorCounts[0]?.percentage) + parseInt(factorCounts[1]?.percentage) + parseInt(factorCounts[2]?.percentage)) / 3).toFixed(1)}% of occurrences</li>
                )}
                <li>• {factorCounts.filter(f => getFactorCategory(f.factor) === 'technical').length} technical factors identified</li>
                <li>• {factorCounts.filter(f => getFactorCategory(f.factor) === 'market' || getFactorCategory(f.factor) === 'sentiment').length} market/sentiment factors identified</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
