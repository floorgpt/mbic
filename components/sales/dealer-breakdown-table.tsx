"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DealerAggregate } from "@/lib/db/sales";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils/format";

type DealerBreakdownTableProps = {
  dealers: DealerAggregate[];
  pageSize?: number;
};

export function DealerBreakdownTable({ dealers, pageSize = 5 }: DealerBreakdownTableProps) {
  const [page, setPage] = React.useState(0);

  const totalPages = Math.max(1, Math.ceil(dealers.length / pageSize));
  const start = page * pageSize;
  const current = dealers.slice(start, start + pageSize);

  const handlePrev = () => setPage((prev) => Math.max(0, prev - 1));
  const handleNext = () => setPage((prev) => Math.min(totalPages - 1, prev + 1));

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dealer</TableHead>
            <TableHead className="text-right">Invoices</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Avg Invoice</TableHead>
            <TableHead className="text-right">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {current.map((dealer) => (
            <TableRow key={dealer.customer_id}>
              <TableCell className="font-medium">{dealer.dealer_name}</TableCell>
              <TableCell className="text-right">{formatNumber(dealer.invoices)}</TableCell>
              <TableCell className="text-right">{formatCurrency(dealer.revenue)}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatCurrency(dealer.average_invoice)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatPercent(dealer.revenue_share)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {dealers.length === 0 ? 0 : start + 1}–
          {Math.min(start + pageSize, dealers.length)} of {dealers.length}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handlePrev}
            disabled={page === 0}
            className="size-7"
            aria-label="Previous dealers"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span>
            Page {page + 1} / {totalPages}
          </span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handleNext}
            disabled={page >= totalPages - 1}
            className="size-7"
            aria-label="Next dealers"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
