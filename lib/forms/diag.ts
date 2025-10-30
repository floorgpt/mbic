"use server";

import "server-only";

import { getDealersByRep, getCategories, getCollectionsByCategory, getColorsByCollection, getSalesReps } from "@/lib/forms/catalog";
import { insertLossOpportunity, type NormalizedLossOpportunity } from "@/lib/forms/loss-opportunity";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PanelMeta, SafeResult } from "@/lib/utils";

export type FormsDiagCheck = {
  label: string;
  ok: boolean;
  count: number;
  err?: string | null;
  meta?: PanelMeta;
};

export type FormsDiagResult = {
  ok: boolean;
  dryRun: boolean;
  checks: FormsDiagCheck[];
};

function toCheck(label: string, result: SafeResult<unknown>): FormsDiagCheck {
  return {
    label,
    ok: result._meta.ok,
    count: result._meta.count,
    err: result._meta.err ?? null,
    meta: result._meta,
  };
}

export async function runFormsDiagnostics(options?: { dryRun?: boolean }): Promise<FormsDiagResult> {
  const dryRun = options?.dryRun !== false;

  const checks: FormsDiagCheck[] = [];

  const reps = await getSalesReps();
  checks.push(toCheck("sales-reps", reps));
  const repId = reps.data[0]?.id ?? null;

  let dealerId: number | null = null;
  if (repId) {
    const dealers = await getDealersByRep(repId);
    checks.push({
      ...toCheck("dealers-by-rep", dealers),
      meta: dealers._meta,
    });
    dealerId = dealers.data[0]?.id ?? null;
  } else {
    checks.push({
      label: "dealers-by-rep",
      ok: false,
      count: 0,
      err: "No hay reps disponibles para validar dealers",
    });
  }

  const categories = await getCategories();
  checks.push(toCheck("categories", categories));
  const categoryKey = categories.data[0]?.key ?? null;

  let collectionKey: string | null = null;
  if (categoryKey) {
    const collections = await getCollectionsByCategory(categoryKey);
    checks.push(toCheck(`collections-${categoryKey}`, collections));
    collectionKey = collections.data[0]?.key ?? null;
  } else {
    checks.push({
      label: "collections",
      ok: false,
      count: 0,
      err: "No hay categorías para validar colecciones",
    });
  }

  let colorName: string | null = null;
  if (collectionKey) {
    const colors = await getColorsByCollection(collectionKey);
    checks.push(toCheck(`colors-${collectionKey}`, colors));
    colorName = colors.data[0]?.name ?? null;
  } else {
    checks.push({
      label: "colors",
      ok: false,
      count: 0,
      err: "No hay colecciones para validar colores",
    });
  }

  const canInsert =
    repId != null && dealerId != null && categoryKey && collectionKey && colorName;

  if (!canInsert) {
    checks.push({
      label: "loss-opportunity-insert",
      ok: false,
      count: 0,
      err: "Faltan catálogos para validar la inserción",
    });
  } else if (dryRun) {
    checks.push({
      label: "loss-opportunity-insert",
      ok: true,
      count: 0,
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
      await (supabase as any)
        .from("loss_opportunities")
        .delete()
        .eq("id", insertResult.data.id);
    }

    checks.push({
      label: "loss-opportunity-insert",
      ok: insertResult._meta.ok,
      count: insertResult._meta.count,
      err: insertResult._meta.err ?? null,
      meta: insertResult._meta,
    });
  }

  const ok = checks.every((check) => check.ok);
  return {
    ok,
    dryRun,
    checks,
  };
}
