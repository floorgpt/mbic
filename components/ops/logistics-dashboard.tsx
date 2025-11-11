"use client";

import { useEffect, useState, useCallback } from "react";
import { LogisticsKPICard } from "./logistics-kpi-card";
import { OrdersByStatusChart } from "./orders-by-status-chart";
import { OrderAccuracyChart } from "./order-accuracy-chart";
import type { LogisticsResponse } from "@/types/logistics";

type LogisticsDashboardProps = {
  onDataRefresh?: (callback: () => void) => void;
};

export function LogisticsDashboard({ onDataRefresh }: LogisticsDashboardProps) {
  const [data, setData] = useState<LogisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ops/logistics");
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.err ?? "Failed to fetch logistics data");
      }

      setData(result);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error("[ops] logistics-dashboard:fetch-error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (onDataRefresh) {
      onDataRefresh(fetchData);
    }
  }, [onDataRefresh, fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
          Loading logistics dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
        <p className="text-sm text-destructive">Error loading logistics data: {error}</p>
      </div>
    );
  }

  if (!data || !data.data) {
    return (
      <div className="rounded-lg border border-muted bg-muted/20 p-6">
        <p className="text-sm text-muted-foreground">No logistics data available</p>
      </div>
    );
  }

  const kpis = data.data;

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <LogisticsKPICard
          title="Sales"
          value={kpis.sales}
          changePct={kpis.sales_change_pct}
          variant="currency"
        />

        <LogisticsKPICard
          title="Costs"
          value={kpis.costs}
          changePct={kpis.costs_change_pct}
          variant="currency"
        />

        <LogisticsKPICard
          title="Gross Margin"
          value={kpis.gross_margin_pct}
          changePct={kpis.margin_change_pct}
          variant="percentage"
        />

        <LogisticsKPICard
          title="Inventory Turnover"
          value={kpis.inventory_turnover}
          changePct={kpis.turnover_change_pct}
          variant="decimal"
        />

        <LogisticsKPICard
          title="Avg. Delivery Time"
          value={kpis.avg_delivery_days}
          changePct={kpis.delivery_change_pct}
          variant="days"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <OrdersByStatusChart data={data.orders_by_status} loading={loading} />
        <OrderAccuracyChart data={data.order_accuracy_trend} loading={loading} />
      </div>
    </div>
  );
}
