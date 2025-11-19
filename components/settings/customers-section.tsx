"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Plus, Upload, Search, History, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { CustomerModal } from "./customer-modal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Customer, SalesRep, TransferHistory } from "./types";

type CustomersSectionProps = {
  customers: Customer[];
  reps: SalesRep[];
  onCustomerUpdate: () => void;
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
};

export function CustomersSection({
  customers,
  reps,
  onCustomerUpdate,
  onMessage,
}: CustomersSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerSaving, setCustomerSaving] = useState(false);
  const [transferHistory, setTransferHistory] = useState<TransferHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // CSV Import Modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState(false);

  // Filtered customers based on search
  const filteredCustomers = customers.filter((customer) =>
    customer.dealer_name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const showAutocomplete = customerSearch && !selectedCustomer && filteredCustomers.length > 0;

  // Summary statistics
  const totalCustomers = customers.length;

  // Count dismissed customers (rep_id = 14)
  const dismissedCustomers = customers.filter((c) => {
    if (!c.rep_id) return false;
    const rep = reps.find((r) => r.rep_id === c.rep_id);
    return rep?.rep_name.trim().toLowerCase().includes("dismissed");
  }).length;

  // Count intercompany customers (rep_id = 15)
  const intercompanyCustomers = customers.filter((c) => {
    if (!c.rep_id) return false;
    const rep = reps.find((r) => r.rep_id === c.rep_id);
    return rep?.rep_name.trim().toLowerCase().includes("intercompany");
  }).length;

  // Count assigned customers (has a rep_id, excluding Dismissed and Intercompany)
  // This matches the logic in dealer_activity_month_details RPC: "where c.rep_id not in (14, 15)"
  const assignedCustomers = customers.filter((c) => {
    if (!c.rep_id) return false;
    const rep = reps.find((r) => r.rep_id === c.rep_id);
    if (!rep) return false;
    const repNameLower = rep.rep_name.trim().toLowerCase();
    return !repNameLower.includes("dismissed") && !repNameLower.includes("intercompany");
  }).length;

  // Count unassigned customers (rep_id is null)
  const customersWithoutReps = customers.filter((c) => c.rep_id === null).length;

  // Handle customer selection
  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.dealer_name);

    // Fetch transfer history
    try {
      const res = await fetch(`/api/sales-hub/customers/${customer.customer_id}/history`);
      const data = await res.json();
      setTransferHistory(data.data || []);
    } catch (error) {
      console.error("Error fetching transfer history:", error);
    }
  };

  // Handle edit customer
  const handleEditCustomer = () => {
    if (selectedCustomer) {
      setEditingCustomer(selectedCustomer);
      setCustomerModalOpen(true);
    }
  };

  // Handle add customer
  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setCustomerModalOpen(true);
  };

  // Handle save customer
  const handleSaveCustomer = async (customerData: Partial<Customer>) => {
    setCustomerSaving(true);
    try {
      const method = editingCustomer ? "PATCH" : "POST";
      const body = editingCustomer
        ? { customer_id: editingCustomer.customer_id, ...customerData }
        : customerData;

      const res = await fetch("/api/sales-hub/customers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Failed to save customer");
      }

      const result = await res.json();
      const savedCustomer = result.data;

      onMessage({
        type: "success",
        text: editingCustomer
          ? `Customer "${savedCustomer.dealer_name}" updated successfully`
          : `Customer "${savedCustomer.dealer_name}" added successfully to customers_demo table`,
      });

      setCustomerModalOpen(false);
      onCustomerUpdate();

      // Refresh selected customer if editing
      if (editingCustomer && selectedCustomer?.customer_id === editingCustomer.customer_id) {
        setSelectedCustomer(savedCustomer);

        // Refresh transfer history
        const historyRes = await fetch(`/api/sales-hub/customers/${savedCustomer.customer_id}/history`);
        const historyData = await historyRes.json();
        setTransferHistory(historyData.data || []);
      }
    } catch (error) {
      console.error("Error saving customer:", error);
      onMessage({ type: "error", text: "Failed to save customer" });
    } finally {
      setCustomerSaving(false);
    }
  };

  // Handle CSV file selection
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith(".csv")) {
        setCsvError("Please upload a CSV file");
        setCsvFile(null);
        return;
      }

      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setCsvError("File size must be less than 5MB");
        setCsvFile(null);
        return;
      }

      setCsvFile(selectedFile);
      setCsvError(null);
      setCsvSuccess(false);
    }
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const headers = ["dealer_name", "rep_id", "dealer_billing_address_city", "dealer_billing_address_state", "dealer_billing_address_postal_code", "dealer_billing_address_postal_country", "dealer_email_1"];
    const sampleData = ["ABC Flooring Inc", "1", "Miami", "FL", "33101", "USA", "contact@abcflooring.com"];
    const csv = [headers.join(","), sampleData.join(",")].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers_template_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();

    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Handle CSV upload
  const handleCsvUpload = async () => {
    if (!csvFile) {
      setCsvError("Please select a file to upload");
      return;
    }

    setCsvUploading(true);
    setCsvError(null);
    setCsvSuccess(false);

    try {
      const text = await csvFile.text();
      const lines = text.split("\n").filter((line) => line.trim());
      if (lines.length < 2) {
        throw new Error("CSV file is empty or has no data rows");
      }

      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1);

      let successCount = 0;
      let errorCount = 0;

      for (const row of rows) {
        try {
          const values = row.split(",").map((v) => v.trim());
          const customerData: Partial<Customer> = {};

          headers.forEach((header, index) => {
            const value = values[index];
            if (header === "dealer_name") customerData.dealer_name = value;
            if (header === "rep_id") customerData.rep_id = value ? parseInt(value) : null;
            if (header === "dealer_billing_address_city")
              customerData.dealer_billing_address_city = value || null;
            if (header === "dealer_billing_address_state")
              customerData.dealer_billing_address_state = value || null;
            if (header === "dealer_billing_address_postal_code")
              customerData.dealer_billing_address_postal_code = value || null;
            if (header === "dealer_billing_address_postal_country")
              customerData.dealer_billing_address_postal_country = value || null;
            if (header === "dealer_email_1") customerData.dealer_email_1 = value || null;
          });

          const res = await fetch("/api/sales-hub/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(customerData),
          });

          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      setCsvSuccess(true);
      setCsvFile(null);

      setTimeout(() => {
        onMessage({
          type: successCount > 0 ? "success" : "error",
          text: `Uploaded ${successCount} customers. ${errorCount > 0 ? `${errorCount} failed.` : ""}`,
        });
        onCustomerUpdate();
        setImportModalOpen(false);
        setCsvSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error uploading CSV:", error);
      setCsvError(error instanceof Error ? error.message : "Failed to upload CSV file");
    } finally {
      setCsvUploading(false);
    }
  };

  const handleCloseImportModal = () => {
    setCsvFile(null);
    setCsvError(null);
    setCsvSuccess(false);
    setImportModalOpen(false);
  };

  // Format transfer history timestamp
  const formatTransferDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date) + " EST";
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="font-montserrat text-xl">Customers</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      expanded ? "transform rotate-180" : ""
                    }`}
                  />
                </Button>
              </div>
              <CardDescription>
                Manage customer accounts and assignments
              </CardDescription>
            </div>
            {expanded && (
              <div className="flex gap-2">
                <Button onClick={handleAddCustomer} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Customer
                </Button>
                <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Customers</CardDescription>
                  <CardTitle className="text-3xl">{totalCustomers}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Assigned</CardDescription>
                  <CardTitle className="text-3xl">{assignedCustomers}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Dismissed</CardDescription>
                  <CardTitle className="text-3xl">{dismissedCustomers}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Unassigned</CardDescription>
                  <CardTitle className="text-3xl">{customersWithoutReps}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for a customer..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setSelectedCustomer(null);
                  }}
                  className="pl-9"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {showAutocomplete && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.customer_id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full px-4 py-2 text-left hover:bg-muted transition-colors"
                    >
                      <div className="font-medium">{customer.dealer_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {customer.dealer_billing_address_city && customer.dealer_billing_address_state
                          ? `${customer.dealer_billing_address_city}, ${customer.dealer_billing_address_state}`
                          : "No location"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Customer Details */}
            {selectedCustomer && (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedCustomer.dealer_name}</CardTitle>
                      <CardDescription>Customer ID: {selectedCustomer.customer_id}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleEditCustomer} size="sm" variant="outline">
                        Edit Details
                      </Button>
                      <Button
                        onClick={() => setShowHistory(!showHistory)}
                        size="sm"
                        variant="outline"
                      >
                        <History className="w-4 h-4 mr-2" />
                        {showHistory ? "Hide" : "Show"} History
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Assigned Sales Rep</p>
                      <p className="text-sm">
                        {selectedCustomer.rep_id
                          ? reps.find((r) => r.rep_id === selectedCustomer.rep_id)?.rep_name ||
                            "Unknown"
                          : "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-sm">{selectedCustomer.dealer_email_1 || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">City</p>
                      <p className="text-sm">{selectedCustomer.dealer_billing_address_city || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">State</p>
                      <p className="text-sm">{selectedCustomer.dealer_billing_address_state || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Zip Code</p>
                      <p className="text-sm">
                        {selectedCustomer.dealer_billing_address_postal_code || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Country</p>
                      <p className="text-sm">
                        {selectedCustomer.dealer_billing_address_postal_country || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Transfer History */}
                  {showHistory && (
                    <div className="pt-4 border-t space-y-3">
                      <h4 className="font-semibold text-sm">Transfer History</h4>
                      {transferHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No transfer history available
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {transferHistory.map((transfer) => (
                            <div
                              key={transfer.id}
                              className="flex items-start gap-3 text-sm p-3 bg-muted/50 rounded-md"
                            >
                              <div className="flex-1">
                                <p>
                                  <Badge variant="outline" className="mr-2">
                                    {transfer.from_rep?.rep_name || "Unassigned"}
                                  </Badge>
                                  →
                                  <Badge variant="outline" className="ml-2">
                                    {transfer.to_rep?.rep_name || "Unassigned"}
                                  </Badge>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatTransferDate(transfer.transferred_at)}
                                </p>
                                {transfer.notes && (
                                  <p className="text-xs mt-1 italic">{transfer.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!selectedCustomer && customerSearch === "" && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">
                  Start typing to search for a customer, or add a new customer using the button above.
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Customer Modal */}
      <CustomerModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        customer={editingCustomer}
        reps={reps}
        onSave={handleSaveCustomer}
        saving={customerSaving}
      />

      {/* CSV Import Modal */}
      <Dialog open={importModalOpen} onOpenChange={handleCloseImportModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Customer Data</DialogTitle>
            <DialogDescription>
              Upload a CSV file with your customer data to add multiple customers at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Instructions */}
            <Alert>
              <Download className="h-4 w-4" />
              <AlertTitle>Step 1: Download Template</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>Download a CSV template with the required columns.</p>
                <Button
                  onClick={handleDownloadTemplate}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV Template
                </Button>
              </AlertDescription>
            </Alert>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Step 2: Edit in Excel/Google Sheets</AlertTitle>
              <AlertDescription>
                <p>Open the CSV file in Excel or Google Sheets and add your customer data.</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>Keep the same column headers (dealer_name, rep_id, etc.)</li>
                  <li>dealer_name is required for each row</li>
                  <li>rep_id must match an existing sales rep ID or leave empty</li>
                  <li>All other fields are optional</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Alert>
              <Upload className="h-4 w-4" />
              <AlertTitle>Step 3: Upload Updated File</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:border-input file:bg-background file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-muted"
                  />
                  {csvFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: <span className="font-medium">{csvFile.name}</span> ({(csvFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {/* Error/Success Messages */}
            {csvError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{csvError}</AlertDescription>
              </Alert>
            )}

            {csvSuccess && (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Success!</AlertTitle>
                <AlertDescription>
                  Customers imported successfully. List will refresh automatically.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={handleCloseImportModal}
              variant="outline"
              disabled={csvUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCsvUpload}
              disabled={!csvFile || csvUploading || csvSuccess}
            >
              {csvUploading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
