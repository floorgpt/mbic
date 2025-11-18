"use server";

import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { tryServerSafe, type SafeResult } from "@/lib/utils";
import type { LossOpportunityInsert } from "@/types/database";
import type {
  FormsWebhookMode,
  LossOpportunityPayload,
  LossReason,
} from "@/types/forms";

const LOSS_REASONS: LossReason[] = ["no_stock", "price", "competitor", "color_not_exist", "other"];

export type NormalizedLossOpportunity = {
  repId: number;
  dealerId: number;
  categoryKey: string | null;
  collectionKey: string | null;
  colorName: string | null;
  requestedQty: number;
  targetPrice: number;
  potentialAmount: number;
  reason: LossReason;
  notes: string | null;
  expectedSku: string | null;
};

export type ValidationResult =
  | { ok: true; data: NormalizedLossOpportunity }
  | { ok: false; errors: string[] };

function ensureNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function ensureInteger(value: unknown): number | null {
  const numeric = ensureNumber(value);
  if (numeric == null) return null;
  const int = Math.trunc(numeric);
  return int > 0 ? int : null;
}

function ensureString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
}

export async function validateLossOpportunityPayload(
  payload: LossOpportunityPayload,
): Promise<ValidationResult> {
  const errors: string[] = [];

  const repId = ensureInteger(payload?.repId);
  if (!repId) {
    errors.push("repId es requerido");
  }

  const dealerId = ensureInteger(payload?.dealerId);
  if (!dealerId) {
    errors.push("dealerId es requerido");
  }

  const requestedQty = ensureNumber(payload?.requestedQty);
  if (!requestedQty || requestedQty <= 0) {
    errors.push("requestedQty debe ser mayor a 0");
  }

  const targetPrice = ensureNumber(payload?.targetPrice);
  if (!targetPrice || targetPrice <= 0) {
    errors.push("targetPrice debe ser mayor a 0");
  }

  const potentialAmount = ensureNumber(payload?.potentialAmount);
  if (potentialAmount == null || potentialAmount <= 0) {
    errors.push("potentialAmount debe ser mayor a 0");
  }

  const reason = payload?.reason;
  if (!LOSS_REASONS.includes(reason as LossReason)) {
    errors.push("reason inválido");
  }

  if (errors.length > 0 || !repId || !dealerId) {
    return { ok: false, errors };
  }

  if (!requestedQty || !targetPrice || !potentialAmount) {
    return { ok: false, errors };
  }

  const ensuredRepId = repId!;
  const ensuredDealerId = dealerId!;
  const ensuredQty = requestedQty!;
  const ensuredPrice = targetPrice!;
  const ensuredPotential = potentialAmount!;

  const normalized: NormalizedLossOpportunity = {
    repId: ensuredRepId,
    dealerId: ensuredDealerId,
    categoryKey: ensureString(payload?.categoryKey),
    collectionKey: ensureString(payload?.collectionKey),
    colorName: ensureString(payload?.colorName),
    requestedQty: ensuredQty,
    targetPrice: ensuredPrice,
    potentialAmount: ensuredPotential,
    reason: reason as LossReason,
    notes: ensureString(payload?.notes) ?? null,
    expectedSku: ensureString(payload?.expectedSku),
  };

  return { ok: true, data: normalized };
}

export async function insertLossOpportunity(
  payload: NormalizedLossOpportunity,
): Promise<SafeResult<{ id: number | null }>> {
  const supabase = getSupabaseAdminClient();

  const safe = await tryServerSafe(
    (async () => {
      const row: LossOpportunityInsert = {
        dealer_id: payload.dealerId,
        rep_id: payload.repId,
        lost_date: new Date().toISOString(),
        requested_qty: payload.requestedQty,
        target_price: payload.targetPrice,
        potential_amount: payload.potentialAmount,
        due_to_stock: payload.reason === "no_stock",
        lost_reason: payload.reason,
        notes: payload.notes ?? null,
        category_key: payload.categoryKey ?? null,
        collection: payload.collectionKey ?? null,
        color: payload.colorName ?? null,
        expected_sku: payload.expectedSku ?? null,
        attachment_url: (payload as { attachmentUrl?: string | null }).attachmentUrl ?? null,
      };

      const { data, error } = await supabase
        .from("loss_opportunities")
        .insert(row as never)
        .select("id")
        .maybeSingle<{ id: number }>();

      if (error) {
        throw new Error(`loss_opportunities insert failed: ${error.message}`);
      }

      const insertedId = (data?.id ?? null) as number | null;
      return { id: insertedId };
    })(),
    "forms:insertLossOpportunity",
    { id: null },
  );

  console.log("[forms] loss-opportunity:insert", {
    repId: payload.repId,
    dealerId: payload.dealerId,
    ...safe._meta,
  });

  return safe;
}

export type WebhookTriggerResult = {
  ok: boolean;
  status?: number;
  err?: string | null;
};

export async function triggerLossOpportunityWebhook(
  url: string,
  mode: FormsWebhookMode,
  payload: NormalizedLossOpportunity,
  insertedId: number | null,
): Promise<WebhookTriggerResult> {
  try {
    const webhookUrl = new URL(url);
    webhookUrl.searchParams.set("type", "loss_opp");
    webhookUrl.searchParams.set("mode", mode);
    if (insertedId) {
      webhookUrl.searchParams.set("id", String(insertedId));
    }
    webhookUrl.searchParams.set("repId", String(payload.repId));
    webhookUrl.searchParams.set("dealerId", String(payload.dealerId));
    if (payload.collectionKey) {
      webhookUrl.searchParams.set("collection", payload.collectionKey);
    }
    if (payload.colorName) {
      webhookUrl.searchParams.set("color", payload.colorName);
    }
    webhookUrl.searchParams.set("amount", String(payload.potentialAmount));

    const response = await fetch(webhookUrl.toString(), {
      method: "GET",
      headers: {
        "X-MBIC-Forms-Mode": mode,
      },
    });

    console.log("[forms] webhook:loss-opportunity", {
      url: webhookUrl.toString(),
      status: response.status,
      ok: response.ok,
      mode,
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        status: response.status,
        err: text || `Webhook responded with status ${response.status}`,
      };
    }

    return { ok: true, status: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[forms] webhook:error", message);
    return { ok: false, status: undefined, err: message };
  }
}
