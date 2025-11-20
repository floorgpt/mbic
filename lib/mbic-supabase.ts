"use server";

import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getIcon, tryServer, tryServerSafe, type SafeResult } from "@/lib/utils";

export type DateISO = string;

type NumericLike = number | string | null;
type RpcResponse<T> = { data: T | null; error: { message?: string } | null };

function asNumber(value: NumericLike, fallback = 0): number {
  if (value == null) return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCollectionName(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return "Uncategorized";
}


function logRpc(fn: string, params: Record<string, unknown>, error?: unknown) {
  const logData = {
    at: "mbic-supabase",
    fn,
    params,
    ok: !error,
    error: error ? String((error as Error)?.message ?? error) : null,
  };

  // Only use console.error for actual errors, console.log for successful calls
  if (error) {
    console.error(JSON.stringify(logData));
  } else {
    console.log(JSON.stringify(logData));
  }
}

async function callRpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  const supabase = getSupabaseAdminClient();
  const rpcBuilder = supabase.rpc(fn as never, params as never);
  const rpcPromise: Promise<RpcResponse<T>> = new Promise((resolve, reject) => {
    rpcBuilder.then(resolve, reject);
  });
  const [result, caught] = await tryServer(rpcPromise);
  if (caught) {
    logRpc(fn, params, caught);
    throw caught;
  }
  const { data, error } = (result as RpcResponse<T>) ?? {
    data: null,
    error: null,
  };
  logRpc(fn, params, error);
  if (error) {
    throw new Error(`${fn} failed: ${error.message}`);
  }
  if (!data) {
    throw new Error(`${fn} returned no data`);
  }
  return data as T;
}

export type OrgKpis = {
  revenue: number;
  unique_dealers: number;
  avg_invoice: number;
  top_dealer: string | null;
  top_dealer_revenue: number;
};

export type GrossProfit = {
  amount: number;
  margin_pct: number;
};

export type FillRate = {
  pct: number;
};

export async function getFillRateSafe(from: DateISO, to: DateISO): Promise<SafeResult<FillRate>> {
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string>>>("sales_org_fill_rate_v1", {
      from_date: from,
      to_date: to,
    }),
    "sales_org_fill_rate_v1",
    [],
  );
  const row = (safe.data ?? [])[0] ?? {};
  const mapped: FillRate = {
    pct: asNumber(row.pct ?? row.fill_rate ?? row.percentage, 0),
  };
  return {
    data: mapped,
    _meta: { ...safe._meta, count: mapped ? 1 : 0 },
  };
}

export async function getOrgKpis(from: DateISO, to: DateISO): Promise<OrgKpis> {
  const rows = await callRpc<Array<Record<string, NumericLike | string>>>(
    "sales_org_kpis_v2",
    { from_date: from, to_date: to },
  );

  const row = rows?.[0] ?? {};
  return {
    revenue: asNumber(row.revenue ?? row.revenue_ytd, 0),
    unique_dealers: asNumber(row.unique_dealers ?? row.active_dealers, 0),
    avg_invoice: asNumber(row.avg_invoice, 0),
    top_dealer: typeof row.top_dealer === "string" ? row.top_dealer : null,
    top_dealer_revenue: asNumber(row.top_dealer_revenue, 0),
  };
}

export async function getOrgKpisSafe(from: DateISO, to: DateISO): Promise<SafeResult<OrgKpis>> {
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string>>>("sales_org_kpis_v2", {
      from_date: from,
      to_date: to,
    }),
    "sales_org_kpis_v2",
    [],
  );
  const row = (safe.data ?? [])[0] ?? {};
  const mapped: OrgKpis = {
    revenue: asNumber(row.revenue ?? row.revenue_ytd, 0),
    unique_dealers: asNumber(row.unique_dealers ?? row.active_dealers, 0),
    avg_invoice: asNumber(row.avg_invoice, 0),
    top_dealer: typeof row.top_dealer === "string" ? row.top_dealer : null,
    top_dealer_revenue: asNumber(row.top_dealer_revenue, 0),
  };
  return {
    data: mapped,
    _meta: { ...safe._meta, count: mapped ? 1 : 0 },
  };
}

