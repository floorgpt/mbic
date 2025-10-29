"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  XAxis,
  YAxis,
  type ValueType,
  type NameType,
  type Payload,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fmtPct0, fmtUSD0 } from "@/lib/format";

export type EconomicsPoint = {
  month: string;
  revenue: number;
  margin_pct: number;
};

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  margin: {
    label: "Gross Margin %",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
  });
}

export function EconomicsChart({ data }: { data: EconomicsPoint[] }) {
  const safeData = React.useMemo(
    () =>
      data
        .slice()
        .sort((a, b) => a.month.localeCompare(b.month)),
    [data],
  );

  if (!safeData.length) {
    return <div className="h-[280px] animate-pulse rounded-xl bg-muted/40" />;
  }

  return (
    <ChartContainer config={chartConfig} className="h-[320px] w-full">
      <AreaChart
        data={safeData}
        margin={{ top: 16, right: 32, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="econ-revenue" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.7} />
            <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="4 8" />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonthLabel}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="left"
          tickFormatter={(value) => fmtUSD0(Number(value ?? 0))}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={(value) => fmtPct0(Number(value ?? 0))}
          tickLine={false}
          axisLine={false}
          width={60}
          domain={[0, 100]}
        />
        <ChartTooltip
          cursor={{ strokeDasharray: "4 4" }}
          content={
            <ChartTooltipContent
              formatter={(value: ValueType, name: NameType, item: Payload<ValueType, NameType>) => {
                const numericValue = Number(value ?? 0);
                if (item?.dataKey === "margin_pct") {
                  return fmtPct0(numericValue);
                }
                return fmtUSD0(numericValue);
              }}
              labelFormatter={(label) => `Month of ${formatMonthLabel(label)}`}
            />
          }
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--chart-1))"
          fill="url(#econ-revenue)"
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 2 }}
          activeDot={{ r: 5 }}
          name="Revenue"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="margin_pct"
          stroke="hsl(var(--chart-2))"
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 2 }}
          activeDot={{ r: 5 }}
          name="Gross Margin %"
        />
      </AreaChart>
    </ChartContainer>
  );
}
