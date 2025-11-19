"use client";

import { useState, useEffect } from "react";
import { Plus, Upload, Edit2, Download, Filter, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CustomersSection } from "./customers-section";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { SalesRep, SalesTarget, Customer } from "./types";

export function SalesHubSettings() {
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Collapsible section state
  const [repsExpanded, setRepsExpanded] = useState(false);
  const [targetsExpanded, setTargetsExpanded] = useState(false);

  // Rep modal state
  const [repModalOpen, setRepModalOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<SalesRep | null>(null);
  const [repName, setRepName] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [repPhone, setRepPhone] = useState("");
  const [repProfilePicture, setRepProfilePicture] = useState("");
  const [repSaving, setRepSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Target editing state
  const [editingTarget, setEditingTarget] = useState<{ rep_id: number; month: string } | null>(null);
  const [editTargetValue, setEditTargetValue] = useState("");

  // Rep filter state
  const [selectedRepIds, setSelectedRepIds] = useState<number[]>([]);

  // CSV upload state
  const [csvUploading, setCsvUploading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [repsRes, targetsRes, customersRes] = await Promise.all([
        fetch("/api/sales-hub/reps"),
        fetch(`/api/sales-hub/targets?year=${selectedYear}`),
        fetch("/api/sales-hub/customers"),
      ]);

      const repsData = await repsRes.json();
      const targetsData = await targetsRes.json();
      const customersData = await customersRes.json();

      setReps(repsData.data || []);
      setTargets(targetsData.data || []);
      setCustomers(customersData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage({ type: "error", text: "Failed to load sales hub data" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRep = () => {
    setEditingRep(null);
    setRepName("");
    setRepEmail("");
    setRepPhone("");
    setRepProfilePicture("");
    setRepModalOpen(true);
  };

  const handleEditRep = (rep: SalesRep) => {
    setEditingRep(rep);
    setRepName(rep.rep_name);
    setRepEmail(rep.rep_email || "");
    setRepPhone(rep.rep_phone || "");
    setRepProfilePicture(rep.rep_profile_picture || "");
    setRepModalOpen(true);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please upload an image file" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be less than 5MB" });
      return;
    }

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRepProfilePicture(reader.result as string);
        setUploadingImage(false);
      };
      reader.onerror = () => {
        setMessage({ type: "error", text: "Failed to read image file" });
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading image:", error);
      setMessage({ type: "error", text: "Failed to upload image" });
      setUploadingImage(false);
    }
  };

  const handleSaveRep = async () => {
    if (!repName.trim()) {
      setMessage({ type: "error", text: "Rep name is required" });
      return;
    }

    setRepSaving(true);
    try {
      const method = editingRep ? "PATCH" : "POST";
      const body = editingRep
        ? { rep_id: editingRep.rep_id, rep_name: repName, rep_email: repEmail, rep_phone: repPhone, rep_profile_picture: repProfilePicture }
        : { rep_name: repName, rep_email: repEmail, rep_phone: repPhone, rep_profile_picture: repProfilePicture };

      const res = await fetch("/api/sales-hub/reps", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Failed to save rep");
      }

      setMessage({
        type: "success",
        text: editingRep ? "Rep updated successfully" : "Rep added successfully",
      });
      setRepModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving rep:", error);
      setMessage({ type: "error", text: "Failed to save rep" });
    } finally {
      setRepSaving(false);
    }
  };

  const handleCellClick = (rep_id: number, month: string, currentAmount: number) => {
    setEditingTarget({ rep_id, month });
    setEditTargetValue(currentAmount.toString());
  };

  const handleTargetChange = async (rep_id: number, month: string, newAmount: number) => {
    try {
      const res = await fetch("/api/sales-hub/targets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rep_id, target_month: month, target_amount: newAmount }),
      });

      if (!res.ok) {
        throw new Error("Failed to update target");
      }

      setMessage({ type: "success", text: "Target updated successfully" });
      fetchData();
    } catch (error) {
      console.error("Error updating target:", error);
      setMessage({ type: "error", text: "Failed to update target" });
    }
    setEditingTarget(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rep_id: number, month: string) => {
    if (e.key === "Enter") {
      const newAmount = parseFloat(editTargetValue);
      if (!isNaN(newAmount) && newAmount >= 0) {
        handleTargetChange(rep_id, month, newAmount);
      }
    } else if (e.key === "Escape") {
      setEditingTarget(null);
    }
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvUploading(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      const headers = lines[0].split(",").map(h => h.trim());

      const targets = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim());
        const target: Record<string, string> = {};
        headers.forEach((header, index) => {
          target[header] = values[index];
        });
        return target;
      });

      const res = await fetch("/api/sales-hub/targets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets, year: selectedYear }),
      });

      if (!res.ok) {
        throw new Error("Failed to upload targets");
      }

      const data = await res.json();
      setMessage({ type: "success", text: data.message || "Targets uploaded successfully" });
      fetchData();
    } catch (error) {
      console.error("Error uploading CSV:", error);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to upload CSV" });
    } finally {
      setCsvUploading(false);
      event.target.value = "";
    }
  };

  const handleSeedTargets = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/sales-hub/targets/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: selectedYear }),
      });

      if (!res.ok) {
        throw new Error("Failed to seed targets");
      }

      const data = await res.json();
      setMessage({ type: "success", text: data.message || "Targets seeded successfully" });
      fetchData();
    } catch (error) {
      console.error("Error seeding targets:", error);
      setMessage({ type: "error", text: "Failed to seed targets" });
    } finally {
      setSeeding(false);
    }
  };

  const downloadCsvTemplate = () => {
    const headers = ["rep_id", "target_month", "target_amount"];
    const sampleData = ["1", "2025-01", "200000"];
    const csv = [headers.join(","), sampleData.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales_targets_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter out Dismissed and Intercompany reps from targets view
  const filteredReps = reps.filter(
    (rep) => !rep.rep_name.trim().toLowerCase().includes("dismissed") &&
             !rep.rep_name.trim().toLowerCase().includes("intercompany")
  );

  // Apply user-selected rep filter
  const displayReps = selectedRepIds.length > 0
    ? filteredReps.filter((rep) => selectedRepIds.includes(rep.rep_id))
    : filteredReps;

  // Group targets by rep and merge with rep names
  const targetsByRep = displayReps.reduce((acc, rep) => {
    acc[rep.rep_id] = {
      rep_name: rep.rep_name,
      targets: {},
    };
    return acc;
  }, {} as Record<number, { rep_name: string; targets: Record<string, number> }>);

  // Fill in target amounts
  targets.forEach((target) => {
    if (targetsByRep[target.rep_id]) {
      targetsByRep[target.rep_id].targets[target.target_month] = target.target_amount;
    }
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, "0");
    return `${selectedYear}-${month}`;
  });

  // Auto-hide message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="space-y-6">
      {/* Success/Error Message */}
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"} className="mb-4">
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Sales Reps Management */}
      <Card className="border-none bg-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="font-montserrat text-xl">Sales Representatives</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRepsExpanded(!repsExpanded)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      repsExpanded ? "transform rotate-180" : ""
                    }`}
                  />
                </Button>
              </div>
              <CardDescription>Manage your sales team members ({reps.length} total)</CardDescription>
            </div>
            {repsExpanded && (
              <Button onClick={handleAddRep}>
                <Plus className="w-4 h-4 mr-2" />
                Add Rep
              </Button>
            )}
          </div>
        </CardHeader>
        {repsExpanded && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reps.map((rep) => (
                <div
                  key={rep.rep_id}
                  className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {rep.rep_profile_picture ? (
                      <img
                        src={rep.rep_profile_picture}
                        alt={rep.rep_name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-muted"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium">
                        {rep.rep_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{rep.rep_name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        #{rep.rep_id}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditRep(rep)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Monthly Targets Management */}
      <Card className="border-none bg-background">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="font-montserrat text-xl">Monthly Sales Targets</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTargetsExpanded(!targetsExpanded)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      targetsExpanded ? "transform rotate-180" : ""
                    }`}
                  />
                </Button>
              </div>
              <CardDescription>Set and manage monthly targets for each rep</CardDescription>
            </div>
            {targetsExpanded && (
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
            )}
          </div>
        </CardHeader>
        {targetsExpanded && (
          <CardContent>
          {targets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-foreground mb-2">No Targets Set for {selectedYear}</h3>
                <p className="text-sm mb-6">
                  You haven&apos;t set any sales targets for this year yet. Would you like to create default targets
                  of $200k/month for all {reps.length} sales reps?
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={downloadCsvTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                  <Button onClick={handleSeedTargets} disabled={seeding}>
                    {seeding ? "Creating..." : "Create Default Targets"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-2">
                          Rep Name
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Filter className="w-3 h-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-sm">Filter Sales Reps</h4>
                                  {selectedRepIds.length > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedRepIds([])}
                                      className="h-6 text-xs"
                                    >
                                      Clear
                                    </Button>
                                  )}
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-2">
                                  {filteredReps.map((rep) => (
                                    <div key={rep.rep_id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`rep-${rep.rep_id}`}
                                        checked={selectedRepIds.includes(rep.rep_id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedRepIds([...selectedRepIds, rep.rep_id]);
                                          } else {
                                            setSelectedRepIds(selectedRepIds.filter((id) => id !== rep.rep_id));
                                          }
                                        }}
                                      />
                                      <label htmlFor={`rep-${rep.rep_id}`} className="text-sm cursor-pointer flex-1">
                                        {rep.rep_name}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableHead>
                      {months.map((month) => {
                        // Extract month number from YYYY-MM format to avoid timezone issues
                        const monthNum = parseInt(month.split("-")[1], 10);
                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        return (
                          <TableHead key={month} className="text-center min-w-[100px]">
                            {monthNames[monthNum - 1]}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(targetsByRep).map(([rep_id, { rep_name, targets: repTargets }]) => (
                      <TableRow key={rep_id}>
                        <TableCell className="sticky left-0 bg-background font-medium">
                          {rep_name}
                        </TableCell>
                        {months.map((month) => {
                          const amount = repTargets[month] || 200000;
                          const isEditing = editingTarget?.rep_id === parseInt(rep_id) && editingTarget?.month === month;

                          return (
                            <TableCell key={month} className="text-center">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  value={editTargetValue}
                                  onChange={(e) => setEditTargetValue(e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, parseInt(rep_id), month)}
                                  onBlur={() => setEditingTarget(null)}
                                  className="w-full text-center"
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => handleCellClick(parseInt(rep_id), month, amount)}
                                  className="w-full text-center hover:bg-muted rounded px-2 py-1 transition-colors"
                                >
                                  ${amount.toLocaleString()}
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
              <div className="mt-4 space-y-2">
                {selectedRepIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-muted-foreground">Filtered by:</span>
                    {selectedRepIds.map((repId) => {
                      const rep = reps.find((r) => r.rep_id === repId);
                      return rep ? (
                        <Badge key={repId} variant="secondary" className="gap-1">
                          {rep.rep_name}
                          <button
                            onClick={() => setSelectedRepIds(selectedRepIds.filter((id) => id !== repId))}
                            className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Click on any target amount to edit. Press Enter to save or Escape to cancel.
                </p>
              </div>
            </>
          )}
          </CardContent>
        )}
      </Card>

      {/* Customers Section */}
      <CustomersSection
        customers={customers}
        reps={reps}
        onCustomerUpdate={fetchData}
        onMessage={setMessage}
      />

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
              <Label htmlFor="rep-name">Full Name *</Label>
              <Input
                id="rep-name"
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                placeholder="e.g., Juan Pedro Boscan"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rep-email">Email</Label>
              <Input
                id="rep-email"
                type="email"
                value={repEmail}
                onChange={(e) => setRepEmail(e.target.value)}
                placeholder="e.g., juan.boscan@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rep-phone">Phone</Label>
              <Input
                id="rep-phone"
                type="tel"
                value={repPhone}
                onChange={(e) => setRepPhone(e.target.value)}
                placeholder="e.g., +1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rep-picture">Profile Picture</Label>
              <div className="flex items-center gap-3">
                {repProfilePicture && (
                  <img
                    src={repProfilePicture}
                    alt="Profile preview"
                    className="w-16 h-16 rounded-full object-cover border-2 border-muted"
                  />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={uploadingImage}
                >
                  <label className="cursor-pointer">
                    {uploadingImage ? "Uploading..." : "Upload Image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </label>
                </Button>
                {repProfilePicture && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRepProfilePicture("")}
                    disabled={uploadingImage}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a profile picture (max 5MB, JPEG/PNG)
              </p>
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
