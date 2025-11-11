"use client";

import * as React from "react";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";

import { fmtPct0, fmtUSD0, fmtUSDCompact } from "@/lib/format";
import type { PanelMeta } from "@/lib/utils";
import { fetchCollectionDealers } from "@/lib/salesops-client";
import type { CollectionDealerRow } from "@/types/salesops";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DealerSnapshotModal } from "@/components/sales-ops/dealer-snapshot-modal";

type CollectionSummary = {
  collection: string;
  revenue: number;
  sharePct: number;
};

type TopCollectionsProps = {
  collections: CollectionSummary[];
  from: string;
  to: string;
  meta: PanelMeta;
};

function toCsv(rows: CollectionDealerRow[]): string {
  const header = [
    "Dealer",
    "Dealer ID",
    "Revenue",
    "Buying Power %",
    "Preferred Color",
    "Avg Price",
    "Avg COGS",
    "Gross Margin %",
    "Gross Profit",
  ];
  const data = rows.map((row) => [
    row.dealer,
    row.dealer_id,
    row.revenue,
    row.buying_power_pct,
    row.preferred_color,
    row.avg_price,
    row.avg_cogs,
    row.gross_margin,
    row.gross_profit,
  ]);
  const csvRows = [header, ...data].map((cols) =>
    cols
      .map((value) => {
        if (value == null) return "";
        const str = typeof value === "number" ? String(value) : String(value);
        return str.includes(",") ? `"${str.replace(/"/g, '""')}"` : str;
      })
      .join(","),
  );
  return csvRows.join("\n");
}

function useCollectionDealers(collection: string | null, from: string, to: string, open: boolean) {
  const [meta, setMeta] = React.useState<PanelMeta | null>(null);
  const [data, setData] = React.useState<CollectionDealerRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !collection) return;
    const abortController = new AbortController();
    setLoading(true);
    setError(null);
    fetchCollectionDealers(collection, from, to, abortController.signal)
      .then((result) => {
        setMeta(result.meta);
        setData(result.data);
        setError(result.error ?? null);
      })
      .catch((err) => {
        if (abortController.signal.aborted) return;
        setError((err as Error)?.message ?? String(err));
        setData([]);
        setMeta({
          ok: false,
          count: 0,
          err: (err as Error)?.message ?? String(err),
        });
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });

    return () => abortController.abort();
  }, [collection, from, to, open]);

  return { meta, data, error, loading };
}

const PAGE_SIZE = 5;

