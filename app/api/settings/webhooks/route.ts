import { NextResponse } from "next/server";

import { getFormsWebhookSettings, saveFormsWebhookSettings } from "@/lib/forms/settings";
import type { FormsWebhookMode, FormsWebhookSettings, FormsWebhookUrls } from "@/types/forms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SettingsPayload = {
  mode?: FormsWebhookMode;
  urls?: Partial<FormsWebhookUrls>;
};

function validateSettingsPayload(payload: SettingsPayload): {
  ok: boolean;
  settings?: FormsWebhookSettings;
  errors?: string[];
} {
  const errors: string[] = [];
  const modeInput = payload.mode;
  const urlsInput = payload.urls ?? {};

  const normalizedMode: FormsWebhookMode =
    modeInput === "prod" ? "prod" : modeInput === "test" ? "test" : "test";

  const testUrl =
    typeof urlsInput.test === "string" && urlsInput.test.trim() ? urlsInput.test.trim() : null;
  const prodUrl =
    typeof urlsInput.prod === "string" && urlsInput.prod.trim() ? urlsInput.prod.trim() : null;

  if (!testUrl) {
    errors.push("URL de Test es requerida");
  }
  if (!prodUrl) {
    errors.push("URL de Prod es requerida");
  }

  if (errors.length > 0 || !testUrl || !prodUrl) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    settings: {
      mode: normalizedMode,
      urls: {
        test: testUrl,
        prod: prodUrl,
      },
    },
  };
}

export async function GET() {
  try {
    const settings = await getFormsWebhookSettings();
    return NextResponse.json({
      ok: true,
      data: settings,
    });
  } catch (error) {
    const message = (error as Error)?.message ?? "Failed to load webhook settings";
    return NextResponse.json(
      {
        ok: false,
        err: message,
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  let payload: SettingsPayload = {};

  try {
    payload = (await request.json()) as SettingsPayload;
  } catch (error) {
    console.error("[forms] settings:update:invalid-json", error);
    return NextResponse.json(
      {
        ok: false,
        err: "Invalid JSON payload",
      },
      { status: 400 },
    );
  }

  const validation = validateSettingsPayload(payload);
  if (!validation.ok || !validation.settings) {
    return NextResponse.json(
      {
        ok: false,
        err: "Payload inválido",
        errors: validation.errors ?? [],
      },
      { status: 400 },
    );
  }

  const result = await saveFormsWebhookSettings(validation.settings);
  const status = result._meta.ok ? 200 : 500;

  return NextResponse.json(
    {
      ok: result._meta.ok,
      data: result.data,
      meta: result._meta,
      err: result._meta.err ?? null,
    },
    { status },
  );
}
