"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { getDealerEngagementSafe, getSalesByCountyFlSafe } from "@/lib/mbic-supabase";
import type { DealerEngagementRow, CountySalesRow } from "@/lib/mbic-supabase";
import { FloridaRegionalSalesMap } from "./florida-regional-sales-map";
import { TrendingUp, TrendingDown, Eye, Download, ChevronLeft, ChevronRight, MoreVertical, ArrowUpDown, Filter } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "@/components/ui/date-range-picker";
import { format } from "date-fns";
import { fmtUSD0 } from "@/lib/format";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type DealerActivityData = {
  month: string;
  monthLabel: string;
  activeDealerPct: number;
  dealerCount: number;
  totalDealers: number;
};

type MonthDetails = {
  month_date: string;
  active_dealers: number;
  total_dealers: number;
  active_pct: number;
  total_revenue: number;
  prior_month_date: string;
  prior_active_dealers: number;
  prior_total_dealers: number;
  prior_active_pct: number;
  prior_total_revenue: number;
  revenue_change_pct: number;
  engagement_change_pct: number;
  revenue_trend: "increase" | "decrease";
  engagement_trend: "increase" | "decrease";
};

type ReactivatedDealer = {
  customer_id: number;
  dealer_name: string;
  rep_name: string;
  last_purchase_date: string;
  days_inactive: number;
  reactivation_period: string;
  current_month_revenue: number;
  current_month_orders: number;
};

type ActiveDealer = {
  customer_id: number;
  dealer_name: string;
  rep_name: string;
  total_revenue: number;
  order_count: number;
};

type TeamVsTarget = {
  rep_id: number;
  rep_name: string;
  rep_initials: string;
  target_amount: number;
  actual_sales: number;
  variance_amount: number;
  variance_pct: number;
  achievement_pct: number;
  status: "achieved" | "near" | "below";
};

type InactiveDealer = {
  customer_id: number;
  dealer_name: string;
  rep_name: string;
  last_purchase_date: string | null;
  days_inactive: number | null;
};

