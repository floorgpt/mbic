"use client";

import * as React from "react";

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
    "Revenue",
    "Avg Price",
    "Avg COGS",
    "Gross Margin %",
    "Gross Profit",
  ];
  const data = rows.map((row) => [
    row.dealer,
    row.revenue,
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

export function TopCollections({
  collections,
  from,
  to,
  meta,
}: TopCollectionsProps) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<CollectionSummary | null>(null);
  const { data, meta: dealersMeta, error, loading } = useCollectionDealers(
    selected?.collection ?? null,
    from,
    to,
    open,
  );

  const handleOpen = (collection: CollectionSummary) => {
    setSelected(collection);
    setOpen(true);
  };

  const handleExport = React.useCallback(() => {
    if (!selected) return;
    const csv = toCsv(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const fileName = `${selected.collection.replace(/\s+/g, "-").toLowerCase()}-${from}-to-${to}.csv`;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }, [data, from, to, selected]);

  const drawerMeta = dealersMeta ?? meta;

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
        <SheetContent side="right" className="w-full max-w-3xl">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="font-montserrat text-xl font-semibold">
              {selected ? `Collection: ${selected.collection}` : "Collection details"}
            </SheetTitle>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
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
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {drawerMeta?.ok
                  ? `${drawerMeta.count} dealers`
                  : drawerMeta?.err ?? "Dealers unavailable"}
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
            {loading ? (
              <div className="rounded-xl border border-dashed border-muted bg-muted/40 p-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
                  Thinking…
                </div>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : data.length ? (
              <div className="max-h-[60vh] overflow-auto rounded-xl border border-muted/60">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Dealer</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Avg Price</TableHead>
                      <TableHead className="text-right">Avg COGS</TableHead>
                      <TableHead className="text-right">Gross Margin %</TableHead>
                      <TableHead className="text-right">Gross Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => (
                      <TableRow key={row.dealer}>
                        <TableCell className="font-medium">{row.dealer}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtUSD0(row.revenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtUSD0(row.avg_price)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtUSD0(row.avg_cogs)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtPct0(row.gross_margin)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtUSD0(row.gross_profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-muted bg-muted/40 p-6 text-sm text-muted-foreground">
                No dealer data yet for this collection.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
