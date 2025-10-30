"use server";

import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { tryServerSafe, type SafeResult } from "@/lib/utils";
import {
  type ProductCategoryRow,
  type SalesRepRow,
  type CustomersDemoRow,
} from "@/types/database";
import {
  type SalesRepOption,
  type DealerOption,
  type CategoryOption,
  type CollectionOption,
  type ColorOption,
} from "@/types/forms";

type ColorRow = {
  color?: string | null;
  color_name?: string | null;
};

function ensureSupabaseError(label: string, error: unknown): never {
  let detail: string;
  if (error instanceof Error) {
    detail = error.message;
  } else {
    try {
      detail = JSON.stringify(error);
    } catch {
      detail = String(error);
    }
  }
  throw new Error(`${label} failed: ${detail}`);
}

function mapSalesReps(rows: SalesRepRow[] | null): SalesRepOption[] {
  if (!rows?.length) return [];
  return rows
    .map((row) => ({
      id: Number(row.rep_id),
      name: row.rep_name ?? `Rep ${row.rep_id}`,
    }))
    .filter((rep) => Number.isFinite(rep.id));
}

function mapDealers(rows: CustomersDemoRow[] | null): DealerOption[] {
  if (!rows?.length) return [];
  return rows
    .map((row) => ({
      id: Number((row as CustomersDemoRow & { dealer_id?: number }).dealer_id ?? row.customer_id),
      name: row.dealer_name ?? `Dealer ${row.customer_id}`,
      repId: row.rep_id,
    }))
    .filter((dealer) => Number.isFinite(dealer.id));
}

function mapCategories(rows: ProductCategoryRow[] | null): CategoryOption[] {
  if (!rows?.length) return [];
  return rows
    .filter((row) => row.is_active)
    .map((row) => ({
      key: row.category_key,
      name: row.display_name ?? row.category_key,
      sortOrder: row.sort_order ?? null,
    }));
}

type CollectionRow = {
  collection_key: string | null;
};

function mapCollections(rows: CollectionRow[] | null): CollectionOption[] {
  if (!rows?.length) return [];
  const seen = new Set<string>();
  const result: CollectionOption[] = [];
  for (const row of rows) {
    const key = row.collection_key?.trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      key,
      label: key,
    });
  }
  return result;
}

function mapColors(rows: ColorRow[] | null): ColorOption[] {
  if (!rows?.length) return [];
  const seen = new Set<string>();
  const result: ColorOption[] = [];
  for (const row of rows) {
    const raw =
      typeof row.color === "string"
        ? row.color
        : typeof row.color_name === "string"
          ? row.color_name
          : null;
    if (!raw) continue;
    const normalized = raw.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push({ name: normalized });
  }
  return result;
}

export async function getSalesReps(): Promise<SafeResult<SalesRepOption[]>> {
  const supabase = getSupabaseAdminClient();
  const safe = await tryServerSafe(
    (async () => {
      const { data, error } = await supabase
        .from("sales_reps_demo")
        .select("rep_id, rep_name")
        .order("rep_name", { ascending: true });

      if (error) {
        ensureSupabaseError("getSalesReps", error);
      }

      return mapSalesReps(data ?? []);
    })(),
    "forms:getSalesReps",
    [],
  );

  console.log("[forms] catalog:getSalesReps", safe._meta);
  return safe;
}

export async function getDealersByRep(repId: number): Promise<SafeResult<DealerOption[]>> {
  if (!Number.isFinite(repId) || repId <= 0) {
    const safe: SafeResult<DealerOption[]> = {
      data: [],
      _meta: { ok: true, count: 0 },
    };
    console.log("[forms] catalog:getDealersByRep:skip", { repId, ...safe._meta });
    return safe;
  }

  const supabase = getSupabaseAdminClient();
  const safe = await tryServerSafe(
    (async () => {
      const { data, error } = await supabase
        .from("customers_demo")
        .select("customer_id, dealer_name, rep_id")
        .eq("rep_id", repId)
        .order("dealer_name", { ascending: true });

      if (error) {
        ensureSupabaseError("getDealersByRep", error);
      }

      return mapDealers(data ?? []);
    })(),
    `forms:getDealersByRep:${repId}`,
    [],
  );

  console.log("[forms] catalog:getDealersByRep", { repId, ...safe._meta });
  return safe;
}

export async function getCategories(): Promise<SafeResult<CategoryOption[]>> {
  const supabase = getSupabaseAdminClient();
  const safe = await tryServerSafe(
    (async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("category_key, display_name, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("display_name", { ascending: true });

      if (error) {
        ensureSupabaseError("getCategories", error);
      }

      return mapCategories(data ?? []);
    })(),
    "forms:getCategories",
    [],
  );

  console.log("[forms] catalog:getCategories", safe._meta);
  return safe;
}

export async function getCollectionsByCategory(
  categoryKey: string,
): Promise<SafeResult<CollectionOption[]>> {
  if (!categoryKey) {
    const safe: SafeResult<CollectionOption[]> = {
      data: [],
      _meta: { ok: false, count: 0, err: "categoryKey is required" },
    };
    console.log("[forms] catalog:getCollectionsByCategory:missing", safe._meta);
    return safe;
  }

  const supabase = getSupabaseAdminClient();
  const normalized = categoryKey.trim().toLowerCase();
  const safe = await tryServerSafe(
    (async () => {
      const { data: matchedCategory, error: categoryLookupError } = await supabase
        .from("product_categories")
        .select("category_key")
        .ilike("category_key", normalized)
        .limit(1)
        .maybeSingle<{ category_key: string }>();

      if (categoryLookupError) {
        ensureSupabaseError("getCollectionsByCategory:categoryLookup", categoryLookupError);
      }

      const resolvedKey = matchedCategory?.category_key ?? normalized;

      const { data, error } = await supabase
        .from("product_category_collection_map")
        .select("collection_key")
        .ilike("category_key", resolvedKey)
        .order("collection_key", { ascending: true });

      if (error) {
        ensureSupabaseError("getCollectionsByCategory", error);
      }

      return mapCollections(data as CollectionRow[] | null);
    })(),
    `forms:getCollections:${normalized}`,
    [],
  );

  console.log("[forms] catalog:getCollectionsByCategory", {
    requested: categoryKey,
    normalized,
    ...safe._meta,
  });
  return safe;
}

export async function getColorsByCollection(collectionKey: string): Promise<SafeResult<ColorOption[]>> {
  if (!collectionKey) {
    const safe: SafeResult<ColorOption[]> = {
      data: [],
      _meta: { ok: false, count: 0, err: "collectionKey is required" },
    };
    console.log("[forms] catalog:getColorsByCollection:missing", safe._meta);
    return safe;
  }

  const supabase = getSupabaseAdminClient();
  const normalized = collectionKey.trim();
  const safe = await tryServerSafe(
    (async () => {
      const { data, error } = await supabase.rpc(
        "get_colors_by_collection_v2" as never,
        { collection_key: normalized } as never,
      );

      if (error) {
        ensureSupabaseError("getColorsByCollection", error);
      }

      const rows = Array.isArray(data) ? (data as ColorRow[]) : [];
      const mapped = mapColors(rows);
      if (!mapped.length) {
        throw new Error(`No colors found for collection "${normalized}"`);
      }
      return mapped;
    })(),
    `forms:getColors:${normalized}`,
    [],
  );

  console.log("[forms] catalog:getColorsByCollection", {
    requested: collectionKey,
    normalized,
    ...safe._meta,
  });
  return safe;
}
