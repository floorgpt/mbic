'use server';

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RpcParams = {
  from: string;
  to: string;
};

type NumericLike = number | string | null;

function asNumber(value: NumericLike, fallback = 0): number {
  if (value == null) return fallback;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCollectionName(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return "Uncategorized";
}

async function rpc<T>(fn: string, params: Record<string, unknown>): Promise<T | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc<T>(fn, params);
  if (error) {
    throw error;
  }
  return (data as T) ?? null;
}

export type OrgKpis = {
  revenue_ytd: number;
  active_dealers: number;
  growth_rate: number | null;
};

export async function getOrgKpis({ from, to }: RpcParams): Promise<OrgKpis> {
  const data = (await rpc<Array<Record<string, NumericLike>>>("sales_org_kpis", {
    from_date: from,
    to_date: to,
  })) ?? [{}];

  const row = data[0] ?? {};
  return {
    revenue_ytd: asNumber(row.revenue_ytd, 0),
    active_dealers: asNumber(row.active_dealers, 0),
    growth_rate: row.growth_rate == null ? null : asNumber(row.growth_rate, 0),
  };
}

export type OrgMonthly = Array<{ month: string; month_total: number }>;

export async function getOrgMonthly({ from, to }: RpcParams): Promise<OrgMonthly> {
  const data = (await rpc<Array<Record<string, NumericLike | string>>>(
    "sales_org_monthly",
    {
      from_date: from,
      to_date: to,
    },
  )) ?? [];

  return data.map((row) => ({
    month: typeof row.month === "string" ? row.month : "",
    month_total: asNumber(row.month_total, 0),
  }));
}

export type OrgCollection = {
  collection: string;
  revenue: number;
  share_pct: number;
};

export async function getTopCollections({
  from,
  to,
  topN = 6,
}: RpcParams & { topN?: number }): Promise<OrgCollection[]> {
  const data = (await rpc<Array<Record<string, NumericLike | string>>>(
    "sales_org_top_collections",
    {
      from_date: from,
      to_date: to,
      top_n: topN,
    },
  )) ?? [];

  return data.map((row) => ({
    collection: normalizeCollectionName(row.collection),
    revenue: asNumber(row.revenue, 0),
    share_pct: asNumber(row.share_pct, 0),
  }));
}

export type OrgDealer = {
  customer_id: number;
  dealer_name: string;
  revenue_ytd: number;
  monthly_avg: number;
  invoices: number;
};

export async function getTopDealers({
  from,
  to,
  topN = 5,
}: RpcParams & { topN?: number }): Promise<OrgDealer[]> {
  const data = (await rpc<Array<Record<string, NumericLike | string>>>(
    "sales_org_top_dealers",
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
    invoices: asNumber(row.invoices, 0),
  }));
}

export type OrgRep = {
  rep_id: number;
  rep_name: string;
  revenue: number;
  invoices: number;
  active_dealers: number;
};

export async function getTopReps({
  from,
  to,
  topN = 8,
}: RpcParams & { topN?: number }): Promise<OrgRep[]> {
  const data = (await rpc<Array<Record<string, NumericLike | string>>>(
    "sales_org_top_reps",
    {
      from_date: from,
      to_date: to,
      top_n: topN,
    },
  )) ?? [];

  return data.map((row) => ({
    rep_id: asNumber(row.rep_id, 0),
    rep_name: typeof row.rep_name === "string" ? row.rep_name : `Rep ${asNumber(row.rep_id, 0)}`,
    revenue: asNumber(row.revenue, 0),
    invoices: asNumber(row.invoices, 0),
    active_dealers: asNumber(row.active_dealers, 0),
  }));
}