export async function getOrgGrossProfitSafe(from: DateISO, to: DateISO): Promise<SafeResult<GrossProfit>> {
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string>>>("sales_org_gross_profit_v1", {
      from_date: from,
      to_date: to,
    }),
    "sales_org_gross_profit_v1",
    [],
  );
  const row = (safe.data ?? [])[0] ?? {};
  const mapped: GrossProfit = {
    amount: asNumber(row.amount ?? row.gross_profit ?? row.total_profit, 0),
    margin_pct: asNumber(row.margin_pct ?? row.margin_percent ?? row.margin, 0),
  };
  return {
    data: mapped,
    _meta: { ...safe._meta, count: mapped ? 1 : 0 },
  };
}

export type MonthlyPoint = { month: string; total: number };

export async function getOrgMonthly(from: DateISO, to: DateISO): Promise<MonthlyPoint[]> {
  const rows = await callRpc<Array<Record<string, NumericLike | string>>>(
    "sales_org_monthly_v2",
    { from_date: from, to_date: to },
  );

  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    month: typeof row.month === "string" ? row.month : (row.month_label as string) ?? "",
    total: asNumber(row.total ?? row.month_total ?? (row.sum as NumericLike) ?? 0, 0),
  }));
}

export async function getOrgMonthlySafe(from: DateISO, to: DateISO): Promise<SafeResult<MonthlyPoint[]>> {
  const fallback: Array<Record<string, NumericLike | string>> = [];
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string>>>("sales_org_monthly_v2", {
      from_date: from,
      to_date: to,
    }),
    "sales_org_monthly_v2",
    fallback,
  );
  const mapped = (safe.data ?? []).map((row) => ({
    month: typeof row.month === "string" ? row.month : (row.month_label as string) ?? "",
    total: asNumber(row.total ?? row.month_total ?? (row.sum as NumericLike) ?? 0, 0),
  }));
  return {
    data: mapped,
    _meta: { ...safe._meta, count: mapped.length },
  };
}

export type DealerRow = {
  dealer_name: string;
  revenue: number;
  monthly_avg: number;
  share_pct: number | null;
  rep_initials: string | null;
};

export async function getTopDealers(
  from: DateISO,
  to: DateISO,
  limit = 10,
  offset = 0,
): Promise<DealerRow[]> {
  const rows = await callRpc<Array<Record<string, NumericLike | string>>>(
    "sales_org_top_dealers",
    { from_date: from, to_date: to, limit, offset },
  );

  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    dealer_name:
      typeof row.dealer_name === "string" && row.dealer_name.trim().length > 0
        ? row.dealer_name
        : "—",
    revenue: asNumber(row.revenue ?? row.revenue_ytd, 0),
    monthly_avg: asNumber(row.monthly_avg, 0),
    share_pct: row.share_pct == null ? null : asNumber(row.share_pct, 0),
    rep_initials:
      typeof row.rep_initials === "string" && row.rep_initials.trim().length > 0
        ? row.rep_initials
        : null,
  }));
}

export async function getTopDealersSafe(
  from: DateISO,
  to: DateISO,
  limit = 10,
  offset = 0,
): Promise<SafeResult<DealerRow[]>> {
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string>>>("sales_org_top_dealers", {
      from_date: from,
      to_date: to,
      limit,
      offset,
    }),
    "sales_org_top_dealers",
    [],
  );

  const mapped = (safe.data ?? []).map((row) => ({
    dealer_name:
      typeof row.dealer_name === "string" && row.dealer_name.trim().length > 0
        ? row.dealer_name
        : "—",
    revenue: asNumber(row.revenue ?? row.revenue_ytd, 0),
    monthly_avg: asNumber(row.monthly_avg, 0),
    share_pct: row.share_pct == null ? null : asNumber(row.share_pct, 0),
    rep_initials:
      typeof row.rep_initials === "string" && row.rep_initials.trim().length > 0
        ? row.rep_initials
        : null,
  }));
  return {
    data: mapped,
    _meta: { ...safe._meta, count: mapped.length },
  };
}

