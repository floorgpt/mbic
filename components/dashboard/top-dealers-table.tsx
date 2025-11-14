"use client";

import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtPct0, fmtUSD0 } from "@/lib/format";
import type { DealerRow } from "@/lib/mbic-supabase";

type SortField = "revenue" | "monthly_avg" | "share_pct";
type SortDirection = "asc" | "desc";

interface TopDealersTableProps {
  dealers: DealerRow[];
  totalRevenue: number;
}

export function TopDealersTable({ dealers, totalRevenue }: TopDealersTableProps) {
  const [sortField, setSortField] = useState<SortField>("revenue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedDealers = [...dealers].sort((a, b) => {
    let aVal = 0;
    let bVal = 0;

    switch (sortField) {
      case "revenue":
        aVal = a.revenue ?? 0;
        bVal = b.revenue ?? 0;
        break;
      case "monthly_avg":
        aVal = a.monthly_avg ?? 0;
        bVal = b.monthly_avg ?? 0;
        break;
      case "share_pct":
        aVal = a.share_pct ?? (totalRevenue ? ((a.revenue ?? 0) / totalRevenue) * 100 : 0);
        bVal = b.share_pct ?? (totalRevenue ? ((b.revenue ?? 0) / totalRevenue) * 100 : 0);
        break;
    }

    if (sortDirection === "asc") {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  return (
    <>
      <Table className="min-w-[640px]">
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow className="bg-card">
            <TableHead className="sticky top-0 bg-card">#</TableHead>
            <TableHead className="sticky top-0 bg-card">Dealer</TableHead>
            <TableHead className="sticky top-0 bg-card">Rep</TableHead>
            <TableHead className="sticky top-0 bg-card text-right">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 -mr-2 hover:bg-muted/50"
                onClick={() => handleSort("revenue")}
              >
                <div className="flex items-center gap-1">
                  Revenue YTD
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </Button>
            </TableHead>
            <TableHead className="sticky top-0 bg-card text-right">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 -mr-2 hover:bg-muted/50"
                onClick={() => handleSort("monthly_avg")}
              >
                <div className="flex items-center gap-1">
                  Monthly Avg
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </Button>
            </TableHead>
            <TableHead className="sticky top-0 bg-card text-right">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 -mr-2 hover:bg-muted/50"
                onClick={() => handleSort("share_pct")}
              >
                <div className="flex items-center gap-1">
                  Share %
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedDealers.map((dealer, index) => {
            const revenue = dealer.revenue ?? 0;
            const share = dealer.share_pct ?? (totalRevenue ? (revenue / totalRevenue) * 100 : 0);
            return (
              <TableRow key={`${dealer.dealer_name}-${index}`} className="h-12 odd:bg-muted/30">
                <TableCell className="text-muted-foreground">#{index + 1}</TableCell>
                <TableCell className="font-medium">{dealer.dealer_name}</TableCell>
                <TableCell className="text-muted-foreground">{dealer.rep_initials ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtUSD0(revenue)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {fmtUSD0(dealer.monthly_avg ?? 0)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct0(share)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="px-4 pb-4 text-right text-xs uppercase tracking-wide text-muted-foreground">
        Scroll →
      </p>
    </>
  );
}
