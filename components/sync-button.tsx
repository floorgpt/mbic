"use client";

import * as React from "react";
import { Loader2, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

const LAST_SYNC_STORAGE_KEY = "mbic:lastSyncAt";

function formatTimestamp(isoString: string) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SyncButton() {
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [statusTone, setStatusTone] = React.useState<"idle" | "success" | "error">("idle");
  const [lastSync, setLastSync] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(LAST_SYNC_STORAGE_KEY);
    if (stored) {
      setLastSync(stored);
    }
  }, []);

  const handleSync = React.useCallback(async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    setStatusTone("idle");

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Sync failed (${response.status})`);
      }

      const payload = (await response.json()) as { syncedAt?: string } | undefined;
      const syncedAt = payload?.syncedAt ?? new Date().toISOString();

      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAST_SYNC_STORAGE_KEY, syncedAt);
      }

      setLastSync(syncedAt);
      setStatusTone("success");
      setStatusMessage(`✅ Synced successfully (${formatTimestamp(syncedAt)})`);
    } catch (error) {
      console.error("Manual marketing sync failed", error);
      setStatusTone("error");
      setStatusMessage("⚠️ Sync failed. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const tooltipText = lastSync ? `Last updated: ${formatTimestamp(lastSync)}` : "No manual sync yet";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleSync}
          disabled={isSyncing}
          className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
          aria-label="Sync CPF Launchpad marketing data"
          title={tooltipText}
        >
          {isSyncing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCcw className="size-4" />
          )}
        </Button>
        {statusMessage ? (
          <span
            className={`text-xs ${
              statusTone === "success"
                ? "text-emerald-600"
                : statusTone === "error"
                  ? "text-rose-600"
                  : "text-muted-foreground"
            }`}
          >
            {statusMessage}
          </span>
        ) : null}
      </div>
      <span className="text-[11px] text-muted-foreground">
        Next auto-sync: 11:59 PM EST (03:59 UTC)
      </span>
    </div>
  );
}