export type RepRow = {
  rep_id: number;
  rep_name: string;
  revenue: number;
  monthly_avg: number;
  active_customers: number;
  total_customers: number;
  active_pct: number | null;
};

export async function getTopReps(
  from: DateISO,
  to: DateISO,
  limit = 10,
  offset = 0,
): Promise<RepRow[]> {
  const rows = await callRpc<Array<Record<string, NumericLike | string>>>(
    "sales_org_top_reps",
    { from_date: from, to_date: to, limit, offset },
  );

  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    rep_id: asNumber(row.rep_id, 0),
    rep_name: typeof row.rep_name === "string" ? row.rep_name : "Rep",
    revenue: asNumber(row.revenue ?? row.revenue_ytd, 0),
    monthly_avg: asNumber(row.monthly_avg, 0),
    active_customers: asNumber(row.active_customers, 0),
    total_customers: asNumber(row.total_customers, 0),
    active_pct: row.active_pct == null ? null : asNumber(row.active_pct, 0),
  }));
}

export async function getTopRepsSafe(
  from: DateISO,
  to: DateISO,
  limit = 10,
  offset = 0,
): Promise<SafeResult<RepRow[]>> {
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string>>>("sales_org_top_reps", {
      from_date: from,
      to_date: to,
      limit,
      offset,
    }),
    "sales_org_top_reps",
    [],
  );

  const mapped = (safe.data ?? []).map((row) => ({
    rep_id: asNumber(row.rep_id, 0),
    rep_name: typeof row.rep_name === "string" ? row.rep_name : "Rep",
    revenue: asNumber(row.revenue ?? row.revenue_ytd, 0),
    monthly_avg: asNumber(row.monthly_avg, 0),
    active_customers: asNumber(row.active_customers, 0),
    total_customers: asNumber(row.total_customers, 0),
    active_pct: row.active_pct == null ? null : asNumber(row.active_pct, 0),
  }));
  return {
    data: mapped,
    _meta: { ...safe._meta, count: mapped.length },
  };
}

export type CategoryRow = {
  category_key: string;
  display_name: string;
  icon_url: string | null;
  total_sales: number;
  share_pct: number;
};

export type TopCollectionRow = {
  collection_key: string;
  collection_name: string;
  lifetime_sales: number;
  share_pct: number;
};

export async function getCategoryTotals(from: DateISO, to: DateISO): Promise<CategoryRow[]> {
  const rows = await callRpc<Array<Record<string, NumericLike | string>>>(
    "sales_category_totals",
    { from_date: from, to_date: to },
  );

  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    category_key: typeof row.category_key === "string" ? row.category_key : "uncategorized",
    display_name: normalizeCollectionName(row.display_name ?? row.category_key),
    icon_url: typeof row.icon_url === "string" ? row.icon_url : null,
    total_sales: asNumber(row.total_sales, 0),
    share_pct: asNumber(row.share_pct, 0),
  }));
}

export async function getCategoryTotalsSafe(from: DateISO, to: DateISO): Promise<SafeResult<CategoryRow[]>> {
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string>>>("sales_category_totals", {
      from_date: from,
      to_date: to,
    }),
    "sales_category_totals",
    [],
  );

  const mapped = (safe.data ?? [])
    .filter((row) => row?.category_key && row.category_key !== "__UNMAPPED__")
    .map((row) => ({
      category_key: typeof row.category_key === "string" ? row.category_key : "uncategorized",
      display_name: normalizeCollectionName(row.display_name ?? row.category_key),
      icon_url: getIcon(row.icon_url as string | undefined),
      total_sales: asNumber(row.total_sales, 0),
      share_pct: asNumber(row.share_pct, 0),
    }));
  return {
    data: mapped,
    _meta: { ...safe._meta, count: mapped.length },
  };
}

