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
import { formatNumber } from "@/lib/utils/format";
import type { RepRow } from "@/lib/mbic-supabase";

type SortField = "revenue" | "monthly_avg" | "active_customers" | "total_customers" | "active_pct";
type SortDirection = "asc" | "desc";

interface TopRepsTableProps {
  reps: RepRow[];
}

export function TopRepsTable({ reps }: TopRepsTableProps) {
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

  const sortedReps = [...reps].sort((a, b) => {
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
      case "active_customers":
        aVal = a.active_customers ?? 0;
        bVal = b.active_customers ?? 0;
        break;
      case "total_customers":
        aVal = a.total_customers ?? 0;
        bVal = b.total_customers ?? 0;
        break;
      case "active_pct":
        aVal = a.active_pct ?? 0;
        bVal = b.active_pct ?? 0;
        break;
    }

    if (sortDirection === "asc") {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  return (
    <>
      <Table className="min-w-[720px]">
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow className="bg-card">
            <TableHead className="sticky top-0 bg-card">#</TableHead>
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
                onClick={() => handleSort("active_customers")}
              >
                <div className="flex items-center gap-1">
                  Active
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </Button>
            </TableHead>
            <TableHead className="sticky top-0 bg-card text-right">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 -mr-2 hover:bg-muted/50"
                onClick={() => handleSort("total_customers")}
              >
                <div className="flex items-center gap-1">
                  Total
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </Button>
            </TableHead>
            <TableHead className="sticky top-0 bg-card text-right">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 -mr-2 hover:bg-muted/50"
                onClick={() => handleSort("active_pct")}
              >
                <div className="flex items-center gap-1">
                  Active %
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedReps.map((rep, index) => (
            <TableRow key={`${rep.rep_id}-${index}`} className="h-12 odd:bg-muted/30">
              <TableCell className="text-muted-foreground">#{index + 1}</TableCell>
              <TableCell className="font-medium">{rep.rep_name}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtUSD0(rep.revenue ?? 0)}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {fmtUSD0(rep.monthly_avg ?? 0)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(rep.active_customers ?? 0)}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {formatNumber(rep.total_customers ?? 0)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {rep.active_pct == null ? "—" : fmtPct0(rep.active_pct)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="px-4 pb-4 text-right text-xs uppercase tracking-wide text-muted-foreground">
        Scroll →
      </p>
    </>
  );
}
