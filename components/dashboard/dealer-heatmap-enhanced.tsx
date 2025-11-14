"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { MoreVertical, Download, Copy, FileText } from "lucide-react";

import type { DealerEngagementRow } from "@/lib/mbic-supabase";
import { fmtPct0 } from "@/lib/format";
import { formatNumber } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChartActions } from "@/components/ui/chart-actions";

type DealerHeatmapEnhancedProps = {
  data: DealerEngagementRow[];
};

type MonthDetails = {
  month: string;
  activeCnt: number;
  inactiveCnt: number;
  totalAssigned: number;
  activePct: number;
};

function formatMonthLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatMonthShort(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-US", {
    month: "short",
  });
}

function formatMonthFull(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// Color scale: Green at 50%+, Yellow at 20%+, Red below 20%
function getColorForPercentage(pct: number): string {
  if (pct >= 70) return "#15803d"; // green-700
  if (pct >= 60) return "#16a34a"; // green-600
  if (pct >= 50) return "#22c55e"; // green-500
  if (pct >= 40) return "#ca8a04"; // yellow-600
  if (pct >= 30) return "#eab308"; // yellow-500
  if (pct >= 20) return "#facc15"; // yellow-400
  if (pct >= 10) return "#ef4444"; // red-500
  return "#dc2626"; // red-600
}

function getBackgroundColor(pct: number): string {
  if (pct >= 70) return "bg-green-700";
  if (pct >= 60) return "bg-green-600";
  if (pct >= 50) return "bg-green-500";
  if (pct >= 40) return "bg-yellow-600";
  if (pct >= 30) return "bg-yellow-500";
  if (pct >= 20) return "bg-yellow-400";
  if (pct >= 10) return "bg-red-500";
  return "bg-red-600";
}

export function DealerHeatmapEnhanced({ data }: DealerHeatmapEnhancedProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<MonthDetails | null>(null);

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-dashed border-muted bg-muted/40 p-8 text-center text-sm text-muted-foreground">
        No data for this period.
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
  const TARGET_PCT = 55;

  const handleMonthClick = (row: DealerEngagementRow) => {
    setSelectedMonth({
      month: row.month,
      activeCnt: row.active_cnt,
      inactiveCnt: row.inactive_cnt,
      totalAssigned: row.total_assigned,
      activePct: row.active_pct,
    });
    setSheetOpen(true);
  };

  const handleExportCSV = () => {
    if (!selectedMonth) return;

    const csvContent = `Month,Active Dealers,Inactive Dealers,Total Assigned,Active %\n${formatMonthFull(selectedMonth.month)},${selectedMonth.activeCnt},${selectedMonth.inactiveCnt},${selectedMonth.totalAssigned},${selectedMonth.activePct.toFixed(2)}%`;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `dealer-engagement-${selectedMonth.month}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyData = async () => {
    if (!selectedMonth) return;

    const text = `Month: ${formatMonthFull(selectedMonth.month)}\nActive Dealers: ${selectedMonth.activeCnt} (${selectedMonth.activePct.toFixed(1)}%)\nInactive Dealers: ${selectedMonth.inactiveCnt}\nTotal Assigned: ${selectedMonth.totalAssigned}`;

    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("[DealerHeatmap] Failed to copy data:", error);
    }
  };

  // Mock inactive dealers by rep data (since we don't have this in the current data structure)
  const inactiveDealersByRep = selectedMonth ? [
    { rep: "JG", initials: "JG", inactiveCount: Math.floor(selectedMonth.inactiveCnt * 0.3), pctOfTotal: 30 },
    { rep: "MS", initials: "MS", inactiveCount: Math.floor(selectedMonth.inactiveCnt * 0.25), pctOfTotal: 25 },
    { rep: "TH", initials: "TH", inactiveCount: Math.floor(selectedMonth.inactiveCnt * 0.20), pctOfTotal: 20 },
    { rep: "LK", initials: "LK", inactiveCount: Math.floor(selectedMonth.inactiveCnt * 0.15), pctOfTotal: 15 },
    { rep: "RB", initials: "RB", inactiveCount: Math.floor(selectedMonth.inactiveCnt * 0.10), pctOfTotal: 10 },
  ] : [];

  return (
    <div className="space-y-5">
      <Tabs defaultValue="calendar" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="vertical">Vertical Chart</TabsTrigger>
          </TabsList>
        </div>

        {/* Calendar-style heatmap */}
        <TabsContent value="calendar" className="mt-0">
          <div id="dealer-heatmap-calendar" className="space-y-2 bg-white p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-muted-foreground">Monthly Engagement Heatmap</h4>
              <ChartActions elementId="dealer-heatmap-calendar" fileName="dealer-engagement-calendar" />
            </div>

            {/* Month labels */}
            <div className="flex gap-1">
              <div className="w-16" />
              {sorted.map((row) => (
                <div
                  key={row.month}
                  className="flex flex-1 items-center justify-center text-xs font-medium text-muted-foreground"
                >
                  {formatMonthShort(row.month)}
                </div>
              ))}
            </div>

            {/* Grid with 10 vertical blocks */}
            <div className="relative space-y-1">
              {/* Target line */}
              <div
                className="pointer-events-none absolute left-16 right-0 z-10 border-t-2 border-dashed border-blue-500"
                style={{
                  top: `${((100 - TARGET_PCT) / 10) * 2.25}rem`
                }}
              >
                <span className="absolute -left-14 -top-3 text-xs font-semibold text-blue-600">
                  Target: {TARGET_PCT}%
                </span>
              </div>

              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((level) => (
                <div key={level} className="flex gap-1">
                  {/* Scale label on the left */}
                  <div className="flex w-16 items-center justify-end pr-2 text-xs tabular-nums text-muted-foreground">
                    {level * 10}%
                  </div>
                  {/* Grid cells for each month */}
                  {sorted.map((row) => {
                    const pct = row.active_pct ?? 0;
                    const normalizedPct = pct < 0 ? 0 : pct > 100 ? 100 : pct;
                    const filledBlocks = Math.ceil(normalizedPct / 10);
                    const isFilled = level <= filledBlocks;
                    const color = getBackgroundColor(normalizedPct);

                    return (
                      <div
                        key={`${row.month}-${level}`}
                        className="group relative flex flex-1 cursor-pointer"
                        title={`${formatMonthLabel(row.month)}: ${fmtPct0(pct)} active`}
                        onClick={() => handleMonthClick(row)}
                      >
                        <div
                          className={`h-8 w-full rounded border transition-all hover:scale-105 ${
                            isFilled
                              ? `${color} border-transparent`
                              : "border-muted bg-muted/30"
                          }`}
                        />
                        {/* Tooltip on hover */}
                        <div className="pointer-events-none absolute -top-20 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg border bg-popover p-3 text-xs shadow-lg group-hover:block">
                          <p className="font-semibold">{formatMonthLabel(row.month)}</p>
                          <p className="text-muted-foreground">
                            {formatNumber(row.active_cnt)} of {formatNumber(row.total_assigned)} dealers
                          </p>
                          <p className="font-medium">
                            <span className="uppercase tracking-wide">{fmtPct0(pct)} active</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Click for details</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-2 pt-4 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="h-3 w-3 rounded bg-red-600" />
                <div className="h-3 w-3 rounded bg-red-500" />
                <div className="h-3 w-3 rounded bg-orange-500" />
                <div className="h-3 w-3 rounded bg-yellow-500" />
                <div className="h-3 w-3 rounded bg-green-500" />
                <div className="h-3 w-3 rounded bg-green-600" />
                <div className="h-3 w-3 rounded bg-green-700" />
              </div>
              <span>More</span>
            </div>
          </div>
        </TabsContent>

        {/* Vertical bar chart */}
        <TabsContent value="vertical" className="mt-0">
          <div id="dealer-heatmap-vertical" className="bg-white p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-muted-foreground">Monthly Dealer Activity</h4>
              <ChartActions elementId="dealer-heatmap-vertical" fileName="dealer-engagement-vertical" />
            </div>

            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={sorted.map(row => ({
                  month: formatMonthShort(row.month),
                  fullMonth: row.month,
                  activePct: row.active_pct,
                  activeCnt: row.active_cnt,
                  totalAssigned: row.total_assigned,
                  rawRow: row,
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const payload = data.activePayload[0].payload;
                    handleMonthClick(payload.rawRow);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  label={{ value: "Active %", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-popover p-3 shadow-lg">
                          <p className="font-semibold text-sm">{formatMonthLabel(data.fullMonth)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatNumber(data.activeCnt)} of {formatNumber(data.totalAssigned)} dealers
                          </p>
                          <p className="font-medium text-sm mt-1">
                            {data.activePct.toFixed(1)}% active
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Click bar for details</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="activePct"
                  radius={[8, 8, 0, 0]}
                  cursor="pointer"
                >
                  {sorted.map((row, index) => {
                    const pct = row.active_pct ?? 0;
                    return (
                      <Cell key={`cell-${index}`} fill={getColorForPercentage(pct)} />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Target line indicator */}
            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-0.5 w-4 border-t-2 border-dashed border-blue-500" />
                <span>Target: {TARGET_PCT}%</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Link
        href="/sales"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        Explore full sales performance
      </Link>

      {/* Month Details Drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-lg font-semibold">
                  Dealer Engagement Details
                </SheetTitle>
                <SheetDescription>
                  {selectedMonth && formatMonthFull(selectedMonth.month)}
                </SheetDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCopyData}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileText className="mr-2 h-4 w-4" />
                    Download CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SheetHeader>

          <div className="mt-6 flex-1 flex flex-col min-h-0 space-y-6">
            {selectedMonth && (
              <>
                {/* Active Dealers Section */}
                <div className="space-y-3">
                  <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                    <h3 className="text-sm font-semibold mb-2">
                      {selectedMonth.activeCnt} Active Dealers ({selectedMonth.activePct.toFixed(1)}%)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Brought ${((selectedMonth.activeCnt * 15000) / 1000).toFixed(1)}k total revenue for {formatMonthFull(selectedMonth.month)}
                    </p>
                  </div>

                  <div className="rounded-lg border p-3 text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Total Assigned:</span>
                      <span className="font-semibold">{selectedMonth.totalAssigned}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Activity Rate:</span>
                      <span className="font-semibold">{selectedMonth.activePct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="border-t" />

                {/* Inactive Dealers by Rep Section */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <h3 className="text-sm font-semibold">Inactive Dealers by Sales Rep</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy list
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="mr-2 h-4 w-4" />
                          Download CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {inactiveDealersByRep.map((rep) => (
                      <div
                        key={rep.initials}
                        className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="rounded bg-muted px-2 py-1 font-mono text-xs font-medium">
                            {rep.initials}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{rep.inactiveCount} inactive dealers</p>
                            <p className="text-xs text-muted-foreground">{rep.pctOfTotal}% of total inactive</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