async function getCollectionsFallback(from: DateISO, to: DateISO): Promise<TopCollectionRow[]> {
  type CollectionFallbackRow = {
    collection_norm: string | null;
    collection: string | null;
    invoice_amount: NumericLike;
    invoice_date: string | null;
  };

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("v_sales_norm")
    .select("collection_norm, collection, invoice_amount, invoice_date")
    .gte("invoice_date", from)
    .lte("invoice_date", to);

  if (error) {
    throw error;
  }

  const grouped = new Map<string, { name: string; total: number }>();
  let grandTotal = 0;

  const rows = (data as CollectionFallbackRow[] | null) ?? [];

  rows.forEach((row) => {
    const amount = asNumber(row.invoice_amount, 0);
    if (!amount) return;
    const rawName = row.collection ?? undefined;
    const normalized = row.collection_norm ?? rawName ?? "Uncategorized";
    const key = normalized || "uncategorized";
    const entry = grouped.get(key) ?? { name: rawName ?? normalized ?? "Uncategorized", total: 0 };
    entry.total += amount;
    grouped.set(key, entry);
    grandTotal += amount;
  });

  const totals = Array.from(grouped.entries())
    .map(([collection_key, value]) => ({
      collection_key,
      collection_name: value.name,
      lifetime_sales: value.total,
      share_pct: grandTotal ? (value.total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.lifetime_sales - a.lifetime_sales)
    .slice(0, 20);

  return totals;
}

export async function getTopCollectionsSafe(from: DateISO, to: DateISO): Promise<SafeResult<TopCollectionRow[]>> {
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string>>>("sales_org_top_collections", {
      from_date: from,
      to_date: to,
      top_n: 20,
    }),
    "sales_org_top_collections",
    [],
  );

  if (safe._meta.ok) {
    const mapped = (safe.data ?? []).map((row) => ({
      collection_key: typeof row.collection_key === "string" ? row.collection_key : String(row.collection ?? row.collection_norm ?? "collection"),
      collection_name: typeof row.collection_name === "string"
        ? row.collection_name
        : typeof row.collection === "string"
          ? row.collection
          : typeof row.collection_norm === "string"
            ? row.collection_norm
            : "Collection",
      lifetime_sales: asNumber(row.lifetime_sales ?? row.revenue ?? row.total_sales ?? row.amount ?? row.sum, 0),
      share_pct: asNumber(row.share_pct ?? row.share ?? 0, 0),
    }));
    return {
      data: mapped,
      _meta: { ...safe._meta, count: mapped.length },
    };
  }

  try {
    const fallbackData = await getCollectionsFallback(from, to);
    return {
      data: fallbackData,
      _meta: { ok: true, count: fallbackData.length },
    };
  } catch (error) {
    console.error("Server fetch failed (collections_fallback):", error);
    return {
      data: [],
      _meta: { ok: false, count: 0, err: (error as Error)?.message },
    };
  }
}

export type DealerEngagementRow = {
  month: string;
  active_cnt: number;
  inactive_cnt: number;
  total_assigned: number;
  active_pct: number;
};

export async function getDealerEngagement(from: DateISO, to: DateISO): Promise<DealerEngagementRow[]> {
  const rows = await callRpc<Array<Record<string, NumericLike | string>>>(
    "sales_org_dealer_engagement_trailing_v3",
    { from_date: from, to_date: to },
  );

  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    month: typeof row.month === "string" ? row.month : "",
    active_cnt: asNumber(row.active_cnt, 0),
    inactive_cnt: asNumber(row.inactive_cnt, 0),
    total_assigned: asNumber(row.total_assigned, 0),
    active_pct: asNumber(row.active_pct, 0),
  }));
}

export async function getDealerEngagementSafe(
  from: DateISO,
  to: DateISO,
): Promise<SafeResult<DealerEngagementRow[]>> {
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string>>>("sales_org_dealer_engagement_trailing_v3", {
      from_date: from,
      to_date: to,
    }),
    "sales_org_dealer_engagement_trailing_v3",
    [],
  );

  const mapped = (safe.data ?? []).map((row) => ({
    month: typeof row.month === "string" ? row.month : "",
    active_cnt: asNumber(row.active_cnt, 0),
    inactive_cnt: asNumber(row.inactive_cnt, 0),
    total_assigned: asNumber(row.total_assigned, 0),
    active_pct: asNumber(row.active_pct, 0),
  }));
  return {
    data: mapped,
    _meta: { ...safe._meta, count: mapped.length },
  };
}

