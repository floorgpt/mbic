"use client";

import { useState, useEffect } from "react";
import { Plus, Upload, Edit2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SalesRep = {
  rep_id: number;
  rep_name: string;
  created_at?: string;
};

type SalesTarget = {
  id: number;
  rep_id: number;
  target_month: string;
  target_amount: number;
  fiscal_year: number;
  sales_reps_demo?: { rep_name: string };
};

export function SalesHubSettings() {
  const { toast } = useToast();
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Rep modal state
  const [repModalOpen, setRepModalOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<SalesRep | null>(null);
  const [repName, setRepName] = useState("");
  const [repSaving, setRepSaving] = useState(false);

  // Target editing state
  const [editingTarget, setEditingTarget] = useState<{ rep_id: number; month: string } | null>(null);
  const [editTargetValue, setEditTargetValue] = useState("");

  // CSV upload state
  const [csvUploading, setCsvUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [repsRes, targetsRes] = await Promise.all([
        fetch("/api/sales-hub/reps"),
        fetch(`/api/sales-hub/targets?year=${selectedYear}`),
      ]);

      const repsData = await repsRes.json();
      const targetsData = await targetsRes.json();

      setReps(repsData.data || []);
      setTargets(targetsData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load sales hub data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRep = () => {
    setEditingRep(null);
    setRepName("");
    setRepModalOpen(true);
  };

  const handleEditRep = (rep: SalesRep) => {
    setEditingRep(rep);
    setRepName(rep.rep_name);
    setRepModalOpen(true);
  };

  const handleSaveRep = async () => {
    if (!repName.trim()) {
      toast({
        title: "Validation Error",
        description: "Rep name is required",
        variant: "destructive",
      });
      return;
    }

    setRepSaving(true);
    try {
      const method = editingRep ? "PATCH" : "POST";
      const body = editingRep
        ? { rep_id: editingRep.rep_id, rep_name: repName }
        : { rep_name: repName };

      const res = await fetch("/api/sales-hub/reps", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Failed to save rep");
      }

      toast({
        title: "Success",
        description: editingRep ? "Rep updated successfully" : "Rep added successfully",
      });

      setRepModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving rep:", error);
      toast({
        title: "Error",
        description: "Failed to save rep",
        variant: "destructive",
      });
    } finally {
      setRepSaving(false);
    }
  };

  const handleEditTarget = (rep_id: number, month: string, currentAmount: number) => {
    setEditingTarget({ rep_id, month });
    setEditTargetValue(currentAmount.toString());
  };

  const handleSaveTarget = async () => {
    if (!editingTarget) return;

    const amount = parseFloat(editTargetValue);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch("/api/sales-hub/targets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rep_id: editingTarget.rep_id,
          target_month: editingTarget.month,
          target_amount: amount,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update target");
      }

      toast({
        title: "Success",
        description: "Target updated successfully",
      });

      setEditingTarget(null);
      fetchData();
    } catch (error) {
      console.error("Error saving target:", error);
      toast({
        title: "Error",
        description: "Failed to update target",
        variant: "destructive",
      });
    }
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvUploading(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim());

      // Expected headers: rep_id, target_month, target_amount
      if (!headers.includes("rep_id") || !headers.includes("target_month") || !headers.includes("target_amount")) {
        throw new Error("CSV must have columns: rep_id, target_month, target_amount");
      }

      const repIdIdx = headers.indexOf("rep_id");
      const monthIdx = headers.indexOf("target_month");
      const amountIdx = headers.indexOf("target_amount");

      const targets = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        return {
          rep_id: parseInt(values[repIdIdx]),
          target_month: values[monthIdx],
          target_amount: parseFloat(values[amountIdx]),
        };
      });

      const res = await fetch("/api/sales-hub/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets }),
      });

      if (!res.ok) {
        throw new Error("Failed to upload targets");
      }

      const data = await res.json();
      toast({
        title: "Success",
        description: data.message || "Targets uploaded successfully",
      });

      fetchData();
    } catch (error) {
      console.error("Error uploading CSV:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload CSV",
        variant: "destructive",
      });
    } finally {
      setCsvUploading(false);
      event.target.value = "";
    }
  };

  const downloadCsvTemplate = () => {
    const currentYear = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => `${currentYear}-${String(i + 1).padStart(2, "0")}`);

    let csv = "rep_id,target_month,target_amount\n";
    reps.forEach((rep) => {
      months.forEach((month) => {
        csv += `${rep.rep_id},${month},200000\n`;
      });
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales_targets_template_${currentYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group targets by rep
  const targetsByRep = targets.reduce((acc, target) => {
    const repId = target.rep_id;
    if (!acc[repId]) {
      acc[repId] = {
        rep_name: target.sales_reps_demo?.rep_name || "Unknown",
        targets: {},
      };
    }
    acc[repId].targets[target.target_month] = target.target_amount;
    return acc;
  }, {} as Record<number, { rep_name: string; targets: Record<string, number> }>);

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, "0");
    return `${selectedYear}-${month}`;
  });

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Sales Reps Management */}
      <Card className="border-none bg-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-montserrat text-xl">Sales Representatives</CardTitle>
              <CardDescription>Manage your sales team members</CardDescription>
            </div>
            <Button onClick={handleAddRep}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rep
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reps.map((rep) => (
                  <TableRow key={rep.rep_id}>
                    <TableCell className="font-mono">{rep.rep_id}</TableCell>
                    <TableCell className="font-medium">{rep.rep_name}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRep(rep)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Targets Management */}
      <Card className="border-none bg-background">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="font-montserrat text-xl">Monthly Sales Targets</CardTitle>
              <CardDescription>Set and manage monthly targets for each rep</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={downloadCsvTemplate}>
                <Download className="w-4 h-4 mr-2" />
                CSV Template
              </Button>
              <Button variant="outline" disabled={csvUploading} asChild>
                <label className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  {csvUploading ? "Uploading..." : "Upload CSV"}
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCsvUpload}
                    disabled={csvUploading}
                  />
                </label>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-muted z-10">Rep Name</TableHead>
                  {months.map((month) => (
                    <TableHead key={month} className="text-center min-w-[100px]">
                      {new Date(month + "-01").toLocaleString("default", { month: "short" })}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(targetsByRep).map(([repId, data]) => (
                  <TableRow key={repId}>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      {data.rep_name}
                    </TableCell>
                    {months.map((month) => {
                      const amount = data.targets[month] || 200000;
                      const isEditing = editingTarget?.rep_id === parseInt(repId) && editingTarget?.month === month;

                      return (
                        <TableCell key={month} className="text-center">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={editTargetValue}
                                onChange={(e) => setEditTargetValue(e.target.value)}
                                className="w-24 h-8 text-xs"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveTarget();
                                  if (e.key === "Escape") setEditingTarget(null);
                                }}
                              />
                              <Button size="sm" variant="ghost" onClick={handleSaveTarget} className="h-8 w-8 p-0">
                                ✓
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingTarget(null)} className="h-8 w-8 p-0">
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <button
                              className="w-full h-full hover:bg-muted rounded px-2 py-1 text-sm"
                              onClick={() => handleEditTarget(parseInt(repId), month, amount)}
                            >
                              ${(amount / 1000).toFixed(0)}k
                            </button>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Click on any target amount to edit. Press Enter to save or Escape to cancel.
          </p>
        </CardContent>
      </Card>

      {/* Add/Edit Rep Modal */}
      <Dialog open={repModalOpen} onOpenChange={setRepModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRep ? "Edit Sales Rep" : "Add New Sales Rep"}</DialogTitle>
            <DialogDescription>
              {editingRep ? "Update the sales representative information" : "Add a new sales representative to your team"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rep-name">Rep Name</Label>
              <Input
                id="rep-name"
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                placeholder="e.g., Juan Pedro Boscan"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRep} disabled={repSaving}>
              {repSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
