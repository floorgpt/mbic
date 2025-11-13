"use client";

import * as React from "react";
import { Eye } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtUSDCompact, fmtUSD2, fmtCompact } from "@/lib/format";
import type { LossOpportunityRow } from "@/types/salesops";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type LossOppsCardProps = {
  opportunities: LossOpportunityRow[];
  isVisible: boolean;
  onToggleVisibility: (visible: boolean) => void;
};

const REP_COLORS = [
  "#4338ca",
  "#0ea5e9",
  "#16a34a",
  "#f97316",
  "#c026d3",
  "#ef4444",
  "#0891b2",
  "#fbbf24",
  "#8b5cf6",
  "#ec4899",
];

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

function getInitials(name: string): string {
  if (!name || name === "Unknown") return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function truncateDealerName(name: string, maxLength = 25): string {
  if (!name) return "—";
  if (name.length <= maxLength) return name;
  return `${name.substring(0, maxLength)}...`;
}

function formatCompactCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

function formatDateEST(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function formatTimeEST(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function LossOppsCard({ opportunities, isVisible }: LossOppsCardProps) {
  const [selectedOpp, setSelectedOpp] = React.useState<LossOpportunityRow | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [attachmentOpen, setAttachmentOpen] = React.useState(false);

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

  const repBreakdown = React.useMemo(() => {
    const repMap = new Map<string, { repId: number; count: number; amount: number }>();
    opportunities.forEach((opp) => {
      const rep = opp.rep || "Unknown";
      const existing = repMap.get(rep) ?? { repId: opp.rep_id, count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += safePotential(opp);
      repMap.set(rep, existing);
    });
    return Array.from(repMap.entries())
      .map(([rep, data], index) => ({
        rep,
        repId: data.repId,
        count: data.count,
        amount: data.amount,
        percentage: totals.count > 0 ? (data.count / totals.count) * 100 : 0,
        color: REP_COLORS[index % REP_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [opportunities, totals.count]);

  const handleView = (opp: LossOpportunityRow) => {
    setSelectedOpp(opp);
    setModalOpen(true);
    setAttachmentOpen(false);
  };

  if (opportunities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-muted bg-muted/40 p-6 text-sm text-muted-foreground">
        No loss opportunities recorded for this range.
      </div>
    );
  }

  return (
    <div className="space-y-4">

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
            Revenue Loss
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
          {/* Charts: Loss Reasons (Bar) and Rep Distribution (Pie) */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Loss Reasons Bar Chart */}
            <div className="rounded-xl border border-muted/40 bg-card/50 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Loss Reasons
              </div>
              <div className="h-[280px]">
                {reasonBreakdown.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reasonBreakdown}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="4 8" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => fmtUSDCompact(Number(value ?? 0))}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="reason"
                        width={100}
                        tickLine={false}
                        axisLine={false}
                        style={{ fontSize: "12px" }}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.25 }}
                        formatter={(value: number | string) => [
                          fmtUSDCompact(Number(value ?? 0)),
                          "Amount",
                        ]}
                      />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]} fill="hsl(var(--chart-1))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full animate-pulse rounded-lg bg-muted/40" />
                )}
              </div>
            </div>

            {/* Rep Distribution Pie Chart */}
            <div className="rounded-xl border border-muted/40 bg-card/50 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Loss Opportunities by Sales Rep
              </div>
              <div className="h-[280px]">
                {repBreakdown.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={repBreakdown}
                        dataKey="count"
                        nameKey="rep"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${getInitials(entry.rep)}: ${entry.count} | ${formatCompactCurrency(entry.amount)} (${entry.percentage.toFixed(1)}%)`}
                        labelLine={false}
                      >
                        {repBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string, props: { payload?: { percentage?: number } }) => [
                          `${value} opportunities (${props.payload?.percentage?.toFixed(1) ?? 0}%)`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full animate-pulse rounded-lg bg-muted/40" />
                )}
              </div>
            </div>
          </div>

          {/* Opportunities Table */}
          <div className="rounded-xl border border-muted/40 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Rep</TableHead>
                    <TableHead className="text-right">Qty (SqFt)</TableHead>
                    <TableHead className="text-right">Target Price</TableHead>
                    <TableHead className="text-right">Potential</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[70px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opp) => (
                    <TableRow key={opp.id}>
                      <TableCell className="font-medium">
                        <span className="text-sm">{truncateDealerName(opp.dealer)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded px-2 py-1 font-mono text-xs">
                          {getInitials(opp.rep)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtCompact(safeQuantity(opp))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtUSD2(opp.target_price)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatCompactCurrency(safePotential(opp))}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{opp.color_name || "—"}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(opp.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(opp)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loss Opportunity Details</DialogTitle>
          </DialogHeader>
          {selectedOpp && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dealer</p>
                  <p className="text-sm font-medium">{selectedOpp.dealer}</p>
                  <p className="text-xs text-muted-foreground">ID: {selectedOpp.dealer_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sales Rep</p>
                  <p className="text-sm font-medium">{selectedOpp.rep}</p>
                  <p className="text-xs text-muted-foreground">ID: {selectedOpp.rep_id}</p>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quantity</p>
                  <p className="font-montserrat text-xl font-semibold tabular-nums">
                    {fmtCompact(safeQuantity(selectedOpp))} SqFt
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target Price</p>
                  <p className="font-montserrat text-xl font-semibold tabular-nums">
                    {fmtUSD2(selectedOpp.target_price)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Potential Lost</p>
                  <p className="font-montserrat text-xl font-semibold tabular-nums text-destructive">
                    {fmtUSD2(safePotential(selectedOpp))}
                  </p>
                </div>
              </div>

              {/* Product Details */}
              <div className="space-y-3">
                <p className="text-sm font-semibold">Product Information</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedOpp.category_key && (
                    <div className="rounded-lg border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Category</p>
                      <p className="text-sm font-medium">{selectedOpp.category_key}</p>
                    </div>
                  )}
                  {selectedOpp.collection_key && (
                    <div className="rounded-lg border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Collection</p>
                      <p className="text-sm font-medium">{selectedOpp.collection_key}</p>
                    </div>
                  )}
                  {selectedOpp.color_name && (
                    <div className="rounded-lg border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Color</p>
                      <p className="text-sm font-medium">{selectedOpp.color_name}</p>
                    </div>
                  )}
                  {selectedOpp.expected_sku && (
                    <div className="rounded-lg border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Expected SKU</p>
                      <p className="text-sm font-medium font-mono">{selectedOpp.expected_sku}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Loss Details */}
              <div className="space-y-3">
                <p className="text-sm font-semibold">Loss Information</p>
                <div className="rounded-lg border bg-card p-4">
                  {/* 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Row 1 - Left: Reason */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Reason:</span>
                      <Badge variant="secondary">{selectedOpp.reason}</Badge>
                    </div>
                    {/* Row 1 - Right: See Files */}
                    <div className="flex items-center justify-end">
                      {selectedOpp.attachment_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAttachmentOpen(!attachmentOpen)}
                          className="h-8 gap-2 text-xs"
                        >
                          <Eye className="h-4 w-4" />
                          See Files
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No files</span>
                      )}
                    </div>
                    {/* Row 2 - Left: Submitted Date */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Submitted:</span>
                      <span className="text-sm">{formatDateEST(selectedOpp.created_at)}</span>
                    </div>
                    {/* Row 2 - Right: Time */}
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-muted-foreground">Time:</span>
                      <span className="text-sm">{formatTimeEST(selectedOpp.created_at)}</span>
                    </div>
                  </div>
                  {/* Attachment Preview - Collapsible */}
                  {attachmentOpen && selectedOpp.attachment_url && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Attachment Preview</p>
                        {selectedOpp.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img
                            src={selectedOpp.attachment_url}
                            alt="Loss opportunity attachment"
                            className="w-full rounded-lg border"
                          />
                        ) : selectedOpp.attachment_url.match(/\.pdf$/i) ? (
                          <iframe
                            src={selectedOpp.attachment_url}
                            className="w-full h-96 rounded-lg border"
                            title="PDF attachment"
                          />
                        ) : (
                          <a
                            href={selectedOpp.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Open attachment in new tab
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedOpp.notes && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Notes</p>
                  <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground italic">
                    {selectedOpp.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
