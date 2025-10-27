import Link from "next/link";

import type { DealerEngagementRow } from "@/lib/mbic-supabase";
import { formatNumber } from "@/lib/utils/format";

function heatColor(pct: number) {
  const safe = Math.max(0, Math.min(100, pct ?? 0));
  const hue = (safe * 120) / 100; // red -> green
  return `hsl(${hue}, 70%, 55%)`;
}

type DealerHeatmapProps = {
  data: DealerEngagementRow[];
};

export function DealerHeatmap({ data }: DealerHeatmapProps) {
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-dashed border-muted bg-muted/40 p-8 text-center text-sm text-muted-foreground">
        No data for this period.
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((row) => (
          <div
            key={row.month}
            className="rounded-2xl p-4 text-white shadow"
            style={{ backgroundColor: heatColor(row.active_pct) }}
          >
            <p className="text-xs uppercase tracking-wide text-white/80">
              {new Date(row.month).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </p>
            <p className="mt-2 text-2xl font-semibold">{formatNumber(row.active_cnt)}</p>
            <p className="text-xs text-white/80">
              of {formatNumber(row.total_assigned)} dealers • {Math.round(row.active_pct ?? 0)}% active
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-stretch sm:items-end">
        <Link
          href="/sales"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted sm:w-auto"
        >
          See dealers by rep →
        </Link>
      </div>
    </div>
  );
}