export function TopCollections({
  collections,
  from,
  to,
  meta,
}: TopCollectionsProps) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<CollectionSummary | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedDealer, setSelectedDealer] = React.useState<{id: number, collection: string} | null>(null);

  const { data, meta: dealersMeta, error, loading } = useCollectionDealers(
    selected?.collection ?? null,
    from,
    to,
    open,
  );

  const handleOpen = (collection: CollectionSummary) => {
    setSelected(collection);
    setCurrentPage(1);
    setOpen(true);
  };

  const handleExport = React.useCallback(() => {
    if (!selected) return;
    const csv = toCsv(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const fileName = `${selected.collection.replace(/\s+/g, "-").toLowerCase()}-dealers-${from}-to-${to}.csv`;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }, [data, from, to, selected]);

  const drawerMeta = dealersMeta ?? meta;

  // Separate top 5 and rest
  const topDealers = data.slice(0, 5);
  const restDealers = data.slice(5);

  // Pagination for rest dealers
  const totalPages = Math.ceil(restDealers.length / PAGE_SIZE);
  const paginatedDealers = restDealers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Calculate insights
  const totalActiveDealers = data.length;
  const top5Revenue = topDealers.reduce((sum, d) => sum + Number(d.revenue), 0);
  const totalRevenue = data.reduce((sum, d) => sum + Number(d.revenue), 0);
  const top5Percentage = totalRevenue > 0 ? (top5Revenue / totalRevenue) * 100 : 0;

  // Most common preferred color among top dealers
  const colorCounts = topDealers.reduce((acc, d) => {
    acc[d.preferred_color] = (acc[d.preferred_color] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  return (
    <>
      <div className="space-y-2">
        {collections.length ? (
          collections.map((item) => (
            <button
              key={item.collection}
              type="button"
              onClick={() => handleOpen(item)}
              className="group flex w-full items-center justify-between rounded-lg border border-transparent bg-muted/40 px-4 py-3 text-left transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary">
                  {item.collection}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fmtUSDCompact(item.revenue)} lifetime
                </p>
              </div>
              <div className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                {fmtPct0(item.sharePct)} share
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-muted bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
            {meta.ok ? "No collections in this range yet." : meta.err ?? "Collections unavailable."}
          </div>
        )}
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-4xl overflow-y-auto px-6">
          <SheetHeader className="border-b pb-6 mb-2 -mx-6 px-6">
            <SheetTitle className="font-montserrat text-xl font-semibold mb-3">
              {selected ? `Collection: ${selected.collection}` : "Collection details"}
            </SheetTitle>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>
                Date range: <span className="font-medium text-foreground">{from}</span> to{" "}
                <span className="font-medium text-foreground">{to}</span>
              </p>
              {selected ? (
                <p>
                  Total revenue:{" "}
                  <span className="font-medium text-foreground">{fmtUSD0(selected.revenue)}</span>{" "}
                  ({fmtPct0(selected.sharePct)} share)
                </p>
              ) : null}
            </div>
          </SheetHeader>

          <div className="flex flex-col gap-6 py-6 -mx-6 px-6">
            {loading ? (
              <div className="rounded-xl border border-dashed border-muted bg-muted/40 p-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
                  Loading dealer insights...
                </div>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : data.length > 0 ? (
              <>
                {/* Executive Summary Blurb */}
                <div className="rounded-lg border bg-muted/20 p-5 mb-2">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    From your <span className="font-semibold text-foreground">{totalActiveDealers}</span> active dealers,{" "}
                    <span className="font-semibold text-foreground">{fmtPct0(top5Percentage)}</span> of purchase volume goes to your{" "}
                    <span className="font-semibold text-foreground">top 5 dealers</span>, and{" "}
                    <span className="font-semibold text-foreground">{topColor}</span> is the preferred choice.
                  </p>
                </div>

                {/* Top 5 Dealers - Highlighted */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold">Top 5 Dealers</h3>
                      <p className="text-xs text-muted-foreground mt-1">The needle-movers (80/20 principle)</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleExport}
                      disabled={!drawerMeta?.ok || !data.length}
                    >
                      Export CSV
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {topDealers.map((dealer, index) => (
                      <div
                        key={`top-${dealer.dealer_id}`}
                        className="group relative rounded-lg border border-primary/20 bg-primary/5 p-5 transition hover:border-primary/40 hover:bg-primary/10"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="h-6 w-6 justify-center p-0 text-xs">
                                {index + 1}
                              </Badge>
                              <h4 className="font-semibold text-foreground">{dealer.dealer}</h4>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDealer({id: dealer.dealer_id, collection: selected?.collection ?? ""});
                                  setModalOpen(true);
                                }}
                                className="opacity-0 transition group-hover:opacity-100"
                                title="View dealer snapshot"
                              >
                                <Eye className="h-4 w-4 text-primary" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Revenue:</span>
                                <span className="font-semibold tabular-nums">{fmtUSD0(dealer.revenue)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Buying Power:</span>
                                <span className="font-semibold tabular-nums">{fmtPct0(dealer.buying_power_pct)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Preferred Color:</span>
                                <span className="font-medium">{dealer.preferred_color}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Gross Margin:</span>
                                <span className="font-semibold tabular-nums">{fmtPct0(dealer.gross_margin)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rest of Dealers - Paginated */}
                {restDealers.length > 0 && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold">All Other Dealers</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {restDealers.length} dealers sorted by purchase volume
                        </p>
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="min-w-[80px] text-center">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-muted/60 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead className="py-4">Dealer</TableHead>
                            <TableHead className="text-right py-4">Revenue</TableHead>
                            <TableHead className="text-right py-4">Buying Power</TableHead>
                            <TableHead className="py-4">Preferred Color</TableHead>
                            <TableHead className="text-right py-4">Margin</TableHead>
                            <TableHead className="w-[50px] py-4"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedDealers.map((dealer) => (
                            <TableRow key={dealer.dealer_id} className="group">
                              <TableCell className="font-medium py-4">{dealer.dealer}</TableCell>
                              <TableCell className="text-right tabular-nums py-4">
                                {fmtUSD0(dealer.revenue)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums py-4">
                                {fmtPct0(dealer.buying_power_pct)}
                              </TableCell>
                              <TableCell className="text-sm py-4">{dealer.preferred_color}</TableCell>
                              <TableCell className="text-right tabular-nums py-4">
                                {fmtPct0(dealer.gross_margin)}
                              </TableCell>
                              <TableCell className="py-4">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDealer({id: dealer.dealer_id, collection: selected?.collection ?? ""});
                                    setModalOpen(true);
                                  }}
                                  title="View dealer snapshot"
                                  className="inline-flex opacity-0 transition group-hover:opacity-100"
                                >
                                  <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-muted bg-muted/40 p-6 text-sm text-muted-foreground">
                No dealer data yet for this collection.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <DealerSnapshotModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        dealerId={selectedDealer?.id ?? null}
        collection={selectedDealer?.collection ?? null}
        from={from}
        to={to}
      />
    </>
  );
}
