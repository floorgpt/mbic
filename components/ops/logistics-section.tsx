"use client";

import { useState, useCallback } from "react";
import { LogisticsDashboard } from "./logistics-dashboard";
import { LogisticsDownloadMenu } from "./logistics-download-menu";

export function LogisticsSection() {
  const [refreshCallback, setRefreshCallback] = useState<(() => void) | null>(null);

  const handleDataRefresh = useCallback((callback: () => void) => {
    setRefreshCallback(() => callback);
  }, []);

  const handleMenuRefresh = useCallback(() => {
    if (refreshCallback) {
      refreshCallback();
    }
  }, [refreshCallback]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-montserrat text-2xl font-semibold tracking-tight">
            Logistics Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Track key logistics metrics, order status, and delivery performance.
          </p>
        </div>
        <LogisticsDownloadMenu onDataRefresh={handleMenuRefresh} />
      </div>

      <LogisticsDashboard onDataRefresh={handleDataRefresh} />
    </section>
  );
}
