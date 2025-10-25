'use server';

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RpcParams = {
  from: string;
  to: string;
};

type NumericLike = number | string | null;
type BooleanLike = boolean | string | number | null;

function asNumber(value: NumericLike, fallback = 0): number {
  if (value == null) return fallback;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function coerceNumeric(value: NumericLike | BooleanLike): NumericLike {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return value as NumericLike;
}

function asBoolean(value: BooleanLike, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    return ["true", "t", "1"].includes(value.toLowerCase());
  }
  return fallback;
}

function normalizeCollectionName(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return "Uncategorized";
}

async function rpc<T>(fn: string, params: Record<string, unknown>): Promise<T | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc(fn as never, params as never);
  if (error) {
    throw error;
  }
  return (data as T) ?? null;
}

export type OrgKpis = {
  revenue_ytd: number;
  active_dealers: number;
  growth_rate: number | null;
  prior_period_available: boolean;
};

export async function getOrgKpis({ from, to }: RpcParams): Promise<OrgKpis> {
  const data = (await rpc<Array<Record<string, NumericLike | BooleanLike>>>(
    "sales_org_kpis_v2",
    {
      from_date: from,
      to_date: to,
    },
  )) ?? [{}];

  const row = data[0] ?? {};
  return {
    revenue_ytd: asNumber(coerceNumeric(row.revenue_ytd), 0),
    active_dealers: asNumber(coerceNumeric(row.active_dealers), 0),
    growth_rate: row.growth_rate == null ? null : asNumber(coerceNumeric(row.growth_rate), 0),
    prior_period_available: asBoolean(row.prior_period_available, false),
  };
}

export type OrgMonthly = Array<{ month: string; month_total: number }>;

export async function getOrgMonthly({ from, to }: RpcParams): Promise<OrgMonthly> {
  const data = (await rpc<Array<Record<string, NumericLike | string>>>(
    "sales_org_monthly_v2",
    {
      from_date: from,
      to_date: to,
    },
  )) ?? [];

  return data.map((row) => ({
    month: typeof row.month_label === "string" ? row.month_label : "",
    month_total: asNumber(row.month_total, 0),
  }));
}

export type OrgProduct = {
  category_key: string;
  display_name: string;
  icon_url: string | null;
  total_sales: number;
  share_pct: number;
};

export async function getTopProducts({ from, to }: RpcParams): Promise<OrgProduct[]> {
  const data = (await rpc<Array<Record<string, NumericLike | string>>>(
    "sales_category_totals_v2",
    {
      from_date: from,
      to_date: to,
    },
  )) ?? [];

  return data.map((row) => ({
    category_key: typeof row.category_key === "string" ? row.category_key : "uncategorized",
    display_name: normalizeCollectionName(row.display_name ?? row.category_key),
    icon_url: typeof row.icon_url === "string" ? row.icon_url : null,
    total_sales: asNumber(row.total_sales, 0),
    share_pct: asNumber(row.share_pct, 0),
  }));
}

export type OrgDealer = {
  customer_id: number;
  dealer_name: string;
  revenue_ytd: number;
  monthly_avg: number;
  share_pct: number;
  invoices: number;
  rep_initials: string | null;
};

export async function getTopDealers({
  from,
  to,
  topN = 10,
}: RpcParams & { topN?: number }): Promise<OrgDealer[]> {
  const data = (await rpc<Array<Record<string, NumericLike | string>>>(
    "sales_org_top_dealers_v2",
    {
      from_date: from,
      to_date: to,
      top_n: topN,
    },
  )) ?? [];

  return data.map((row) => ({
    customer_id: asNumber(row.customer_id, 0),
    dealer_name:
      typeof row.dealer_name === "string" && row.dealer_name.trim().length > 0
        ? row.dealer_name
        : `Dealer ${asNumber(row.customer_id, 0)}`,
    revenue_ytd: asNumber(row.revenue_ytd, 0),
    monthly_avg: asNumber(row.monthly_avg, 0),
    share_pct: asNumber(row.share_pct, 0),
    invoices: asNumber(row.invoices, 0),
    rep_initials:
      typeof row.rep_initials === "string" && row.rep_initials.trim().length > 0
        ? row.rep_initials
        : null,
  }));
}

export type OrgRep = {
  rep_id: number;
  rep_name: string;
  revenue_ytd: number;
  monthly_avg: number;
  invoices: number;
  active_customers: number;
  total_customers: number;
  active_pct: number;
};

export async function getTopReps({
  from,
  to,
  topN = 10,
}: RpcParams & { topN?: number }): Promise<OrgRep[]> {
  const data = (await rpc<Array<Record<string, NumericLike | string>>>(
    "sales_org_top_reps_v2",
    {
      from_date: from,
      to_date: to,
      top_n: topN,
    },
  )) ?? [];

  return data.map((row) => ({
    rep_id: asNumber(row.rep_id, 0),
    rep_name: typeof row.rep_name === "string" ? row.rep_name : `Rep ${asNumber(row.rep_id, 0)}`,
    revenue_ytd: asNumber(row.revenue_ytd ?? row.revenue, 0),
    monthly_avg: asNumber(row.monthly_avg ?? 0, 0),
    invoices: asNumber(row.invoices, 0),
    active_customers: asNumber(row.active_customers, 0),
    total_customers: asNumber(row.total_customers, 0),
    active_pct: asNumber(row.active_pct, 0),
  }));
}
