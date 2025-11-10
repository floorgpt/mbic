"use server";

import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { tryServerSafe, type SafeResult } from "@/lib/utils";
import type { FutureSaleOpportunityInsert } from "@/types/database";
import type {
  FormsWebhookMode,
  FutureSalePayload,
} from "@/types/forms";

export type NormalizedFutureSale = {
  projectName: string;
  repId: number;
  dealerId: number;
  categoryKey: string | null;
  collectionKey: string | null;
  colorName: string | null;
  expectedQty: number;
  expectedUnitPrice: number;
  potentialAmount: number;
  probabilityPct: number;
  expectedCloseDate: string | null;
  neededByDate: string | null;
  notes: string | null;
  expectedSku: string | null;
};

export type ValidationResult =
  | { ok: true; data: NormalizedFutureSale }
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

function ensureISODate(value: unknown): string | null {
  const str = ensureString(value);
  if (!str) return null;
  // Basic ISO date validation (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  return null;
}

export async function validateFutureSalePayload(
  payload: FutureSalePayload,
): Promise<ValidationResult> {
  const errors: string[] = [];

  const projectName = ensureString(payload?.projectName);
  if (!projectName) {
    errors.push("projectName es requerido");
  }

  const repId = ensureInteger(payload?.repId);
  if (!repId) {
    errors.push("repId es requerido");
  }

  const dealerId = ensureInteger(payload?.dealerId);
  if (!dealerId) {
    errors.push("dealerId es requerido");
  }

  const expectedQty = ensureNumber(payload?.expectedQty);
  if (!expectedQty || expectedQty <= 0) {
    errors.push("expectedQty debe ser mayor a 0");
  }

  const expectedUnitPrice = ensureNumber(payload?.expectedUnitPrice);
  if (!expectedUnitPrice || expectedUnitPrice <= 0) {
    errors.push("expectedUnitPrice debe ser mayor a 0");
  }

  const potentialAmount = ensureNumber(payload?.potentialAmount);
  if (potentialAmount == null || potentialAmount <= 0) {
    errors.push("potentialAmount debe ser mayor a 0");
  }

  const probabilityPct = ensureNumber(payload?.probabilityPct);
  if (probabilityPct == null || probabilityPct < 0 || probabilityPct > 100) {
    errors.push("probabilityPct debe estar entre 0 y 100");
  }

  if (errors.length > 0 || !projectName || !repId || !dealerId) {
    return { ok: false, errors };
  }

  if (!expectedQty || !expectedUnitPrice || !potentialAmount || probabilityPct == null) {
    return { ok: false, errors };
  }

  const ensuredProjectName = projectName!;
  const ensuredRepId = repId!;
  const ensuredDealerId = dealerId!;
  const ensuredQty = expectedQty!;
  const ensuredPrice = expectedUnitPrice!;
  const ensuredPotential = potentialAmount!;
  const ensuredProbability = probabilityPct!;

  const normalized: NormalizedFutureSale = {
    projectName: ensuredProjectName,
    repId: ensuredRepId,
    dealerId: ensuredDealerId,
    categoryKey: ensureString(payload?.categoryKey),
    collectionKey: ensureString(payload?.collectionKey),
    colorName: ensureString(payload?.colorName),
    expectedQty: ensuredQty,
    expectedUnitPrice: ensuredPrice,
    potentialAmount: ensuredPotential,
    probabilityPct: ensuredProbability,
    expectedCloseDate: ensureISODate(payload?.expectedCloseDate),
    neededByDate: ensureISODate(payload?.neededByDate),
    notes: ensureString(payload?.notes) ?? null,
    expectedSku: ensureString(payload?.expectedSku),
  };

  return { ok: true, data: normalized };
}

export async function insertFutureSale(
  payload: NormalizedFutureSale,
): Promise<SafeResult<{ id: number | null }>> {
  const supabase = getSupabaseAdminClient();

  const safe = await tryServerSafe(
    (async () => {
      const row: FutureSaleOpportunityInsert = {
        project_name: payload.projectName,
        dealer_id: payload.dealerId,
        rep_id: payload.repId,
        expected_qty: payload.expectedQty,
        expected_unit_price: payload.expectedUnitPrice,
        probability_pct: payload.probabilityPct,
        expected_close_date: payload.expectedCloseDate ?? null,
        needed_by_date: payload.neededByDate ?? null,
        expected_sku: payload.expectedSku ?? null,
        notes: payload.notes ?? null,
        status: "open",
        ops_stock_confirmed: false,
      };

      const { data, error } = await supabase
        .from("future_sale_opportunities")
        .insert(row as never)
        .select("id")
        .maybeSingle<{ id: number }>();

      if (error) {
        throw new Error(`future_sale_opportunities insert failed: ${error.message}`);
      }

      const insertedId = (data?.id ?? null) as number | null;
      return { id: insertedId };
    })(),
    "forms:insertFutureSale",
    { id: null },
  );

  console.log("[forms] future-sale:insert", {
    projectName: payload.projectName,
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

export async function triggerFutureSaleWebhook(
  url: string,
  mode: FormsWebhookMode,
  payload: NormalizedFutureSale,
  insertedId: number | null,
): Promise<WebhookTriggerResult> {
  try {
    const webhookUrl = new URL(url);
    webhookUrl.searchParams.set("type", "future_sale");
    webhookUrl.searchParams.set("mode", mode);
    if (insertedId) {
      webhookUrl.searchParams.set("id", String(insertedId));
    }
    webhookUrl.searchParams.set("projectName", payload.projectName);
    webhookUrl.searchParams.set("repId", String(payload.repId));
    webhookUrl.searchParams.set("dealerId", String(payload.dealerId));
    if (payload.collectionKey) {
      webhookUrl.searchParams.set("collection", payload.collectionKey);
    }
    if (payload.colorName) {
      webhookUrl.searchParams.set("color", payload.colorName);
    }
    webhookUrl.searchParams.set("amount", String(payload.potentialAmount));
    webhookUrl.searchParams.set("probability", String(payload.probabilityPct));

    const response = await fetch(webhookUrl.toString(), {
      method: "GET",
      headers: {
        "X-MBIC-Forms-Mode": mode,
      },
    });

    console.log("[forms] webhook:future-sale", {
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
