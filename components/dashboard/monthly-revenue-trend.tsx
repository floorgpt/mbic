"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { fmtUSD0 } from "@/lib/format";

type MonthlyPoint = {
  month: string;
  total: number;
};

function labelMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
  });
}

type Props = {
  data: MonthlyPoint[];
};

export function MonthlyRevenueTrend({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-muted bg-muted/40 text-sm text-muted-foreground">
        Data available soon.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <AreaChart width={640} height={280} data={data} className="min-w-full">
        <defs>
          <linearGradient id="monthly-trend" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.7} />
            <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="4 8" />
        <XAxis dataKey="month" tickFormatter={labelMonth} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(value) => fmtUSD0(Number(value ?? 0))}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip
          cursor={{ strokeDasharray: "4 4" }}
          formatter={(value: number) => fmtUSD0(value ?? 0)}
          labelFormatter={(label) => labelMonth(label)}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="hsl(var(--chart-1))"
          fill="url(#monthly-trend)"
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </div>
  );
}
