"use client";

import * as React from "react";
import { fmtUSDCompact, fmtUSD2, fmtCompact } from "@/lib/format";
import type { LossOpportunityRow } from "@/types/salesops";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type LossOppsCardProps = {
  opportunities: LossOpportunityRow[];
};

function safePotential(opp: LossOpportunityRow): number {
  if (Number.isFinite(opp.potential_amount)) {
    return Number(opp.potential_amount);
  }
  const qty = safeQuantity(opp);
  const price = Number.isFinite(opp.target_price) ? Number(opp.target_price) : 0;
  return qty * price;
}

function safeQuantity(opp: LossOpportunityRow): number {
  return Number.isFinite(opp.requested_qty) ? Number(opp.requested_qty) : 0;
}

export function LossOppsCard({ opportunities }: LossOppsCardProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  const totals = React.useMemo(() => {
    const summary = opportunities.reduce(
      (acc, opp) => {
        acc.qty += safeQuantity(opp);
        acc.potentialLost += safePotential(opp);
        return acc;
      },
      { qty: 0, potentialLost: 0 },
    );
    return {
      qty: summary.qty,
      potentialLost: summary.potentialLost,
      count: opportunities.length,
    };
  }, [opportunities]);

  const reasonBreakdown = React.useMemo(() => {
    const reasonMap = new Map<string, { count: number; amount: number }>();
    opportunities.forEach((opp) => {
      const reason = opp.reason || "Unspecified";
      const existing = reasonMap.get(reason) ?? { count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += safePotential(opp);
      reasonMap.set(reason, existing);
    });
    return Array.from(reasonMap.entries())
      .map(([reason, data]) => ({
        reason,
        count: data.count,
        amount: data.amount,
        percentage: totals.potentialLost > 0 ? (data.amount / totals.potentialLost) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [opportunities, totals.potentialLost]);

  if (opportunities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-muted bg-muted/40 p-6 text-sm text-muted-foreground">
        No loss opportunities recorded for this range.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toggle Switch */}
      <div className="flex items-center justify-end gap-2 rounded-lg border border-muted/40 bg-muted/20 px-4 py-2">
        <Label htmlFor="loss-opps-toggle" className="text-xs font-medium text-muted-foreground cursor-pointer">
          {isVisible ? "Hide Details" : "Show Details"}
        </Label>
        <Switch id="loss-opps-toggle" checked={isVisible} onCheckedChange={setIsVisible} />
      </div>

      {/* Summary Tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-muted/40 bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total SqFt Lost
          </p>
          <p className="font-montserrat text-2xl font-semibold tabular-nums text-foreground">
            {fmtCompact(totals.qty)}
          </p>
        </div>
        <div className="rounded-xl border border-muted/40 bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Potential Revenue Lost
          </p>
          <p className="font-montserrat text-2xl font-semibold tabular-nums text-foreground">
            {fmtUSDCompact(totals.potentialLost)}
          </p>
        </div>
        <div className="rounded-xl border border-muted/40 bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Loss Opportunities
          </p>
          <p className="font-montserrat text-2xl font-semibold tabular-nums text-foreground">
            {totals.count}
          </p>
        </div>
      </div>

      {/* Collapsible Details */}
      {isVisible && (
        <div className="space-y-6">
          {/* Reason Breakdown */}
          <div className="rounded-xl border border-muted/40 bg-card/50 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Loss Reasons
            </div>
            <div className="space-y-2">
              {reasonBreakdown.map((item) => (
                <div
                  key={item.reason}
                  className="flex items-center justify-between rounded-lg border border-muted/60 bg-muted/20 px-3 py-2 text-sm"
                >
                  <div className="flex flex-col leading-tight">
                    <span className="font-medium text-foreground">{item.reason}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.count} {item.count === 1 ? "opportunity" : "opportunities"} • {fmtUSDCompact(item.amount)}
                    </span>
                  </div>
                  <div className="tabular-nums text-xs font-semibold text-muted-foreground">
                    {item.percentage.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Individual Opportunities Table */}
          <div className="rounded-xl border border-muted/40 bg-card/50 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent Loss Opportunities
            </div>
            <div className="space-y-2">
              {opportunities.slice(0, 10).map((opp) => (
                <div
                  key={opp.id}
                  className="rounded-lg border border-muted/60 bg-muted/20 p-3 text-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{opp.dealer}</p>
                      <p className="text-xs text-muted-foreground">Rep: {opp.rep}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{fmtUSD2(safePotential(opp))}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtCompact(safeQuantity(opp))} SqFt @ {fmtUSD2(opp.target_price)}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-1 text-xs text-muted-foreground">
                    {opp.category_key && (
                      <p>
                        <span className="font-medium">Category:</span> {opp.category_key}
                      </p>
                    )}
                    {opp.collection_key && (
                      <p>
                        <span className="font-medium">Collection:</span> {opp.collection_key}
                      </p>
                    )}
                    {opp.color_name && (
                      <p>
                        <span className="font-medium">Color:</span> {opp.color_name}
                      </p>
                    )}
                    {opp.expected_sku && (
                      <p>
                        <span className="font-medium">SKU:</span> {opp.expected_sku}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Reason:</span> {opp.reason}
                    </p>
                    {opp.notes && (
                      <p className="mt-1 italic">
                        <span className="font-medium">Notes:</span> {opp.notes}
                      </p>
                    )}
                    <p className="mt-1 text-[10px]">
                      Submitted {new Date(opp.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {opportunities.length > 10 && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Showing 10 of {opportunities.length} opportunities
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
