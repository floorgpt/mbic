"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { fmtCompact } from "@/lib/format";
import type { IncomingStockRow } from "@/types/ops";

type IncomingStockCardProps = {
  incomingStock: IncomingStockRow[];
};

export function IncomingStockCard({ incomingStock }: IncomingStockCardProps) {
  if (incomingStock.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-muted bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        No inbound purchase orders for this range.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-muted/40 bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total Inbound
          </p>
          <p className="font-montserrat text-2xl font-semibold tabular-nums text-foreground">
            {fmtCompact(incomingStock.reduce((sum, row) => sum + row.quantity, 0))} SqFt
          </p>
        </div>
        <div className="rounded-xl border border-muted/40 bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Collections
          </p>
          <p className="font-montserrat text-2xl font-semibold tabular-nums text-foreground">
            {new Set(incomingStock.map((row) => row.collection)).size}
          </p>
        </div>
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={(() => {
                const collectionTotals = new Map<string, number>();
                incomingStock.forEach((row) => {
                  const current = collectionTotals.get(row.collection) || 0;
                  collectionTotals.set(row.collection, current + row.quantity);
                });
                return Array.from(collectionTotals.entries()).map(([name, value]) => ({
                  name,
                  value,
                }));
              })()}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {(() => {
                const collectionTotals = new Map<string, number>();
                incomingStock.forEach((row) => {
                  const current = collectionTotals.get(row.collection) || 0;
                  collectionTotals.set(row.collection, current + row.quantity);
                });
                const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4', '#f59e0b'];
                return Array.from(collectionTotals.entries()).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ));
              })()}
            </Pie>
            <Tooltip formatter={(value: number) => `${fmtCompact(value)} SqFt`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-2 pt-2">
        <Link
          href="/ops"
          className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
        >
          View Details in Operations Hub
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </>
  );
}
