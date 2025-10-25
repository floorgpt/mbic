"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils/format";

type RevenuePoint = {
  month: string;
  total_sales: number;
};

type Timeframe = "ytd" | "qtd" | "mtd";

const chartConfig = {
  sales: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  ytd: "Year to Date",
  qtd: "Quarter to Date",
  mtd: "Month to Date",
};

function transformLabel(month: string) {
  const [year, monthPart] = month.split("-");
  return new Date(Number(year), Number(monthPart) - 1, 1).toLocaleDateString(
    "en-US",
    {
      month: "short",
    },
  );
}

function filterByTimeframe(data: RevenuePoint[], timeframe: Timeframe) {
  if (!data.length) return [];

  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
  const last = sorted[sorted.length - 1];
  const [year, month] = last.month.split("-").map(Number);

  if (timeframe === "mtd") {
    return sorted.filter((point) => point.month === last.month);
  }

  if (timeframe === "qtd") {
    const startMonth = Math.max(1, month - 2);
    return sorted.filter((point) => {
      const [pointYear, pointMonth] = point.month.split("-").map(Number);
      return (
        pointYear === year &&
        pointMonth >= startMonth &&
        pointMonth <= month
      );
    });
  }

  // ytd
  return sorted.filter((point) => point.month.startsWith(String(year)));
}

export function RevenueTrend({
  data,
}: {
  data: RevenuePoint[];
}) {
  const [timeframe, setTimeframe] = React.useState<Timeframe>("ytd");
  const gradientBaseId = React.useId().replace(/:/g, "");
  const gradientIds = React.useMemo(
    () => ({
      ytd: `${gradientBaseId}-ytd`,
      qtd: `${gradientBaseId}-qtd`,
      mtd: `${gradientBaseId}-mtd`,
    }),
    [gradientBaseId],
  );

  const filtered = React.useMemo(
    () => filterByTimeframe(data, timeframe),
    [data, timeframe],
  );

  const total = React.useMemo(
    () => filtered.reduce((acc, point) => acc + point.total_sales, 0),
    [filtered],
  );

  return (
    <Tabs
      defaultValue="ytd"
      value={timeframe}
      onValueChange={(value) => setTimeframe(value as Timeframe)}
      className="flex w-full flex-col gap-4"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {TIMEFRAME_LABELS[timeframe]}
          </p>
          <p className="font-montserrat text-2xl font-semibold">
            {formatCurrency(total)}
          </p>
        </div>
        <TabsList className="grid grid-cols-3 bg-muted/60">
          <TabsTrigger value="mtd">MTD</TabsTrigger>
          <TabsTrigger value="qtd">QTD</TabsTrigger>
          <TabsTrigger value="ytd">YTD</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="ytd" className="rounded-xl border bg-background p-4">
        <ChartContainer config={chartConfig}>
          <AreaChart data={filterByTimeframe(data, "ytd")}>
            <defs>
              <linearGradient id={gradientIds.ytd} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.65} />
                <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="4 8" />
            <XAxis
              dataKey="month"
              tickFormatter={transformLabel}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value).replace("$", "$")}
              tickLine={false}
              axisLine={false}
              width={70}
            />
            <Area
              type="monotone"
              dataKey="total_sales"
              stroke="hsl(var(--chart-1))"
              fill={`url(#${gradientIds.ytd})`}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              name="Revenue"
            />
            <ChartTooltip
              cursor={{ strokeDasharray: "4 4" }}
              content={
                <ChartTooltipContent
                  formatter={(value) => formatCurrency(Number(value))}
                  labelFormatter={(label) => `Month of ${label}`}
                />
              }
            />
          </AreaChart>
        </ChartContainer>
      </TabsContent>
      <TabsContent value="qtd" className="rounded-xl border bg-background p-4">
        <ChartContainer config={chartConfig}>
          <AreaChart data={filterByTimeframe(data, "qtd")}>
            <defs>
              <linearGradient id={gradientIds.qtd} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.65} />
                <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="4 8" />
            <XAxis
              dataKey="month"
              tickFormatter={transformLabel}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value).replace("$", "$")}
              tickLine={false}
              axisLine={false}
              width={70}
            />
            <Area
              type="monotone"
              dataKey="total_sales"
              stroke="hsl(var(--chart-1))"
              fill={`url(#${gradientIds.qtd})`}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              name="Revenue"
            />
            <ChartTooltip
              cursor={{ strokeDasharray: "4 4" }}
              content={
                <ChartTooltipContent
                  formatter={(value) => formatCurrency(Number(value))}
                  labelFormatter={(label) => `Month of ${label}`}
                />
              }
            />
          </AreaChart>
        </ChartContainer>
      </TabsContent>
      <TabsContent value="mtd" className="rounded-xl border bg-background p-4">
        <ChartContainer config={chartConfig}>
          <AreaChart data={filterByTimeframe(data, "mtd")}>
            <defs>
              <linearGradient id={gradientIds.mtd} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.65} />
                <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="4 8" />
            <XAxis
              dataKey="month"
              tickFormatter={transformLabel}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value).replace("$", "$")}
              tickLine={false}
              axisLine={false}
              width={70}
            />
            <Area
              type="monotone"
              dataKey="total_sales"
              stroke="hsl(var(--chart-1))"
              fill={`url(#${gradientIds.mtd})`}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              name="Revenue"
            />
            <ChartTooltip
              cursor={{ strokeDasharray: "4 4" }}
              content={
                <ChartTooltipContent
                  formatter={(value) => formatCurrency(Number(value))}
                  labelFormatter={(label) => `Month of ${label}`}
                />
              }
            />
          </AreaChart>
        </ChartContainer>
      </TabsContent>
    </Tabs>
  );
}