export type ZipSalesRow = {
  zip_code: string;
  revenue: number;
  dealer_count: number;
  order_count: number;
};

export type DealerByZipRow = {
  customer_id: number;
  dealer_name: string;
  rep_id: number | null;
  rep_name: string;
  total_sales: number;
  order_count: number;
  cities: string | null;
};

export async function getFloridaZipSalesSafe(
  from: DateISO,
  to: DateISO,
  category?: string | null,
  collection?: string | null,
): Promise<SafeResult<ZipSalesRow[]>> {
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string>>>("sales_by_zip_fl", {
      from_date: from,
      to_date: to,
      p_category: category ?? null,
      p_collection: collection ?? null,
    }),
    "sales_by_zip_fl",
    [],
  );

  const mapped = (safe.data ?? []).map((row) => ({
    zip_code: typeof row.zip_code === "string" ? row.zip_code : "",
    revenue: asNumber(row.revenue, 0),
    dealer_count: asNumber(row.dealer_count, 0),
    order_count: asNumber(row.order_count, 0),
  }));

  return {
    data: mapped,
    _meta: { ...safe._meta, count: mapped.length },
  };
}

export async function getDealersByZipSafe(
  zipCode: string,
  from: DateISO,
  to: DateISO,
): Promise<SafeResult<DealerByZipRow[]>> {
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string>>>("dealers_by_zip", {
      p_zip_code: zipCode,
      from_date: from,
      to_date: to,
    }),
    "dealers_by_zip",
    [],
  );

  const mapped = (safe.data ?? []).map((row) => ({
    customer_id: asNumber(row.customer_id, 0),
    dealer_name: typeof row.dealer_name === "string" ? row.dealer_name : "",
    rep_id: row.rep_id === null ? null : asNumber(row.rep_id, 0),
    rep_name: typeof row.rep_name === "string" ? row.rep_name : "Unassigned",
    total_sales: asNumber(row.total_sales, 0),
    order_count: asNumber(row.order_count, 0),
    cities: typeof row.cities === "string" ? row.cities : null,
  }));

  return {
    data: mapped,
    _meta: { ...safe._meta, count: mapped.length },
  };
}

// ============================================================================
// DEALER & SALES PULSE DASHBOARD TYPES & FUNCTIONS
// ============================================================================

export type CategoryTrendRow = {
  category_key: string;
  display_name: string;
  current_sales: number;
  prior_sales: number;
  trend_direction: "up" | "down" | "flat";
  trend_pct: number;
  collections: Array<{
    collection_name: string;
    sales: number;
    share_pct: number;
  }>;
};

export type RepVsTargetRow = {
  rep_id: number;
  rep_name: string;
  rep_initials: string;
  total_sales: number;
  target_amount: number;
  achievement_pct: number;
  status: "exceeded" | "on-track" | "below-target";
};

export type CountySalesRow = {
  zip_code: string;
  city: string;
  county: string;
  region: "South Florida" | "Central Florida" | "North Florida" | "Other Florida";
  revenue: number;
  dealer_count: number;
  order_count: number;
};

export async function getCategoryTrendsByMonthSafe(
  targetMonth: DateISO,
): Promise<SafeResult<CategoryTrendRow[]>> {
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string | unknown>>>(
      "sales_category_trends_by_month",
      {
        p_target_month: targetMonth,
        p_category: null,
        p_collection: null,
      },
    ),
    "sales_category_trends_by_month",
    [],
  );

  const mapped = (safe.data ?? []).map((row) => {
    const collectionsRaw = row.collections;
    let collections: Array<{ collection_name: string; sales: number; share_pct: number }> = [];

    if (typeof collectionsRaw === 'string') {
      try {
        collections = JSON.parse(collectionsRaw);
      } catch {
        collections = [];
      }
    } else if (Array.isArray(collectionsRaw)) {
      collections = collectionsRaw;
    }

    return {
      category_key: typeof row.category_key === "string" ? row.category_key : "uncategorized",
      display_name: typeof row.display_name === "string" ? row.display_name : "Uncategorized",
      current_sales: asNumber(row.current_sales as NumericLike, 0),
      prior_sales: asNumber(row.prior_sales as NumericLike, 0),
      trend_direction: (row.trend_direction === "up" || row.trend_direction === "down" || row.trend_direction === "flat"
        ? row.trend_direction
        : "flat") as "up" | "down" | "flat",
      trend_pct: asNumber(row.trend_pct as NumericLike, 0),
      collections,
    };
  });

  return {
    data: mapped,
    _meta: { ...safe._meta, count: mapped.length },
  };
}

