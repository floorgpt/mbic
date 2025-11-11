"use client";

import { useState } from "react";
import { MoreVertical, Download, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogisticsImportModal } from "./logistics-import-modal";

type LogisticsDownloadMenuProps = {
  onDataRefresh?: () => void;
};

export function LogisticsDownloadMenu({ onDataRefresh }: LogisticsDownloadMenuProps) {
  const [downloading, setDownloading] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const handleDownloadCSV = async () => {
    try {
      setDownloading(true);
      const response = await fetch("/api/ops/logistics/export?format=csv");

      if (!response.ok) {
        throw new Error("Failed to download CSV");
      }

      // Create a blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = `logistics_kpis_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("[ops] download-csv:error", error);
      alert("Failed to download CSV file");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadJSON = async () => {
    try {
      setDownloading(true);
      const response = await fetch("/api/ops/logistics/export?format=json");

      if (!response.ok) {
        throw new Error("Failed to download JSON");
      }

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.err ?? "Failed to export data");
      }

      // Create JSON blob and download
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `logistics_kpis_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("[ops] download-json:error", error);
      alert("Failed to download JSON file");
    } finally {
      setDownloading(false);
    }
  };

  const handleImportSuccess = () => {
    if (onDataRefresh) {
      onDataRefresh();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={downloading}
            title="Data options"
          >
            {downloading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuLabel>Logistics Data</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setImportModalOpen(true)} disabled={downloading}>
            <Upload className="mr-2 h-4 w-4" />
            <span>Import Data</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Export
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={handleDownloadCSV} disabled={downloading}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Download CSV</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadJSON} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" />
            <span>Download JSON</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LogisticsImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportSuccess={handleImportSuccess}
      />
    </>
  );
}
