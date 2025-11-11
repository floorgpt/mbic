"use client";

import Link from "next/link";

import type { DealerEngagementRow } from "@/lib/mbic-supabase";
import { fmtPct0 } from "@/lib/format";
import { formatNumber } from "@/lib/utils/format";

type DealerHeatmapProps = {
  data: DealerEngagementRow[];
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

// Color scale: Green at 50%+, Yellow at 20%+, Red below 20%
function getColorForPercentage(pct: number): string {
  if (pct >= 70) return "bg-green-700"; // 70%+
  if (pct >= 60) return "bg-green-600"; // 60-69%
  if (pct >= 50) return "bg-green-500"; // 50-59% (green)
  if (pct >= 40) return "bg-yellow-600"; // 40-49%
  if (pct >= 30) return "bg-yellow-500"; // 30-39%
  if (pct >= 20) return "bg-yellow-400"; // 20-29% (yellow)
  if (pct >= 10) return "bg-red-500";    // 10-19%
  return "bg-red-600"; // < 10% (red)
}

export function DealerHeatmap({ data }: DealerHeatmapProps) {
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-dashed border-muted bg-muted/40 p-8 text-center text-sm text-muted-foreground">
        No data for this period.
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
  const TARGET_PCT = 55;

  return (
    <div className="space-y-5">
      {/* Calendar-style heatmap */}
      <div className="space-y-2">
        {/* Month labels */}
        <div className="flex gap-1">
          <div className="w-16" /> {/* Spacer for scale labels */}
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
                const color = getColorForPercentage(normalizedPct);

                return (
                  <div
                    key={`${row.month}-${level}`}
                    className="group relative flex flex-1"
                    title={`${formatMonthLabel(row.month)}: ${fmtPct0(pct)} active (${formatNumber(row.active_cnt)} of ${formatNumber(row.total_assigned)})`}
                  >
                    <div
                      className={`h-8 w-full rounded border transition-all ${
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

      <Link
        href="/sales"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        Explore full sales performance
      </Link>
    </div>
  );
}
