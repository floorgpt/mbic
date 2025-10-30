import { NextResponse } from "next/server";

import {
  triggerLossOpportunityWebhook,
  type NormalizedLossOpportunity,
} from "@/lib/forms/loss-opportunity";
import { getFormsWebhookSettings, resolveWebhookUrl } from "@/lib/forms/settings";
import type { FormsWebhookMode } from "@/types/forms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PingPayload = {
  mode?: FormsWebhookMode;
};

const SAMPLE_PAYLOAD: NormalizedLossOpportunity = {
  repId: 999_999,
  dealerId: 999_999,
  categoryKey: null,
  collectionKey: "webhook-ping",
  colorName: "webhook-ping",
  requestedQty: 1,
  targetPrice: 1,
  potentialAmount: 1,
  reason: "other",
  notes: "[forms] webhook ping",
  expectedSku: null,
};

function normalizeMode(value: unknown): FormsWebhookMode | null {
  if (value === "prod") return "prod";
  if (value === "test") return "test";
  return null;
}

export async function POST(request: Request) {
  let body: PingPayload = {};

  try {
    body = (await request.json()) as PingPayload;
  } catch {
    body = {};
  }

  const overrideMode = normalizeMode(body.mode);

  const settings = await getFormsWebhookSettings();
  const targetSettings = overrideMode ? { ...settings, mode: overrideMode } : settings;
  const { mode, url } = await resolveWebhookUrl(targetSettings);

  const result = await triggerLossOpportunityWebhook(url, mode, SAMPLE_PAYLOAD, null);
  const status = result.ok ? 200 : 502;

  return NextResponse.json(
    {
      ok: result.ok,
      data: {
        mode,
        url,
      },
      meta: {
        webhook: result,
      },
      err: result.err ?? null,
    },
    { status },
  );
}
