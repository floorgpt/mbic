"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { OrderAccuracyData } from "@/types/logistics";

type OrderAccuracyChartProps = {
  data: OrderAccuracyData[];
  loading?: boolean;
};

export function OrderAccuracyChart({ data, loading }: OrderAccuracyChartProps) {
  if (loading || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Order Accuracy</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex h-[240px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
              Loading...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="text-sm font-semibold">{item.month} {item.year}</p>
          <p className="text-sm text-muted-foreground">
            Accuracy: <span className="font-semibold text-foreground">{item.accuracy_pct.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate average accuracy
  const avgAccuracy = data.reduce((sum, d) => sum + d.accuracy_pct, 0) / data.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Order Accuracy</CardTitle>
        <p className="text-xs text-muted-foreground">Last {data.length} months trend</p>
      </CardHeader>
      <CardContent className="pb-4">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              className="text-xs text-muted-foreground"
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              className="text-xs text-muted-foreground"
              tick={{ fontSize: 12 }}
              tickLine={false}
              domain={[90, 100]}
              ticks={[90, 92, 94, 96, 98, 100]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
            <Bar
              dataKey="accuracy_pct"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-muted bg-muted/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Current
            </p>
            <p className="font-montserrat text-xl font-bold text-foreground">
              {data[data.length - 1]?.accuracy_pct.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg border border-muted bg-muted/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Avg ({data.length}mo)
            </p>
            <p className="font-montserrat text-xl font-bold text-foreground">
              {avgAccuracy.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
