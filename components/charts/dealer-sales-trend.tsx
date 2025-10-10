"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils/format";

type DealerTrendPoint = {
  month: string;
  total_sales: number;
};

const chartConfig = {
  sales: {
    label: "Dealer Revenue",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

function formatMonth(month: string) {
  const [year, monthPart] = month.split("-");
  return new Date(Number(year), Number(monthPart) - 1, 1).toLocaleDateString(
    "en-US",
    { month: "short" },
  );
}

export function DealerSalesTrend({ data }: { data: DealerTrendPoint[] }) {
  return (
    <ChartContainer config={chartConfig}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="dealerGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.6} />
            <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="4 8" />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonth}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(value) => formatCurrency(value)}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Area
          type="monotone"
          dataKey="total_sales"
          stroke="hsl(var(--chart-3))"
          strokeWidth={2}
          fill="url(#dealerGradient)"
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
  );
}
