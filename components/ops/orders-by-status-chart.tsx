"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { OrdersByStatus } from "@/types/logistics";

type OrdersByStatusChartProps = {
  data: OrdersByStatus | null;
  loading?: boolean;
};

const COLORS = {
  delivered: "#10b981", // emerald-500
  in_progress: "#f59e0b", // amber-500
  not_delivered: "#ef4444", // red-500
};

export function OrdersByStatusChart({ data, loading }: OrdersByStatusChartProps) {
  if (loading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Orders by Delivery Status</CardTitle>
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

  const chartData = [
    { name: "Delivered", value: data.delivered, color: COLORS.delivered },
    { name: "In Progress", value: data.in_progress, color: COLORS.in_progress },
    { name: "Not Delivered", value: data.not_delivered, color: COLORS.not_delivered },
  ];

  const total = data.delivered + data.in_progress + data.not_delivered;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = ((item.value / total) * 100).toFixed(1);
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="text-sm font-semibold">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            {item.value} orders ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Orders by Delivery Status</CardTitle>
        <p className="text-xs text-muted-foreground">Current month breakdown</p>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Donut Chart */}
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Manual Legend */}
          <div className="flex items-center">
            <div className="flex flex-col gap-2">
              {chartData.map((entry, index) => {
                const percentage = ((entry.value / total) * 100).toFixed(1);
                return (
                  <div key={`legend-${index}`} className="flex items-center justify-between gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-muted-foreground">{entry.name}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold tabular-nums">{entry.value}</span>
                      <span className="text-xs text-muted-foreground">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 rounded-lg border border-muted bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total Orders
          </p>
          <p className="font-montserrat text-2xl font-bold text-foreground">{total}</p>
          <p className="text-xs text-muted-foreground">
            Delivery rate: {((data.delivered / total) * 100).toFixed(1)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
