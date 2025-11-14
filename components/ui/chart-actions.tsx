"use client";

import { useState } from "react";
import { Copy, Download, Check } from "lucide-react";
import { toPng, toJpeg } from "html-to-image";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ChartActionsProps = {
  elementId: string;
  fileName?: string;
  className?: string;
};

export function ChartActions({ elementId, fileName = "chart", className }: ChartActionsProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleCopyToClipboard = async () => {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`[ChartActions] Element with id "${elementId}" not found`);
      return;
    }

    try {
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("[ChartActions] Failed to copy to clipboard:", error);
    }
  };

  const handleDownloadJpg = async () => {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`[ChartActions] Element with id "${elementId}" not found`);
      return;
    }

    setDownloading(true);
    try {
      const dataUrl = await toJpeg(element, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      // Create download link
      const link = document.createElement("a");
      link.download = `${fileName}-${new Date().getTime()}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("[ChartActions] Failed to download image:", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", className)}
        >
          <Download className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopyToClipboard} disabled={copied}>
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-green-600" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy to clipboard</span>
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadJpg} disabled={downloading}>
          <Download className="mr-2 h-4 w-4" />
          <span>{downloading ? "Downloading..." : "Download as JPG"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
