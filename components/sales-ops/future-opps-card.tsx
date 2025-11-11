"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

import { fmtCompact, fmtUSD2, fmtUSDCompact } from "@/lib/format";
import type { FutureOpportunityRow } from "@/types/salesops";

type FutureOppsCardProps = {
  opportunities: FutureOpportunityRow[];
};

type PipelinePoint = {
  label: string;
  revenue: number;
};

type BaseSlice = {
  key: string;
  label: string;
  amount: number;
  percentage: number;
  color: string;
  tooltipLabel: string;
};

type CollectionSlice = BaseSlice & {
  revenue: number;
  avgPrice: number;
};

type ColorSlice = BaseSlice & {
  parent: string;
  revenue: number;
  avgPrice: number;
};

const INNER_RING_GREYS = ["#0f172a", "#1e293b", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5f5"];
const OUTER_RING_COLORS = ["#4338ca", "#0ea5e9", "#16a34a", "#f97316", "#c026d3", "#ef4444", "#0891b2", "#fbbf24"];
const FALLBACK_COLOR = "#94a3b8";
const UNKNOWN_COLLECTION = "Unassigned Collection";
const UNKNOWN_COLOR = "Unspecified Color";

function safePotential(opp: FutureOpportunityRow): number {
  if (Number.isFinite(opp.potential_amount)) {
    return Number(opp.potential_amount);
  }
  const qty = safeQuantity(opp);
  const price = Number.isFinite(opp.expected_unit_price) ? Number(opp.expected_unit_price) : 0;
  return qty * price;
}

function safeQuantity(opp: FutureOpportunityRow): number {
  return Number.isFinite(opp.expected_qty) ? Number(opp.expected_qty) : 0;
}

function extractProductMeta(expectedSku?: string | null) {
  if (!expectedSku) {
    return { collection: UNKNOWN_COLLECTION, color: UNKNOWN_COLOR };
  }
  const [collectionRaw, colorRaw] = expectedSku.split(":");
  const collection = collectionRaw?.trim() || UNKNOWN_COLLECTION;
  const color = colorRaw?.trim() || UNKNOWN_COLOR;
  return { collection, color };
}

export function FutureOppsCard({ opportunities }: FutureOppsCardProps) {
  const totals = React.useMemo(() => {
    const summary = opportunities.reduce(
      (acc, opp) => {
        acc.qty += safeQuantity(opp);
        acc.revenue += safePotential(opp);
        return acc;
      },
      { qty: 0, revenue: 0 },
    );
    return {
      qty: summary.qty,
      revenue: summary.revenue,
      count: opportunities.length,
    };
  }, [opportunities]);

  const pipelineData = React.useMemo<PipelinePoint[]>(() => {
    const monthBuckets = new Map<
      string,
      {
        label: string;
        sortKey: string;
        revenue: number;
      }
    >();

    opportunities.forEach((opp) => {
      const amount = safePotential(opp);
      const rawDate = opp.expected_close_date ? new Date(opp.expected_close_date) : null;
      const closeDate = rawDate && !Number.isNaN(rawDate.getTime()) ? rawDate : null;

      const sortKey = closeDate
        ? `${closeDate.getFullYear()}-${String(closeDate.getMonth() + 1).padStart(2, "0")}`
        : "9999-12";
      const key = closeDate ? sortKey : "tbd";
      const label = closeDate
        ? `${closeDate.toLocaleDateString("en-US", { month: "short" })} '${String(closeDate.getFullYear()).slice(-2)}`
        : "TBD";

      if (!monthBuckets.has(key)) {
        monthBuckets.set(key, { label, sortKey, revenue: 0 });
      }

      const bucket = monthBuckets.get(key);
      if (bucket) {
        bucket.revenue += amount;
      }
    });

    return Array.from(monthBuckets.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((bucket) => ({
        label: bucket.label,
        revenue: bucket.revenue,
      }));
  }, [opportunities]);

  const productMix = React.useMemo(() => {
    const totalQty = opportunities.reduce((acc, opp) => acc + safeQuantity(opp), 0);

    const collectionTotals = new Map<
      string,
      {
        qty: number;
        revenue: number;
      }
    >();
    const colorTotals = new Map<
      string,
      {
        parent: string;
        label: string;
        qty: number;
        revenue: number;
      }
    >();

    opportunities.forEach((opp) => {
      const qty = safeQuantity(opp);
      if (qty <= 0) return;
      const revenue = safePotential(opp);
      const { collection, color } = extractProductMeta(opp.expected_sku);

      const collectionAggregate = collectionTotals.get(collection) ?? { qty: 0, revenue: 0 };
      collectionAggregate.qty += qty;
      collectionAggregate.revenue += revenue;
      collectionTotals.set(collection, collectionAggregate);

      const colorKey = `${collection}::${color}`;
      const existing = colorTotals.get(colorKey) ?? {
        parent: collection,
        label: color,
        qty: 0,
        revenue: 0,
      };
      existing.qty += qty;
      existing.revenue += revenue;
      colorTotals.set(colorKey, existing);
    });

    const collectionSlices: CollectionSlice[] = Array.from(collectionTotals.entries())
      .sort((a, b) => b[1].qty - a[1].qty)
      .map(([collection, aggregate], index) => {
        const avgPrice = aggregate.qty > 0 ? aggregate.revenue / aggregate.qty : 0;
        return {
          key: collection,
          label: collection,
          amount: aggregate.qty,
          revenue: aggregate.revenue,
          avgPrice,
          percentage: totalQty > 0 ? (aggregate.qty / totalQty) * 100 : 0,
          color: INNER_RING_GREYS[index % INNER_RING_GREYS.length],
          tooltipLabel: `${collection} • ${fmtCompact(aggregate.qty)} SqFt @ ${fmtUSD2(avgPrice)}`,
        };
      });

    const colorSlices: ColorSlice[] = Array.from(colorTotals.values())
      .sort((a, b) => b.qty - a.qty)
      .map((entry, index) => {
        const avgPrice = entry.qty > 0 ? entry.revenue / entry.qty : 0;
        const baseColor = OUTER_RING_COLORS[index % OUTER_RING_COLORS.length] ?? FALLBACK_COLOR;
        return {
          key: `${entry.parent}::${entry.label}`,
          label: entry.label,
          parent: entry.parent,
          amount: entry.qty,
          revenue: entry.revenue,
          avgPrice,
          percentage: totalQty > 0 ? (entry.qty / totalQty) * 100 : 0,
          color: baseColor,
          tooltipLabel: `${entry.parent} • ${entry.label}: ${fmtCompact(entry.qty)} SqFt @ ${fmtUSD2(avgPrice)} • ${fmtUSDCompact(entry.revenue)}`,
        };
      });

    return {
      totalQty,
      collectionSlices,
      colorSlices,
    };
  }, [opportunities]);

  if (opportunities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-muted bg-muted/40 p-6 text-sm text-muted-foreground">
        No future opportunities without stock confirmation for this range.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-muted/40 bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total SqFt Quantity
          </p>
          <p className="font-montserrat text-2xl font-semibold tabular-nums text-foreground">
            {fmtCompact(totals.qty)}
          </p>
        </div>
        <div className="rounded-xl border border-muted/40 bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total Revenue Potential
          </p>
          <p className="font-montserrat text-2xl font-semibold tabular-nums text-foreground">
            {fmtUSDCompact(totals.revenue)}
          </p>
        </div>
        <div className="rounded-xl border border-muted/40 bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Open Opportunities
          </p>
          <p className="font-montserrat text-2xl font-semibold tabular-nums text-foreground">
            {totals.count}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-muted/40 bg-card/50 p-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Pipeline by Close Month</span>
            <span>Potential</span>
          </div>
          <div className="h-[220px] pt-2">
            {pipelineData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pipelineData}
                  margin={{ top: 12, right: 12, left: -12, bottom: 0 }}
                  barSize={22}
                >
                  <CartesianGrid strokeDasharray="4 8" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => fmtUSDCompact(Number(value ?? 0))}
                    width={60}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.25 }}
                    formatter={(value: number | string) => fmtUSDCompact(Number(value ?? 0))}
                    labelFormatter={(label) => `Expected close ${label}`}
                  />
                  <Bar
                    dataKey="revenue"
                    radius={[6, 6, 0, 0]}
                    fill="hsl(var(--chart-1))"
                    name="Potential Revenue"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full animate-pulse rounded-lg bg-muted/40" />
            )}
          </div>
        </div>
        <div className="rounded-xl border border-muted/40 bg-card/50 p-4">
          <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>Product Mix</span>
            <span>Collection · Color</span>
          </div>
          <div className="mx-auto h-[260px] max-w-md pt-2">
            {productMix.collectionSlices.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productMix.collectionSlices}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {productMix.collectionSlices.map((slice) => (
                      <Cell key={`collection-${slice.key}`} fill={slice.color} />
                    ))}
                  </Pie>
                  <Pie
                    data={productMix.colorSlices}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={78}
                    outerRadius={110}
                    paddingAngle={1}
                    stroke="#fff"
                    strokeWidth={1}
                  >
                    {productMix.colorSlices.map((slice) => (
                      <Cell key={`color-${slice.key}`} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(_, name?: string | number, item) => {
                      const data = item?.payload as CollectionSlice | ColorSlice | undefined;
                      const label = data?.tooltipLabel ?? (typeof name === "string" ? name : String(name ?? ""));
                      return ["", label];
                    }}
                    labelFormatter={() => ""}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full animate-pulse rounded-lg bg-muted/40" />
            )}
          </div>
          <div className="grid gap-3 pt-4 text-sm md:grid-cols-2">
            {productMix.colorSlices.length ? (
              productMix.colorSlices.slice(0, 6).map((slice) => (
                <div
                  key={slice.key}
                  className="flex items-center justify-between rounded-lg border border-muted/60 bg-muted/20 px-3 py-2 text-sm"
                >
                  <div className="flex flex-1 items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium text-foreground">{slice.parent}</span>
                      <span className="text-xs text-muted-foreground">{slice.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {fmtCompact(slice.amount)} SqFt @ {fmtUSD2(slice.avgPrice)} • {fmtUSDCompact(slice.revenue)}
                      </span>
                    </div>
                  </div>
                  <div className="tabular-nums text-xs font-semibold text-muted-foreground">
                    {slice.percentage.toFixed(0)}%
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-muted bg-muted/30 px-3 py-2 text-sm text-muted-foreground md:col-span-2">
                Assign collection and color on each opportunity to unlock the mix view.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
