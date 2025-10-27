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
  console.error(
    JSON.stringify({
      at: "mbic-supabase",
      fn,
      params,
      ok: !error,
      error: error ? String((error as Error)?.message ?? error) : null,
    }),
  );
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
