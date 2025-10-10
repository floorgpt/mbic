"use client";

import {
  Bar,
  BarChart,
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

type RepTrendPoint = {
  month: string;
  total_sales: number;
};

const chartConfig = {
  sales: {
    label: "Total Sales",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

function formatLabel(month: string) {
  const [year, monthPart] = month.split("-");
  return new Date(Number(year), Number(monthPart) - 1, 1).toLocaleDateString(
    "en-US",
    {
      month: "short",
    },
  );
}

export function RepSalesTrend({ data }: { data: RepTrendPoint[] }) {
  return (
    <ChartContainer config={chartConfig}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} strokeDasharray="4 8" />
        <XAxis
          dataKey="month"
          tickFormatter={formatLabel}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(value) => formatCurrency(value)}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Bar
          dataKey="total_sales"
          fill="hsl(var(--chart-2))"
          radius={[8, 8, 0, 0]}
        />
        <ChartTooltip
          cursor={{ fill: "hsl(var(--chart-2) / 0.15)" }}
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value))}
              labelFormatter={(label) => `Month of ${label}`}
            />
          }
        />
      </BarChart>
    </ChartContainer>
  );
}
