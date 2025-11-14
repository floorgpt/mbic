"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

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

type SortField = "dealer_name" | "revenue" | "average_invoice" | "revenue_share";
type SortDirection = "asc" | "desc" | null;

type DealerBreakdownTableProps = {
  dealers: DealerAggregate[];
  pageSize?: number;
};

export function DealerBreakdownTable({ dealers, pageSize = 5 }: DealerBreakdownTableProps) {
  const [page, setPage] = React.useState(0);
  const [sortField, setSortField] = React.useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle through: asc -> desc -> null (unsorted)
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setPage(0); // Reset to first page when sorting changes
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="ml-1 h-3.5 w-3.5" />;
    }
    if (sortDirection === "desc") {
      return <ArrowDown className="ml-1 h-3.5 w-3.5" />;
    }
    return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />;
  };

  // Sort dealers based on current sort state
  const sortedDealers = React.useMemo(() => {
    if (!sortField || !sortDirection) {
      return dealers;
    }

    return [...dealers].sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;

      switch (sortField) {
        case "dealer_name":
          aValue = a.dealer_name.toLowerCase();
          bValue = b.dealer_name.toLowerCase();
          break;
        case "revenue":
          aValue = a.revenue;
          bValue = b.revenue;
          break;
        case "average_invoice":
          aValue = a.average_invoice;
          bValue = b.average_invoice;
          break;
        case "revenue_share":
          aValue = a.revenue_share;
          bValue = b.revenue_share;
          break;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [dealers, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedDealers.length / pageSize));
  const start = page * pageSize;
  const current = sortedDealers.slice(start, start + pageSize);

  const handlePrev = () => setPage((prev) => Math.max(0, prev - 1));
  const handleNext = () => setPage((prev) => Math.min(totalPages - 1, prev + 1));

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                onClick={() => handleSort("dealer_name")}
                className="flex items-center font-semibold hover:text-foreground transition-colors"
              >
                Dealer
                {getSortIcon("dealer_name")}
              </button>
            </TableHead>
            <TableHead className="text-right">Invoices</TableHead>
            <TableHead className="text-right">
              <button
                onClick={() => handleSort("revenue")}
                className="ml-auto flex items-center font-semibold hover:text-foreground transition-colors"
              >
                Revenue YTD
                {getSortIcon("revenue")}
              </button>
            </TableHead>
            <TableHead className="text-right">
              <button
                onClick={() => handleSort("average_invoice")}
                className="ml-auto flex items-center font-semibold hover:text-foreground transition-colors"
              >
                Monthly Avg
                {getSortIcon("average_invoice")}
              </button>
            </TableHead>
            <TableHead className="text-right">
              <button
                onClick={() => handleSort("revenue_share")}
                className="ml-auto flex items-center font-semibold hover:text-foreground transition-colors"
              >
                Share %
                {getSortIcon("revenue_share")}
              </button>
            </TableHead>
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
          Showing {sortedDealers.length === 0 ? 0 : start + 1}–
          {Math.min(start + pageSize, sortedDealers.length)} of {sortedDealers.length}
          {sortField && sortDirection && (
            <span className="ml-2 text-primary">
              (sorted by {sortField === "dealer_name" ? "name" : sortField === "revenue" ? "revenue" : sortField === "average_invoice" ? "avg invoice" : "share"} {sortDirection === "asc" ? "↑" : "↓"})
            </span>
          )}
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
