"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!data || !data.length) {
    return <div className="h-[260px] animate-pulse rounded-xl bg-muted/40 md:h-[300px]" />;
  }

  // Prevent SSR hydration mismatch by only rendering chart on client
  if (!isMounted) {
    return <div className="h-[300px] w-full" />;
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="monthly-trend" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.7} />
              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="4 8" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="month"
            tickFormatter={labelMonth}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(value) => fmtUSD0(Number(value ?? 0))}
            tickLine={false}
            axisLine={false}
            width={80}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
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
      </ResponsiveContainer>
    </div>
  );
}
