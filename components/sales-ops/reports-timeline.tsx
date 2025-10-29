"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type {
  Formatter,
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type ReportsPoint = {
  month: string;
  count: number;
};

const chartConfig = {
  reports: {
    label: "Ops Reports",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
  });
}

const formatReports: Formatter<ValueType, NameType> = (value) => {
  const numeric = Array.isArray(value)
    ? Number(value[0] ?? 0)
    : typeof value === "number"
      ? value
      : Number(value ?? 0);
  return `${numeric} reports`;
};

export function ReportsTimeline({ data }: { data: ReportsPoint[] }) {
  const safeData = React.useMemo(
    () => data.slice().sort((a, b) => a.month.localeCompare(b.month)),
    [data],
  );

  if (!safeData.length) {
    return <div className="h-[240px] animate-pulse rounded-xl bg-muted/40" />;
  }

  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={safeData} margin={{ top: 12, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 8" />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonthLabel}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <ChartTooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
          content={
            <ChartTooltipContent
              formatter={formatReports}
              labelFormatter={(label) => `Month of ${formatMonthLabel(label)}`}
            />
          }
        />
        <Bar
          dataKey="count"
          fill="hsl(var(--chart-3))"
          radius={[6, 6, 0, 0]}
          name="Ops Reports"
        />
      </BarChart>
    </ChartContainer>
  );
}
