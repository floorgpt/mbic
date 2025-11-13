"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LossOppsCard } from "@/components/sales-ops/loss-opps-card";
import type { LossOpportunityRow } from "@/types/salesops";
import type { PanelMeta } from "@/lib/utils";

type PanelState<T> = {
  data: T;
  meta: PanelMeta;
};

function PanelFailureBadge({ meta }: { meta: PanelMeta }) {
  if (meta.ok) return null;
  return (
    <span className="inline-flex items-center rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
      Panel failed
    </span>
  );
}

function ThinkingPlaceholder() {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-muted bg-muted/20 p-12">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export function LossOpportunitiesSection({
  lossOpps,
  lossOppsState,
}: {
  lossOpps: LossOpportunityRow[];
  lossOppsState: PanelState<LossOpportunityRow[]>;
}) {
  const [isVisible, setIsVisible] = React.useState(true);

  return (
    <section className="grid grid-cols-1">
      <Card className="rounded-2xl border border-black/5 bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-2 p-4 pb-0 sm:p-6">
          <div className="grid grid-cols-[3fr_2fr] items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  Loss Opportunities
                </CardTitle>
                <PanelFailureBadge meta={lossOppsState.meta} />
              </div>
              <p className="text-sm text-muted-foreground">
                Track lost sales opportunities to identify patterns and improve future conversions.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Label
                htmlFor="loss-opps-toggle"
                className="cursor-pointer text-xs font-medium text-muted-foreground"
              >
                {isVisible ? "Hide Details" : "Show Details"}
              </Label>
              <Switch id="loss-opps-toggle" checked={isVisible} onCheckedChange={setIsVisible} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {lossOppsState.meta.ok ? (
            lossOpps.length ? (
              <LossOppsCard
                opportunities={lossOpps}
                isVisible={isVisible}
                onToggleVisibility={setIsVisible}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-muted bg-muted/40 p-6 text-sm text-muted-foreground">
                No loss opportunities recorded for this range.
              </div>
            )
          ) : (
            <ThinkingPlaceholder />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
