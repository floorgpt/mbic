"use server";

import "server-only";

import {
  getDealersByRep,
  getCategories,
  getCollectionsByCategory,
  getColorsByCollection,
  getSalesReps,
} from "@/lib/forms/catalog";
import { insertLossOpportunity, type NormalizedLossOpportunity } from "@/lib/forms/loss-opportunity";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SafeResult } from "@/lib/utils";

export type FormsDiagCheck = {
  label: string;
  ok: boolean;
  status: number;
  count: number;
  err: string | null;
  sample: unknown;
};

export type FormsDiagResult = {
  ok: boolean;
  dryRun: boolean;
  checks: FormsDiagCheck[];
};

function extractSample(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.slice(0, 1);
  }
  if (data && typeof data === "object") {
    return data;
  }
  return data ?? null;
}

function fromSafeResult<T>(label: string, safe: SafeResult<T>): FormsDiagCheck {
  return {
    label,
    ok: safe._meta.ok,
    status: safe._meta.ok ? 200 : 502,
    count: safe._meta.count,
    err: safe._meta.err ?? null,
    sample: extractSample(safe.data),
  };
}

export async function runFormsDiagnostics(options?: { dryRun?: boolean }): Promise<FormsDiagResult> {
  const dryRun = options?.dryRun !== false;

  const checks: FormsDiagCheck[] = [];

  const reps = await getSalesReps();
  checks.push(fromSafeResult("sales-reps", reps));
  const repId = reps.data[0]?.id ?? null;

  let dealerId: number | null = null;
  if (repId) {
    const dealers = await getDealersByRep(repId);
    checks.push(fromSafeResult("dealers-by-rep", dealers));
    dealerId = dealers.data[0]?.id ?? null;
  } else {
    checks.push({
      label: "dealers-by-rep",
      ok: false,
      status: 424,
      count: 0,
      err: "No hay reps disponibles para validar dealers",
      sample: null,
    });
  }

  const categories = await getCategories();
  checks.push(fromSafeResult("categories", categories));
  const categoryKey = categories.data[0]?.key ?? null;

  let collectionKey: string | null = null;
  if (categoryKey) {
    const collections = await getCollectionsByCategory(categoryKey);
    checks.push(fromSafeResult(`collections-${categoryKey}`, collections));
    collectionKey = collections.data[0]?.key ?? null;
  } else {
    checks.push({
      label: "collections",
      ok: false,
      status: 424,
      count: 0,
      err: "No hay categorías para validar colecciones",
      sample: null,
    });
  }

  let colorName: string | null = null;
  if (collectionKey) {
    const colors = await getColorsByCollection(collectionKey);
    checks.push(fromSafeResult(`colors-${collectionKey}`, colors));
    colorName = colors.data[0]?.name ?? null;
  } else {
    checks.push({
      label: "colors",
      ok: false,
      status: 424,
      count: 0,
      err: "No hay colecciones para validar colores",
      sample: null,
    });
  }

  const canInsert =
    repId != null && dealerId != null && categoryKey && collectionKey && colorName;

  if (!canInsert) {
    checks.push({
      label: "loss-opportunity-insert",
      ok: false,
      status: 424,
      count: 0,
      err: "Faltan catálogos para validar la inserción",
      sample: null,
    });
  } else if (dryRun) {
    checks.push({
      label: "loss-opportunity-insert",
      ok: true,
      status: 200,
      count: 0,
      err: null,
      sample: null,
    });
  } else {
    const ensuredRepId = repId as number;
    const ensuredDealerId = dealerId as number;
    const ensuredCategoryKey = categoryKey as string;
    const ensuredCollectionKey = collectionKey as string;
    const ensuredColorName = colorName as string;

    const payload: NormalizedLossOpportunity = {
      repId: ensuredRepId,
      dealerId: ensuredDealerId,
      categoryKey: ensuredCategoryKey,
      collectionKey: ensuredCollectionKey,
      colorName: ensuredColorName,
      requestedQty: 1,
      targetPrice: 1,
      potentialAmount: 1,
      reason: "other",
      notes: "[forms] diag insert",
      expectedSku: `${ensuredCollectionKey}:${ensuredColorName}`,
    };

    const insertResult = await insertLossOpportunity(payload);

    if (insertResult._meta.ok && insertResult.data.id) {
      const supabase = getSupabaseAdminClient();
      await supabase
        .from("loss_opportunities")
        .delete()
        .eq("id", insertResult.data.id);
    }

    checks.push({
      label: "loss-opportunity-insert",
      ok: insertResult._meta.ok,
      status: insertResult._meta.ok ? 200 : 502,
      count: insertResult._meta.count,
      err: insertResult._meta.err ?? null,
      sample: insertResult.data,
    });
  }

  const ok = checks.every((check) => check.ok);
  return {
    ok,
    dryRun,
    checks,
  };
}
