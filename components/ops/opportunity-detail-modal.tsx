"use client";

import { useState } from "react";
import { Edit2, Trash2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtCompact, fmtUSD2, fmtUSDCompact } from "@/lib/format";
import type { FutureSaleOpportunityDetail, FutureSaleStatus } from "@/types/ops";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type OpportunityDetailModalProps = {
  opportunity: FutureSaleOpportunityDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: number, data: Partial<FutureSaleOpportunityDetail>) => Promise<void>;
  onConfirmStock: (id: number, projectName: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

export function OpportunityDetailModal({
  opportunity,
  open,
  onOpenChange,
  onUpdate,
  onConfirmStock,
  onDelete,
}: OpportunityDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editStatus, setEditStatus] = useState<FutureSaleStatus>("open");
  const [editNotes, setEditNotes] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editUnitPrice, setEditUnitPrice] = useState("");
  const [editProbability, setEditProbability] = useState("");
  const [editCloseDate, setEditCloseDate] = useState("");
  const [editNeededDate, setEditNeededDate] = useState("");

  const handleEdit = () => {
    if (!opportunity) return;
    setEditStatus(opportunity.status);
    setEditNotes(opportunity.notes ?? "");
    setEditQty(String(opportunity.expected_qty ?? ""));
    setEditUnitPrice(String(opportunity.expected_unit_price ?? ""));
    setEditProbability(String(opportunity.probability_pct ?? ""));
    setEditCloseDate(opportunity.expected_close_date ?? "");
    setEditNeededDate(opportunity.needed_by_date ?? "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!opportunity) return;
    await onUpdate(opportunity.id, {
      status: editStatus,
      notes: editNotes,
      expected_qty: Number(editQty),
      expected_unit_price: Number(editUnitPrice),
      probability_pct: Number(editProbability),
      expected_close_date: editCloseDate || null,
      needed_by_date: editNeededDate || null,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!opportunity) return;
    await onDelete(opportunity.id);
    setShowDeleteDialog(false);
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (!opportunity) return;
    await onConfirmStock(opportunity.id, opportunity.project_name);
    onOpenChange(false);
  };

  if (!opportunity) return null;

  const statusColor = {
    open: "bg-blue-500/10 text-blue-600",
    in_process: "bg-amber-500/10 text-amber-600",
    closed: "bg-emerald-500/10 text-emerald-600",
  }[opportunity.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex-1 pr-6">
            <DialogTitle className="text-2xl font-semibold">
              {opportunity.project_name}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={cn("rounded-full", statusColor)}>
                {opportunity.status === "open" && "Open"}
                {opportunity.status === "in_process" && "In Process"}
                {opportunity.status === "closed" && "Closed"}
              </Badge>
              {opportunity.ops_stock_confirmed && (
                <Badge className="rounded-full bg-emerald-500">
                  <Check className="mr-1 h-3 w-3" />
                  Stock Confirmed
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Key Metrics */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-muted bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Expected Quantity
              </p>
              <p className="font-montserrat text-xl font-semibold text-foreground">
                {fmtCompact(opportunity.expected_qty)} SqFt
              </p>
            </div>
            <div className="rounded-lg border border-muted bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Unit Price
              </p>
              <p className="font-montserrat text-xl font-semibold text-foreground">
                {opportunity.expected_unit_price ? fmtUSD2(opportunity.expected_unit_price) : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-muted bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Potential Revenue
              </p>
              <p className="font-montserrat text-xl font-semibold text-foreground">
                {fmtUSDCompact(opportunity.potential_amount)}
              </p>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Opportunity Details
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Sales Rep</p>
                <p className="font-medium">{opportunity.rep_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dealer</p>
                <p className="font-medium">{opportunity.dealer_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Collection</p>
                <p className="font-medium">{opportunity.collection}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Color</p>
                <p className="font-medium">{opportunity.color}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected SKU</p>
                <p className="font-medium">{opportunity.expected_sku || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Probability</p>
                <p className="font-medium">{opportunity.probability_pct}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected Close Date</p>
                <p className="font-medium">{opportunity.expected_close_date || "TBD"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Needed By Date</p>
                <p className="font-medium">{opportunity.needed_by_date || "TBD"}</p>
              </div>
            </div>
          </div>

          {/* Edit Section */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {isEditing ? "Edit Opportunity" : "Status & Notes"}
            </h3>

            {isEditing ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Expected Quantity (SqFt)</label>
                    <Input
                      type="number"
                      value={editQty}
                      onChange={(e) => setEditQty(e.target.value)}
                      className="mt-1"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Unit Price ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editUnitPrice}
                      onChange={(e) => setEditUnitPrice(e.target.value)}
                      className="mt-1"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Probability (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editProbability}
                      onChange={(e) => setEditProbability(e.target.value)}
                      className="mt-1"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select value={editStatus} onValueChange={(val) => setEditStatus(val as FutureSaleStatus)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_process">In Process</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Expected Close Date</label>
                    <Input
                      type="date"
                      value={editCloseDate}
                      onChange={(e) => setEditCloseDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Needed By Date</label>
                    <Input
                      type="date"
                      value={editNeededDate}
                      onChange={(e) => setEditNeededDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="mt-1 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Add notes about this opportunity..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm">
                    Save Changes
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setShowDeleteDialog(true)}
                    variant="destructive"
                    size="sm"
                    className="ml-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Opportunity
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="rounded-lg border border-muted bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {opportunity.notes || "No notes added yet."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {!opportunity.ops_stock_confirmed && !isEditing && (
            <div className="flex gap-2 border-t pt-4">
              <Button onClick={handleEdit} variant="outline" size="sm">
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Details
              </Button>
              <Button onClick={handleConfirm} size="sm">
                <Check className="mr-2 h-4 w-4" />
                Confirm Stock
              </Button>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t pt-4 text-xs text-muted-foreground">
            <p>Created: {new Date(opportunity.created_at).toLocaleString()}</p>
            {opportunity.ops_confirmed_at && (
              <p>Stock Confirmed: {new Date(opportunity.ops_confirmed_at).toLocaleString()}</p>
            )}
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Opportunity</AlertDialogTitle>
            <AlertDialogDescription>
              Do you really want to delete this opportunity? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
