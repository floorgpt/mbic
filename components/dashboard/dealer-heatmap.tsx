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
    <div className="space-y-5">
      <div className="space-y-3">
        {sorted.map((row) => {
          const pct = row.active_pct ?? 0;
          const pctDisplay = pct < 0 ? 0 : pct > 100 ? 100 : pct;

          return (
            <div
              key={row.month}
              className="flex min-h-[96px] flex-col gap-3 rounded-2xl border border-black/5 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex w-full flex-1 items-center gap-4">
                <div className="min-w-[120px]">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Month</p>
                  <p className="text-lg font-semibold tracking-tight">{formatMonthLabel(row.month)}</p>
                </div>
                <div className="hidden h-2 flex-1 rounded-full bg-muted sm:block">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pctDisplay}%` }}
                  />
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-4">
                <div className="h-2 w-full rounded-full bg-muted sm:hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pctDisplay}%` }}
                  />
                </div>
                <div className="text-sm font-medium tabular-nums text-muted-foreground sm:text-right">
                  {formatNumber(row.active_cnt)} of {formatNumber(row.total_assigned)} dealers •{" "}
                  <span className="uppercase tracking-wide">{fmtPct0(pct)} active</span>
                </div>
              </div>
            </div>
          );
        })}
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
