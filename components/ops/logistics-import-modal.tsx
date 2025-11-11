"use client";

import { useState } from "react";
import { Upload, Download, AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type LogisticsImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
};

export function LogisticsImportModal({
  open,
  onOpenChange,
  onImportSuccess,
}: LogisticsImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.csv')) {
        setError("Please upload a CSV file");
        setFile(null);
        return;
      }

      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError(null);
      setSuccess(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/ops/logistics/export?format=csv");

      if (!response.ok) {
        throw new Error("Failed to download template");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `logistics_template_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError("Failed to download template");
      console.error("[ops] download-template:error", err);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      // Read file content
      const text = await file.text();

      // Send to API for validation and import
      const response = await fetch("/api/ops/logistics/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ csvData: text }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.err || "Failed to import data");
      }

      setSuccess(true);
      setError(null);
      setFile(null);

      // Notify parent component
      setTimeout(() => {
        onImportSuccess();
        onOpenChange(false);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error("[ops] import:error", err);
    } finally {
      setUploading(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!confirm("Are you sure you want to reset to dummy data? This will overwrite all current logistics data.")) {
      return;
    }

    setResetting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/ops/logistics/reset", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.err || "Failed to reset data");
      }

      setSuccess(true);
      setError(null);

      // Notify parent component
      setTimeout(() => {
        onImportSuccess();
        onOpenChange(false);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error("[ops] reset:error", err);
    } finally {
      setResetting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Logistics Data</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your logistics data to replace the current dashboard data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Instructions */}
          <Alert>
            <Download className="h-4 w-4" />
            <AlertTitle>Step 1: Download Template</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Download the current data as a CSV template.</p>
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
              <p>Open the CSV file in Excel or Google Sheets and update the data.</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                <li>Keep the same column headers (Month, Year, Sales, etc.)</li>
                <li>Ensure all numeric values are valid numbers</li>
                <li>Each row must have unique Month + Year combination</li>
                <li>Month must be 1-12, Year must be a valid year</li>
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
                  onChange={handleFileChange}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:border-input file:bg-background file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-muted"
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>
                Data imported successfully. Dashboard will refresh automatically.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            onClick={handleResetToDefaults}
            variant="outline"
            disabled={uploading || resetting}
            className="text-destructive hover:bg-destructive/10"
          >
            {resetting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Resetting...
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset to Dummy Data
              </>
            )}
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={handleClose}
              variant="outline"
              disabled={uploading || resetting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading || resetting || success}
            >
              {uploading ? (
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
