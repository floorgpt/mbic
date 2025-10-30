"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FormsWebhookMode, FormsWebhookSettings, FormsWebhookUrls } from "@/types/forms";

type WebhookModeToggleProps = {
  initialSettings: FormsWebhookSettings;
};

type ModeOption = {
  mode: FormsWebhookMode;
  label: string;
  description: string;
};

const MODE_OPTIONS: ModeOption[] = [
  { mode: "test", label: "Test", description: "Usa el webhook de pruebas" },
  { mode: "prod", label: "Prod", description: "Usa el webhook productivo" },
];

export function WebhookModeToggle({ initialSettings }: WebhookModeToggleProps) {
  const [mode, setMode] = useState<FormsWebhookMode>(initialSettings.mode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urls] = useState<FormsWebhookUrls>(initialSettings.urls);

  async function persistMode(nextMode: FormsWebhookMode) {
    if (nextMode === mode) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/webhooks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: nextMode,
          urls,
        }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        err?: string | null;
      };

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.err ?? response.statusText);
      }

      setMode(nextMode);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Modo activo
          </span>
          <Badge
            className={cn(
              "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100",
            )}
          >
            {mode.toUpperCase()}
          </Badge>
        </div>
        <div className="inline-flex gap-2 rounded-md border border-border/50 bg-muted/40 p-1">
          {MODE_OPTIONS.map((option) => (
            <Button
              key={option.mode}
              type="button"
              size="sm"
              variant={mode === option.mode ? "default" : "ghost"}
              className={cn(
                "min-w-16",
                mode === option.mode ? "bg-primary text-primary-foreground" : "",
              )}
              disabled={saving}
              onClick={() => persistMode(option.mode)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Webhook Test
          </label>
          <div className="flex items-center gap-2">
            <Input value={urls.test} readOnly className="font-mono" />
            <CopyButton value={urls.test} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Webhook Prod
          </label>
          <div className="flex items-center gap-2">
            <Input value={urls.prod} readOnly className="font-mono" />
            <CopyButton value={urls.prod} />
          </div>
        </div>
      </div>
    </div>
  );
}
