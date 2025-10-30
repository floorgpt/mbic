"use client";

import type { FormsWebhookMode, FormsWebhookSettings } from "@/types/forms";

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  err?: string | null;
  meta?: unknown;
  errors?: string[];
};

export async function updateWebhookSettings(
  settings: FormsWebhookSettings,
): Promise<ApiResponse<FormsWebhookSettings>> {
  const response = await fetch("/api/settings/webhooks", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });

  const json = (await response.json()) as ApiResponse<FormsWebhookSettings>;

  if (!response.ok) {
    return {
      ok: false,
      err: json?.err ?? response.statusText,
      data: json?.data,
      meta: json?.meta,
      errors: json?.errors,
    };
  }

  return json;
}

export async function pingWebhook(
  mode: FormsWebhookMode,
): Promise<ApiResponse<{ mode: FormsWebhookMode; url: string }>> {
  const response = await fetch("/api/forms/webhook-test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode }),
  });

  const json = (await response.json()) as ApiResponse<{
    mode: FormsWebhookMode;
    url: string;
  }>;

  if (!response.ok) {
    return {
      ok: false,
      err: json?.err ?? response.statusText,
      data: json?.data,
      meta: json?.meta,
    };
  }

  return json;
}
