"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { fmtCompact, fmtUSDCompact } from "@/lib/format";
import type { FutureSalesTotals } from "@/types/logistics";

export function FutureSalesTotals() {
  const [totals, setTotals] = useState<FutureSalesTotals>({
    total_sqft: 0,
    revenue_at_risk: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTotals = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/ops/future-sales");
        const result = await response.json();

        if (!response.ok || !result.ok) {
          throw new Error(result.err ?? "Failed to fetch opportunities");
        }

        // Calculate totals from the data
        const opportunities = result.data ?? [];
        const total_sqft = opportunities.reduce(
          (sum: number, opp: { expected_qty: number }) => sum + (opp.expected_qty || 0),
          0,
        );
        const revenue_at_risk = opportunities.reduce(
          (sum: number, opp: { potential_amount: number }) => sum + (opp.potential_amount || 0),
          0,
        );

        setTotals({
          total_sqft,
          revenue_at_risk,
          count: opportunities.length,
        });
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        console.error("[ops] future-sales-totals:fetch-error", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchTotals();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
              Loading...
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
              Loading...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-destructive">Error: {error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Total SqFt Card */}
      <Card className="border-2 border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-transparent dark:border-blue-900/30 dark:from-blue-950/20">
        <CardContent className="p-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total SqFt
            </p>
            <div className="flex items-baseline gap-2">
              <p className="font-montserrat text-3xl font-bold text-foreground">
                {fmtCompact(totals.total_sqft)}
              </p>
              <p className="text-xs text-muted-foreground">
                {totals.count} {totals.count === 1 ? "opportunity" : "opportunities"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Total square footage across all future sales opportunities
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Revenue at Risk Card */}
      <Card className="border-2 border-emerald-200/50 bg-gradient-to-br from-emerald-50/50 to-transparent dark:border-emerald-900/30 dark:from-emerald-950/20">
        <CardContent className="p-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Revenue at Risk
            </p>
            <div className="flex items-baseline gap-2">
              <p className="font-montserrat text-3xl font-bold text-foreground">
                {fmtUSDCompact(totals.revenue_at_risk)}
              </p>
              <p className="text-xs text-muted-foreground">potential</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Total potential revenue from opportunities pending stock confirmation
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