export function DealerSalesPulse() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [dealerActivityData, setDealerActivityData] = useState<DealerActivityData[]>([]);

  // Helper function to calculate gradient color based on achievement percentage
  const getAchievementColor = (achievementPct: number): string => {
    if (achievementPct < 50) {
      // Red: less than 50%
      return "#ef4444"; // red-500
    } else if (achievementPct <= 70) {
      // Red to Yellow: 51% - 70%
      const ratio = (achievementPct - 50) / 20; // 0 to 1
      return interpolateColor("#ef4444", "#eab308", ratio);
    } else if (achievementPct <= 85) {
      // Yellow to Pale Green: 71% - 85%
      const ratio = (achievementPct - 70) / 15; // 0 to 1
      return interpolateColor("#eab308", "#84cc16", ratio);
    } else {
      // Pale Green to Vivid Green: 86% - 100%+
      const ratio = Math.min((achievementPct - 85) / 15, 1); // 0 to 1, capped at 1
      return interpolateColor("#84cc16", "#22c55e", ratio);
    }
  };

  // Helper function to interpolate between two hex colors
  const interpolateColor = (color1: string, color2: string, ratio: number): string => {
    const hex = (x: string) => parseInt(x, 16);
    const r1 = hex(color1.substring(1, 3));
    const g1 = hex(color1.substring(3, 5));
    const b1 = hex(color1.substring(5, 7));
    const r2 = hex(color2.substring(1, 3));
    const g2 = hex(color2.substring(3, 5));
    const b2 = hex(color2.substring(5, 7));

    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Drawer state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [monthDetails, setMonthDetails] = useState<MonthDetails | null>(null);
  const [reactivatedDealers, setReactivatedDealers] = useState<ReactivatedDealer[]>([]);
  const [activeDealers, setActiveDealers] = useState<ActiveDealer[]>([]);
  const [inactiveDealers, setInactiveDealers] = useState<InactiveDealer[]>([]);
  const [teamVsTargets, setTeamVsTargets] = useState<TeamVsTarget[]>([]);
  const [regionalSales, setRegionalSales] = useState<CountySalesRow[]>([]);
  const [monthStart, setMonthStart] = useState<string>("");
  const [monthEnd, setMonthEnd] = useState<string>("");
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;
  const [sortField, setSortField] = useState<'days_inactive' | 'current_month_revenue' | 'current_month_orders'>('days_inactive');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedReps, setSelectedReps] = useState<string[]>([]);

  // Initialize date range to "This Year" (Jan 1 to today)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), 0, 1), // January 1 of current year
    to: new Date(), // Today
  });

  useEffect(() => {
    async function fetchDealerActivity() {
      try {
        setLoading(true);

        // Convert date range to ISO format for Supabase
        const fromDate = format(dateRange.from, "yyyy-MM-dd");
        const toDate = format(dateRange.to, "yyyy-MM-dd");

        const result = await getDealerEngagementSafe(fromDate, toDate);

        if (result.data) {
          // Filter and transform the data for our chart
          // Show ALL months in the selected date range (with or without sales)
          // Use string comparison to avoid timezone bugs
          const chartData: DealerActivityData[] = result.data
            .filter((row: DealerEngagementRow) => {
              // Only filter by date range - include months with 0 sales
              // Use string comparison (YYYY-MM-DD format) to avoid timezone issues
              return row.month >= fromDate && row.month <= toDate;
            })
            .map((row: DealerEngagementRow) => {
              // active_pct is already a percentage (e.g., 13.22 means 13.22%)
              const activePct = row.active_pct;

              // Parse the month string (format: "2025-01-01") in a timezone-safe way
              // CRITICAL: Use local date constructor to avoid timezone shifting
              const parts = row.month.split('-');
              const year = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
              const dateObj = new Date(year, month, 1);

              // X-axis: Show only month name (e.g., "Jan", "Feb")
              const monthLabel = dateObj.toLocaleDateString("en-US", {
                month: "short",
              });

              return {
                month: row.month,
                monthLabel,
                activeDealerPct: Number(activePct.toFixed(1)),
                dealerCount: row.active_cnt,
                totalDealers: row.total_assigned,
              };
            });

          setDealerActivityData(chartData);

          // Auto-select the most recent month
          if (chartData.length > 0) {
            setSelectedMonth(chartData[chartData.length - 1].month);
          }
        }
      } catch (error) {
        console.error("Error fetching dealer activity:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDealerActivity();
  }, [dateRange]);

  // Fetch regional sales data when selected month changes
  useEffect(() => {
    async function fetchRegionalSales() {
      if (!selectedMonth) {
        setRegionalSales([]);
        return;
      }

      try {
        // Calculate month start and end dates
        const calcMonthStart = selectedMonth; // Already in YYYY-MM-DD format
        const parts = selectedMonth.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const calcMonthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        setMonthStart(calcMonthStart);
        setMonthEnd(calcMonthEnd);

        const result = await getSalesByCountyFlSafe(calcMonthStart, calcMonthEnd);

        if (result.data) {
          setRegionalSales(result.data);
        }
      } catch (error) {
        console.error("Error fetching regional sales:", error);
        setRegionalSales([]);
      }
    }

    fetchRegionalSales();
  }, [selectedMonth]);

  const handleBarClick = (data: DealerActivityData) => {
    setSelectedMonth(data.month);
    handleViewDetails(data.month);
  };

  const handleViewDetails = async (monthDate: string) => {
    setSheetOpen(true);
    setDrawerLoading(true);
    setPage(0); // Reset pagination

    try {
      const response = await fetch(
        `/api/dealer-month-details?targetMonth=${monthDate}`
      );
      const data = await response.json();

      setMonthDetails(data.monthDetails);
      setReactivatedDealers(data.reactivatedDealers || []);
      setActiveDealers(data.activeDealers || []);
      setInactiveDealers(data.inactiveDealers || []);

      // Fetch team vs targets data
      try {
        const targetsResponse = await fetch(`/api/team-vs-targets?targetMonth=${monthDate}`);
        const targetsData = await targetsResponse.json();
        // Filter out Dismissed and Intercompany reps (trim to handle trailing spaces)
        const filteredData = (targetsData.data || []).filter(
          (rep: TeamVsTarget) => {
            const repName = rep.rep_name?.trim().toLowerCase();
            return repName !== "dismissed" && repName !== "intercompany";
          }
        );
        setTeamVsTargets(filteredData);
      } catch (err) {
        console.error("Error fetching team vs targets:", err);
        setTeamVsTargets([]);
      }
    } catch (error) {
      console.error("Error fetching month details:", error);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleDealerNavigation = (dealerId: number, repName: string) => {
    const params = new URLSearchParams();
    if (repName && repName !== "Unassigned") {
      params.set("rep", repName);
    }
    params.set("dealer", dealerId.toString());
    router.push(`/sales?${params.toString()}#sales-performance-by-dealer`);
  };

  const downloadCSV = (data: Record<string, unknown>[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(h => {
        const key = h.toLowerCase().replace(/ /g, "_");
        return `"${row[key] || ""}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const goalPercentage = 55;

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    setSelectedMonth(null); // Reset selected month when date range changes
  };

  const getRepInitials = (repName: string): string => {
    if (repName === "Unassigned") return "N/A";
    return repName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSort = (field: 'days_inactive' | 'current_month_revenue' | 'current_month_orders') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(0); // Reset to first page when sorting
  };

  // Get unique reps from reactivated dealers
  const uniqueReps = Array.from(new Set(reactivatedDealers.map(d => d.rep_name))).sort();

  // Filter, sort and paginate reactivated dealers
  const filteredDealers = selectedReps.length === 0
    ? reactivatedDealers
    : reactivatedDealers.filter(d => selectedReps.includes(d.rep_name));

  const sortedDealers = [...filteredDealers].sort((a, b) => {
    const aVal = a[sortField] || 0;
    const bVal = b[sortField] || 0;
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const paginatedDealers = sortedDealers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Calculate reactivated dealers revenue stats (for filtered dealers)
  const reactivatedRevenue = filteredDealers.reduce((sum, d) => sum + (d.current_month_revenue || 0), 0);
  const reactivatedPct = monthDetails ? ((reactivatedRevenue / monthDetails.total_revenue) * 100) : 0;

  // Rep filter handlers
  const toggleRepFilter = (repName: string) => {
    setSelectedReps(prev =>
      prev.includes(repName)
        ? prev.filter(r => r !== repName)
        : [...prev, repName]
    );
    setPage(0); // Reset to first page when filtering
  };

  const toggleAllReps = () => {
    if (selectedReps.length === uniqueReps.length) {
      setSelectedReps([]);
    } else {
      setSelectedReps(uniqueReps);
    }
    setPage(0);
  };

  const formatMonth = (dateStr: string) => {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const dateObj = new Date(year, month, 1);
    return dateObj.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const formatMonthShort = (dateStr: string) => {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const dateObj = new Date(year, month, 1);
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
    });
  };

  return (
    <>
      <Card className="col-span-full rounded-2xl border border-black/5 bg-card shadow-sm">
        <CardHeader className="p-4 pb-0 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-2xl font-semibold tracking-tight">Dealer &amp; Sales Pulse</CardTitle>
            <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            {/* Parent Chart - Top Left - Dealer Activity */}
            <div className="col-span-1 row-span-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Dealer Activity</h3>
                <div className="text-xs text-gray-500">
                  Goal: <span className="font-semibold text-blue-600">{goalPercentage}%</span>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-sm text-gray-500">Loading dealer activity...</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={dealerActivityData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      tickLine={false}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload[0]) {
                          const data = payload[0].payload as DealerActivityData;
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                              <p className="text-xs font-semibold text-gray-900 mb-1">{data.monthLabel}</p>
                              <p className="text-xs text-gray-700">
                                Active: <span className="font-semibold">{data.activeDealerPct}%</span>
                              </p>
                              <p className="text-xs text-gray-500">
                                {data.dealerCount} of {data.totalDealers} dealers
                              </p>
                              <p className="text-xs text-blue-600 mt-2 font-medium">Click bar for details</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      y={goalPercentage}
                      stroke="#3b82f6"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      label={{
                        value: `Goal: ${goalPercentage}%`,
                        position: "right",
                        fill: "#3b82f6",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                    <Bar
                      dataKey="activeDealerPct"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => handleBarClick(data as unknown as DealerActivityData)}
                    >
                      {dealerActivityData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.month === selectedMonth
                              ? "#2563eb"
                              : entry.activeDealerPct >= goalPercentage
                              ? "#10b981"
                              : "#f59e0b"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {selectedMonth && (
                <div className="mt-3 text-xs text-gray-600 text-center">
                  Selected: <span className="font-semibold">
                    {formatMonth(selectedMonth)}
                  </span>
                </div>
              )}
            </div>

            {/* Child Chart 1 - Top Right - Sales Trends per Category */}
            <div className="col-span-1 row-span-1 border border-dashed border-gray-300 rounded-lg p-4 sm:p-6 flex items-center justify-center min-h-[200px] lg:min-h-[300px]">
              <div className="text-center text-gray-500">
                <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium">Sales Trends per Category</p>
                <p className="text-xs mt-1 text-gray-400">Coming in Phase 5</p>
              </div>
            </div>

            {/* Child Chart 2 - Bottom Left - Team vs Targets */}
            <div className="col-span-1 row-span-1 border border-gray-200 rounded-lg p-4 sm:p-6 bg-white min-h-[200px] lg:min-h-[300px]">
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-900">Team vs Targets</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedMonth ? `Performance for ${formatMonth(selectedMonth)}` : "Select a month to view"}
                </p>
              </div>

              {drawerLoading ? (
                <div className="flex items-center justify-center h-48">
                  <LoadingSpinner size="sm" />
                </div>
              ) : teamVsTargets.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-400">
                  <div className="text-center">
                    <TrendingUp className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No data available</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, teamVsTargets.length * 25)}>
                  <BarChart
                    data={teamVsTargets}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <YAxis
                      type="category"
                      dataKey="rep_initials"
                      width={30}
                      tick={{ fontSize: 10 }}
                      interval={0}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload[0]) {
                          const data = payload[0].payload as TeamVsTarget;
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                              <p className="text-xs font-semibold text-gray-900 mb-1">{data.rep_name}</p>
                              <p className="text-xs text-gray-700">
                                Actual: <span className="font-semibold">{fmtUSD0(data.actual_sales)}</span>
                              </p>
                              <p className="text-xs text-gray-700">
                                Target: <span className="font-semibold">{fmtUSD0(data.target_amount)}</span>
                              </p>
                              <p className={`text-xs mt-1 font-medium ${data.variance_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {data.variance_pct >= 0 ? '+' : ''}{data.variance_pct.toFixed(1)}% ({data.achievement_pct.toFixed(0)}% of target)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="actual_sales" radius={[0, 4, 4, 0]}>
                      {teamVsTargets.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getAchievementColor(entry.achievement_pct)}
                        />
                      ))}
                    </Bar>
                    <ReferenceLine
                      x={teamVsTargets[0]?.target_amount || 200000}
                      stroke="#6b7280"
                      strokeDasharray="3 3"
                      strokeWidth={1.5}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Child Chart 3 - Bottom Right - Sales Per Region */}
            <div className="col-span-1 row-span-1 border border-gray-200 rounded-lg p-4 sm:p-6 min-h-[200px] lg:min-h-[300px] bg-white flex flex-col">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="text-sm font-semibold text-foreground">Sales Per Region (Florida)</h3>
                {selectedMonth && (
                  <span className="text-xs text-muted-foreground">
                    {formatMonth(selectedMonth)}
                  </span>
                )}
              </div>
              {!selectedMonth ? (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  Select a month to view regional sales
                </div>
              ) : regionalSales.length === 0 ? (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Loading...</span>
                </div>
              ) : (
                <div key={selectedMonth} className="flex-1 min-h-0">
                  <FloridaRegionalSalesMap
                    data={regionalSales}
                    fromDate={monthStart}
                    toDate={monthEnd}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Month Details Drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col overflow-hidden">
          <SheetHeader className="space-y-3 flex-shrink-0">
            <SheetTitle className="text-lg font-semibold">
              Dealer Pulse: {selectedMonth && formatMonth(selectedMonth)}
            </SheetTitle>
            <SheetDescription asChild>
              <div>
                {drawerLoading ? (
                  <div className="py-8">
                    <LoadingSpinner />
                  </div>
                ) : monthDetails ? (
                  <div className="space-y-4">
                    {/* Storytelling Section */}
                    <div className="text-sm leading-relaxed text-foreground">
                      <p>
                        In <span className="font-semibold">{formatMonth(monthDetails.month_date)}</span>,{" "}
                        <span className="font-semibold">{monthDetails.active_dealers}</span> Active dealers
                        representing <span className="font-semibold">{monthDetails.active_pct.toFixed(1)}%</span> of{" "}
                        <span className="font-semibold">{monthDetails.total_dealers}</span> Assigned dealers,
                        brought a total Gross Revenue of{" "}
                        <span className="font-semibold text-green-600">{fmtUSD0(monthDetails.total_revenue)}</span>.
                      </p>
                      <p className="mt-3">
                        That&apos;s a <span className={`font-semibold ${monthDetails.revenue_trend === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                          {Math.abs(monthDetails.revenue_change_pct).toFixed(1)}% {monthDetails.revenue_trend}
                        </span> compared with the prior month of{" "}
                        <span className="font-medium">{formatMonthShort(monthDetails.prior_month_date)}</span>.
                      </p>
                      <p className="mt-3">
                        As for dealer engagement, that&apos;s a{" "}
                        <span className={`font-semibold ${monthDetails.engagement_trend === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                          {Math.abs(monthDetails.engagement_change_pct).toFixed(1)}% {monthDetails.engagement_trend}
                        </span> compared with the prior month.
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200" />

                    {/* Download Options */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Download Lists</h3>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadCSV(
                              activeDealers,
                              `active-dealers-${selectedMonth}.csv`,
                              ["Customer ID", "Dealer Name", "Rep Name", "Total Revenue", "Order Count"]
                            )
                          }
                          className="justify-start"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Active Dealers ({activeDealers.length})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadCSV(
                              inactiveDealers,
                              `inactive-dealers-${selectedMonth}.csv`,
                              ["Customer ID", "Dealer Name", "Rep Name", "Last Purchase Date", "Days Inactive"]
                            )
                          }
                          className="justify-start"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Inactive Dealers ({inactiveDealers.length})
                        </Button>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200" />
                  </div>
                ) : null}
              </div>
            </SheetDescription>
          </SheetHeader>

          {/* Reactivated Dealers Section */}
          {!drawerLoading && monthDetails && (
            <div className="mt-2 flex-1 flex flex-col min-h-0 px-6">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="text-sm font-semibold text-foreground">
                  Reactivated Dealers ({filteredDealers.length})
                </h3>
                {reactivatedDealers.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          downloadCSV(
                            filteredDealers,
                            `reactivated-dealers-${selectedMonth}.csv`,
                            ["Customer ID", "Dealer Name", "Rep Name", "Last Purchase Date", "Days Inactive", "Reactivation Period", "Current Month Revenue", "Current Month Orders"]
                          )
                        }
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Narrative Story */}
              {filteredDealers.length > 0 && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-3 flex-shrink-0">
                  <span className="font-semibold">{filteredDealers.length}</span> reactivated dealers brought a total revenue of{" "}
                  <span className="font-semibold text-green-600">{fmtUSD0(reactivatedRevenue)}</span>, representing{" "}
                  <span className="font-semibold">{reactivatedPct.toFixed(1)}%</span> of the month&apos;s total revenue.
                </p>
              )}

              {reactivatedDealers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reactivated dealers for this month</p>
              ) : (
                <>
                  {/* Table */}
                  <div className="border rounded-md flex-shrink-0 mb-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[140px]">Dealer</TableHead>
                          <TableHead className="w-[60px]">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2">
                                  <div className="flex items-center gap-1">
                                    Rep
                                    <Filter className={`h-3 w-3 ${selectedReps.length > 0 ? 'text-blue-600' : ''}`} />
                                  </div>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-2" align="start">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 pb-2 border-b">
                                    <Checkbox
                                      checked={selectedReps.length === uniqueReps.length}
                                      onCheckedChange={toggleAllReps}
                                    />
                                    <label className="text-sm font-medium cursor-pointer" onClick={toggleAllReps}>
                                      Select All
                                    </label>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto space-y-2">
                                    {uniqueReps.map((rep) => (
                                      <div key={rep} className="flex items-center gap-2">
                                        <Checkbox
                                          checked={selectedReps.includes(rep) || selectedReps.length === 0}
                                          onCheckedChange={() => toggleRepFilter(rep)}
                                        />
                                        <label
                                          className="text-sm cursor-pointer flex-1"
                                          onClick={() => toggleRepFilter(rep)}
                                        >
                                          {rep}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('days_inactive')}
                          >
                            <div className="flex items-center gap-1">
                              Inactive
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('current_month_revenue')}
                          >
                            <div className="flex items-center gap-1">
                              Revenue
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('current_month_orders')}
                          >
                            <div className="flex items-center gap-1">
                              Orders
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedDealers.map((dealer) => (
                          <TableRow key={dealer.customer_id}>
                            <TableCell>
                              <p className="font-medium text-sm truncate" title={dealer.dealer_name}>
                                {dealer.dealer_name.length > 20 ? `${dealer.dealer_name.slice(0, 20)}...` : dealer.dealer_name}
                              </p>
                            </TableCell>
                            <TableCell>
                              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                                {getRepInitials(dealer.rep_name)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-medium">{dealer.reactivation_period}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">{fmtUSD0(dealer.current_month_revenue)}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{dealer.current_month_orders}</span>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleDealerNavigation(dealer.customer_id, dealer.rep_name)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {sortedDealers.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
                      <span>
                        Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sortedDealers.length)} of {sortedDealers.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                          disabled={page === 0}
                          className="h-7 w-7"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span>
                          Page {page + 1} / {Math.ceil(sortedDealers.length / PAGE_SIZE)}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => setPage((p) => Math.min(Math.ceil(sortedDealers.length / PAGE_SIZE) - 1, p + 1))}
                          disabled={page >= Math.ceil(sortedDealers.length / PAGE_SIZE) - 1}
                          className="h-7 w-7"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