export async function getRepsVsTargetsSafe(
  from: DateISO,
  to: DateISO,
): Promise<SafeResult<RepVsTargetRow[]>> {
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string>>>("sales_reps_vs_targets", {
      from_date: from,
      to_date: to,
    }),
    "sales_reps_vs_targets",
    [],
  );

  const mapped = (safe.data ?? []).map((row) => ({
    rep_id: asNumber(row.rep_id, 0),
    rep_name: typeof row.rep_name === "string" ? row.rep_name : "Rep",
    rep_initials: typeof row.rep_initials === "string" ? row.rep_initials : "??",
    total_sales: asNumber(row.total_sales, 0),
    target_amount: asNumber(row.target_amount, 200000),
    achievement_pct: asNumber(row.achievement_pct, 0),
    status: (row.status === "exceeded" || row.status === "on-track" || row.status === "below-target"
      ? row.status
      : "below-target") as "exceeded" | "on-track" | "below-target",
  }));

  return {
    data: mapped,
    _meta: { ...safe._meta, count: mapped.length },
  };
}

export async function getSalesByCountyFlSafe(
  from: DateISO,
  to: DateISO,
): Promise<SafeResult<CountySalesRow[]>> {
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string>>>("sales_by_county_fl", {
      from_date: from,
      to_date: to,
    }),
    "sales_by_county_fl",
    [],
  );

  const mapped = (safe.data ?? []).map((row) => ({
    zip_code: typeof row.zip_code === "string" ? row.zip_code : "",
    city: typeof row.city === "string" ? row.city : "Unknown",
    county: typeof row.county === "string" ? row.county : "Unknown",
    region: (row.region === "South Florida" || row.region === "Central Florida" || row.region === "North Florida" || row.region === "Other Florida"
      ? row.region
      : "Other Florida") as "South Florida" | "Central Florida" | "North Florida" | "Other Florida",
    revenue: asNumber(row.revenue, 0),
    dealer_count: asNumber(row.dealer_count, 0),
    order_count: asNumber(row.order_count, 0),
  }));

  return {
    data: mapped,
    _meta: { ...safe._meta, count: mapped.length },
  };
}

export type ZipDealerRow = {
  customer_id: string;
  dealer_name: string;
  dealer_city: string;
  dealer_zip: string;
  revenue: number;
  order_count: number;
  sales_rep: string;
};

export async function getDealersByZipFlSafe(
  zipCode: string,
  from: DateISO,
  to: DateISO,
): Promise<SafeResult<ZipDealerRow[]>> {
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string>>>("dealers_by_zip_fl", {
      p_zip_code: zipCode,
      from_date: from,
      to_date: to,
    }),
    "dealers_by_zip_fl",
    [],
  );

  const mapped = (safe.data ?? []).map((row) => ({
    customer_id: typeof row.customer_id === "string" ? row.customer_id : "",
    dealer_name: typeof row.dealer_name === "string" ? row.dealer_name : "Unknown",
    dealer_city: typeof row.dealer_city === "string" ? row.dealer_city : "Unknown",
    dealer_zip: typeof row.dealer_zip === "string" ? row.dealer_zip : "",
    revenue: asNumber(row.revenue, 0),
    order_count: asNumber(row.order_count, 0),
    sales_rep: typeof row.sales_rep === "string" ? row.sales_rep : "Unassigned",
  }));

  return {
    data: mapped,
    _meta: { ...safe._meta, count: mapped.length },
  };
}
