"use client";

import { useState, type FormEventHandler } from "react";

import { Field, FieldGroup } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pingWebhook, updateWebhookSettings } from "@/lib/forms/settings-client";
import { cn } from "@/lib/utils";
import type { FormsWebhookMode, FormsWebhookSettings } from "@/types/forms";

type WebhookSettingsFormProps = {
  initialSettings: FormsWebhookSettings;
};

type StatusMessage = {
  type: "success" | "error";
  text: string;
};

type UrlErrors = {
  test?: string;
  prod?: string;
};

const MODE_OPTIONS: Array<{
  value: FormsWebhookMode;
  label: string;
  description: string;
}> = [
  {
    value: "test",
    label: "Modo Test",
    description: "Envia las notificaciones al workflow de pruebas en n8n.",
  },
  {
    value: "prod",
    label: "Modo Prod",
    description: "Activa el webhook productivo para notificar casos reales.",
  },
];

function validateUrl(value: string | undefined): string | null {
  if (!value) return "URL requerida";
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return "URL debe ser http(s)";
    }
    return null;
  } catch {
    return "URL inválida";
  }
}

export function WebhookSettingsForm({ initialSettings }: WebhookSettingsFormProps) {
  const [mode, setMode] = useState<FormsWebhookMode>(initialSettings.mode);
  const [urls, setUrls] = useState(() => ({
    test: initialSettings.urls.test,
    prod: initialSettings.urls.prod,
  }));
  const [urlErrors, setUrlErrors] = useState<UrlErrors>({});
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [saving, setSaving] = useState(false);
  const [pinging, setPinging] = useState<FormsWebhookMode | null>(null);

  const handleUrlChange = (key: "test" | "prod", value: string) => {
    setUrls((prev) => ({ ...prev, [key]: value }));
    setUrlErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setStatus(null);

    const nextErrors: UrlErrors = {};
    const testError = validateUrl(urls.test);
    const prodError = validateUrl(urls.prod);

    if (testError) {
      nextErrors.test = testError;
    }
    if (prodError) {
      nextErrors.prod = prodError;
    }

    if (Object.keys(nextErrors).length > 0) {
      setUrlErrors(nextErrors);
      setStatus({
        type: "error",
        text: "Revisa las URLs antes de guardar.",
      });
      return;
    }

    setSaving(true);
    try {
      const payload: FormsWebhookSettings = {
        mode,
        urls: {
          test: urls.test,
          prod: urls.prod,
        },
      };

      const response = await updateWebhookSettings(payload);
      if (response.ok) {
        setStatus({
          type: "success",
          text: "Settings guardados correctamente.",
        });
      } else {
        setStatus({
          type: "error",
          text: response.err ?? "No pudimos guardar los settings.",
        });
      }
    } catch (error) {
      console.error("[forms] settings:save:error", error);
      setStatus({
        type: "error",
        text: "No pudimos guardar los settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePing = async (targetMode: FormsWebhookMode) => {
    setStatus(null);
    setPinging(targetMode);
    try {
      const result = await pingWebhook(targetMode);
      if (result.ok) {
        const statusCode = (result.meta as { webhook?: { status?: number } } | undefined)?.webhook
          ?.status;
        setStatus({
          type: "success",
          text: `Webhook ${targetMode.toUpperCase()} respondió OK${
            statusCode ? ` (HTTP ${statusCode})` : ""
          }.`,
        });
      } else {
        setStatus({
          type: "error",
          text:
            result.err ??
            `Webhook ${targetMode.toUpperCase()} no respondió. Intenta nuevamente.`,
        });
      }
    } catch (error) {
      console.error("[forms] settings:ping:error", error);
      setStatus({
        type: "error",
        text: `Webhook ${targetMode.toUpperCase()} no respondió. Intenta nuevamente.`,
      });
    } finally {
      setPinging(null);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {status ? (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            status.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100"
              : "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/20",
          )}
        >
          {status.text}
        </div>
      ) : null}

      <div className="grid gap-3">
        <span className="text-sm font-medium text-foreground">Modo activo</span>
        <div className="grid gap-2 md:grid-cols-2">
          {MODE_OPTIONS.map((option) => {
            const checked = mode === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  "border-input hover:border-ring focus-within:border-ring focus-within:ring-ring/40 flex cursor-pointer flex-col gap-1 rounded-md border px-4 py-3 transition-[color,box-shadow] focus-within:ring-[3px]",
                  checked ? "border-ring ring-ring/30 ring-[3px]" : "",
                )}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="forms-webhook-mode"
                    value={option.value}
                    checked={checked}
                    onChange={() => setMode(option.value)}
                    className="accent-primary size-4"
                  />
                  <span className="font-medium">{option.label}</span>
                  {checked ? <Badge variant="outline">Activo</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </label>
            );
          })}
        </div>
      </div>

      <FieldGroup>
        <Field
          controlId="forms-webhook-test-url"
          label="Webhook Test URL"
          required
          error={urlErrors.test ?? null}
        >
          <Input
            id="forms-webhook-test-url"
            value={urls.test}
            onChange={(event) => handleUrlChange("test", event.target.value)}
            placeholder="https://n8n.../webhook-test/mbic-sales-ops-forms"
          />
        </Field>

        <Field
          controlId="forms-webhook-prod-url"
          label="Webhook Prod URL"
          required
          error={urlErrors.prod ?? null}
        >
          <Input
            id="forms-webhook-prod-url"
            value={urls.prod}
            onChange={(event) => handleUrlChange("prod", event.target.value)}
            placeholder="https://n8n.../webhook/mbic-sales-ops-forms"
          />
        </Field>
      </FieldGroup>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pinging === "test"}
            onClick={() => handlePing("test")}
          >
            {pinging === "test" ? "Probando..." : "Probar webhook (Test)"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pinging === "prod"}
            onClick={() => handlePing("prod")}
          >
            {pinging === "prod" ? "Probando..." : "Probar webhook (Prod)"}
          </Button>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Guardar settings"}
        </Button>
      </div>
    </form>
  );
}
