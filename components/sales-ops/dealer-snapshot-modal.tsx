"use client";

import * as React from "react";
import Link from "next/link";
import { Download, ExternalLink, TrendingUp, DollarSign, Percent } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtUSD0, fmtPct0 } from "@/lib/format";

type DealerSnapshotData = {
  dealer_id: number;
  dealer_name: string;
  rep_id: number;
  rep_name: string;
  collection: string;
  collection_revenue: number;
  total_revenue: number;
  collection_share_pct: number;
  invoice_count: number;
  from: string;
  to: string;
};

type DealerSnapshotModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealerId: number | null;
  collection: string | null;
  from: string;
  to: string;
};

export function DealerSnapshotModal({
  open,
  onOpenChange,
  dealerId,
  collection,
  from,
  to,
}: DealerSnapshotModalProps) {
  const [data, setData] = React.useState<DealerSnapshotData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !dealerId || !collection) {
      setData(null);
      setError(null);
      return;
    }

    const abortController = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      dealerId: String(dealerId),
      collection,
      from,
      to,
    });

    fetch(`/api/dealer-snapshot?${params.toString()}`, {
      signal: abortController.signal,
    })
      .then((res) => res.json())
      .then((result) => {
        if (!result.ok) {
          throw new Error(result.error ?? "Failed to load dealer snapshot");
        }
        setData(result.data);
      })
      .catch((err) => {
        if (abortController.signal.aborted) return;
        setError((err as Error)?.message ?? String(err));
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });

    return () => abortController.abort();
  }, [open, dealerId, collection, from, to]);

  const handleDownloadInvoices = async () => {
    if (!dealerId || !collection) return;

    try {
      setDownloading(true);
      const params = new URLSearchParams({
        dealerId: String(dealerId),
        collection,
        from,
        to,
      });

      const response = await fetch(`/api/dealer-collection-invoices?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to download invoices");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dealer-${dealerId}-${collection}-invoices.csv`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error("[dealer-snapshot] download:error", err);
      alert("Failed to download invoices");
    } finally {
      setDownloading(false);
    }
  };

  const detailsUrl = data
    ? `/sales?rep=${encodeURIComponent(data.rep_name)}&dealer=${data.dealer_id}#dealer-performance`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-montserrat text-xl font-semibold">
            {data?.dealer_name ?? "Dealer Snapshot"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-3 w-3 animate-ping rounded-full bg-primary" />
              Loading dealer snapshot...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Airtable-style Header Card */}
            <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      ID: {data.dealer_id}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {data.collection}
                    </Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{data.dealer_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Sales Rep: <span className="font-medium text-foreground">{data.rep_name}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Collection Revenue */}
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>Collection Revenue</span>
                </div>
                <p className="mt-2 font-montserrat text-2xl font-bold text-foreground">
                  {fmtUSD0(data.collection_revenue)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  From {data.invoice_count} invoices
                </p>
              </div>

              {/* Total Revenue */}
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Total Revenue (All Collections)</span>
                </div>
                <p className="mt-2 font-montserrat text-2xl font-bold text-foreground">
                  {fmtUSD0(data.total_revenue)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {from} to {to}
                </p>
              </div>

              {/* Collection Share */}
              <div className="rounded-lg border bg-card p-4 sm:col-span-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Percent className="h-4 w-4" />
                  <span>Collection Share</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="font-montserrat text-2xl font-bold text-foreground">
                    {fmtPct0(data.collection_share_pct)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    of dealer&apos;s total purchases
                  </p>
                </div>
                {/* Visual bar */}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(data.collection_share_pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Insight Blurb */}
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{data.dealer_name}</span> has purchased{" "}
                <span className="font-semibold text-foreground">{fmtUSD0(data.collection_revenue)}</span> from the{" "}
                <span className="font-semibold text-foreground">{data.collection}</span> collection, representing{" "}
                <span className="font-semibold text-foreground">{fmtPct0(data.collection_share_pct)}</span> of their
                total purchases in this period.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadInvoices}
                disabled={downloading || !data.invoice_count}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                {downloading ? "Downloading..." : `Download ${data.invoice_count} Invoices`}
              </Button>

              {detailsUrl && (
                <Button
                  type="button"
                  asChild
                  className="flex-1"
                >
                  <Link href={detailsUrl}>
                    View Full Details
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
