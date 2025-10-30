import { NextResponse } from "next/server";

import {
  insertLossOpportunity,
  triggerLossOpportunityWebhook,
  validateLossOpportunityPayload,
} from "@/lib/forms/loss-opportunity";
import { getFormsWebhookSettings, resolveWebhookUrl } from "@/lib/forms/settings";
import type { LossOpportunityPayload } from "@/types/forms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: LossOpportunityPayload | null = null;

  try {
    payload = (await request.json()) as LossOpportunityPayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON payload";
    return NextResponse.json(
      {
        ok: false,
        err: message,
      },
      { status: 400 },
    );
  }

  const validation = validateLossOpportunityPayload(payload);
  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        err: "Payload inválido",
        errors: validation.errors,
      },
      { status: 400 },
    );
  }

  const normalized = validation.data;
  const insertResult = await insertLossOpportunity(normalized);

  if (!insertResult._meta.ok) {
    return NextResponse.json(
      {
        ok: false,
        err: insertResult._meta.err ?? "No pudimos registrar la pérdida",
        meta: {
          insert: insertResult._meta,
        },
      },
      { status: 500 },
    );
  }

  const settings = await getFormsWebhookSettings();
  const { mode, url } = resolveWebhookUrl(settings);

  const webhookResult = await triggerLossOpportunityWebhook(
    url,
    mode,
    normalized,
    insertResult.data.id,
  );

  const ok = webhookResult.ok;
  const status = ok ? 200 : 502;

  return NextResponse.json(
    {
      ok,
      data: {
        id: insertResult.data.id,
        mode,
      },
      meta: {
        insert: insertResult._meta,
        webhook: {
          ok: webhookResult.ok,
          status: webhookResult.status ?? null,
          err: webhookResult.err ?? null,
          url,
          mode,
        },
      },
      err: ok ? null : webhookResult.err ?? "El webhook no respondió",
    },
    { status },
  );
}
