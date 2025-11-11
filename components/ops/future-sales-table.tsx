"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { fmtCompact, fmtUSD2, fmtUSDCompact } from "@/lib/format";
import type { FutureSaleOpportunityDetail } from "@/types/ops";
import { OpportunityDetailModal } from "./opportunity-detail-modal";
import { cn } from "@/lib/utils";

/**
 * Extract initials from a name (e.g., "John Smith" -> "JS")
 */
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

export function FutureSalesTable() {
  const [opportunities, setOpportunities] = useState<FutureSaleOpportunityDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<FutureSaleOpportunityDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ops/future-sales");
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.err ?? "Failed to fetch opportunities");
      }

      setOpportunities(result.data ?? []);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error("[ops] future-sales-table:fetch-error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOpportunities();
  }, []);

  const handleView = (opp: FutureSaleOpportunityDetail) => {
    setSelectedOpportunity(opp);
    setModalOpen(true);
  };

  const handleUpdate = async (id: number, data: Partial<FutureSaleOpportunityDetail>) => {
    try {
      const response = await fetch(`/api/ops/future-sales/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.err ?? "Failed to update opportunity");
      }

      // Update local state
      setOpportunities((prev) =>
        prev.map((opp) => (opp.id === id ? result.data : opp)),
      );

      // Update selected opportunity if it's the same one
      if (selectedOpportunity?.id === id) {
        setSelectedOpportunity(result.data);
      }
    } catch (err) {
      console.error("[ops] future-sales-table:update-error", err);
      alert(err instanceof Error ? err.message : "Failed to update");
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/ops/future-sales/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.err ?? "Failed to delete opportunity");
      }

      // Remove from local state
      setOpportunities((prev) => prev.filter((opp) => opp.id !== id));
      alert("Opportunity deleted successfully");
    } catch (err) {
      console.error("[ops] future-sales-table:delete-error", err);
      alert(err instanceof Error ? err.message : "Failed to delete");
      throw err;
    }
  };

  const handleConfirmStock = async (oppId: number, projectName: string) => {
    if (!confirm(`Confirm stock receipt for "${projectName}"?\n\nThis will:\n- Mark stock as confirmed\n- Set status to Closed\n- Trigger webhook notification`)) {
      return;
    }

    try {
      const response = await fetch(`/api/ops/future-sales/${oppId}/confirm-stock`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.err ?? "Failed to confirm stock");
      }

      // Update local state
      setOpportunities((prev) =>
        prev.map((opp) => (opp.id === oppId ? result.data : opp)),
      );

      alert(`Stock confirmed for "${projectName}"!${!result.webhook?.ok ? "\n\nNote: Webhook notification failed but data was saved." : ""}`);
    } catch (err) {
      console.error("[ops] future-sales-table:confirm-error", err);
      alert(err instanceof Error ? err.message : "Failed to confirm stock");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
            Loading opportunities...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-destructive">Error: {error}</div>
          <Button onClick={() => void fetchOpportunities()} variant="outline" className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (opportunities.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="rounded-xl border border-dashed border-muted bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            No future sale opportunities yet. Sales reps will add them via the forms page.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Rep</TableHead>
                <TableHead>Dealer</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-right">Qty (SqFt)</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead>Needed By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((opp) => {
                return (
                  <TableRow key={opp.id} className="group cursor-pointer" onClick={() => handleView(opp)}>
                    <TableCell className="font-medium">{opp.project_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground" title={opp.rep_name}>
                      {getInitials(opp.rep_name)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{opp.dealer_name}</TableCell>
                    <TableCell className="text-sm">{opp.color}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtCompact(opp.expected_qty)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {opp.expected_unit_price ? fmtUSD2(opp.expected_unit_price) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {fmtUSDCompact(opp.potential_amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {opp.needed_by_date ? new Date(opp.needed_by_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full",
                          opp.status === "closed" && "bg-emerald-500/10 text-emerald-600",
                          opp.status === "in_process" && "bg-amber-500/10 text-amber-600",
                          opp.status === "open" && "bg-blue-500/10 text-blue-600",
                        )}
                      >
                        {opp.status === "open" && "Open"}
                        {opp.status === "in_process" && "In Process"}
                        {opp.status === "closed" && "Closed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleView(opp)}
                          className="h-8 w-8 p-0 opacity-70 hover:opacity-100"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {opp.ops_stock_confirmed && (
                          <Badge variant="default" className="rounded-full bg-emerald-500">
                            ✓ Confirmed
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <OpportunityDetailModal
        opportunity={selectedOpportunity}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdate={handleUpdate}
        onConfirmStock={handleConfirmStock}
        onDelete={handleDelete}
      />
    </Card>
  );
}
