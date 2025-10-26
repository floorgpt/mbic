'use server';

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type DateRange = { from: string; to: string };

type NumericLike = number | string | null;
type BooleanLike = boolean | string | number | null;

function asNumber(value: NumericLike, fallback = 0): number {
  if (value == null) return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: BooleanLike, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    return ["true", "1", "t", "yes"].includes(value.toLowerCase());
  }
  return fallback;
}

async function callRpc<T>(name: string, params: Record<string, unknown>) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc(name as never, params as never);
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

export async function getOrgKpis({ from, to }: DateRange): Promise<OrgKpis> {
  const rows = (await callRpc<Array<Record<string, NumericLike | BooleanLike>>>(
    "sales_org_kpis_v2",
    {
      from_date: from,
      to_date: to,
    },
  )) ?? [];

  const row = rows[0] ?? {};
  return {
    revenue_ytd: asNumber(row.revenue_ytd, 0),
    active_dealers: asNumber(row.active_dealers, 0),
    growth_rate: row.growth_rate == null ? null : asNumber(row.growth_rate, 0),
    prior_period_available: asBoolean(row.prior_period_available, false),
  };
}

export type MonthlyPoint = { month: string; total: number };

export async function getOrgMonthly({ from, to }: DateRange): Promise<MonthlyPoint[]> {
  const rows = (await callRpc<Array<Record<string, NumericLike | string>>>(
    "sales_org_monthly_v2",
    {
      from_date: from,
      to_date: to,
    },
  )) ?? [];

  return rows.map((row) => ({
    month: typeof row.month_label === "string" ? row.month_label : "",
    total: asNumber(row.month_total, 0),
  }));
}

export type DealerRow = {
  customer_id: number;
  dealer_name: string;
  revenue_ytd: number;
  monthly_avg: number;
  invoices: number;
  share_pct?: number;
  rep_initials: string | null;
};

export async function getTopDealers({
  from,
  to,
  limit = 10,
  offset = 0,
}: DateRange & { limit?: number; offset?: number }): Promise<DealerRow[]> {
  const rows = (await callRpc<Array<Record<string, NumericLike | string>>>(
    "sales_org_top_dealers",
    {
      from_date: from,
      to_date: to,
      limit,
      offset,
    },
  )) ?? [];

  return rows.map((row) => ({
    customer_id: asNumber(row.customer_id, 0),
    dealer_name:
      typeof row.dealer_name === "string" && row.dealer_name.trim().length > 0
        ? row.dealer_name
        : `Dealer ${asNumber(row.customer_id, 0)}`,
    revenue_ytd: asNumber(row.revenue_ytd, 0),
    monthly_avg: asNumber(row.monthly_avg, 0),
    invoices: asNumber(row.invoices, 0),
    share_pct: asNumber(row.share_pct, 0),
    rep_initials:
      typeof row.rep_initials === "string" && row.rep_initials.trim().length > 0
        ? row.rep_initials
        : null,
  }));
}

export type RepRow = {
  rep_id: number;
  rep_name: string;
  revenue_ytd: number;
  monthly_avg: number;
  invoices: number;
  active_customers: number;
  total_customers: number;
  active_pct: number | null;
};

export async function getTopReps({
  from,
  to,
  limit = 10,
  offset = 0,
}: DateRange & { limit?: number; offset?: number }): Promise<RepRow[]> {
  const rows = (await callRpc<Array<Record<string, NumericLike | string>>>(
    "sales_org_top_reps",
    {
      from_date: from,
      to_date: to,
      limit,
      offset,
    },
  )) ?? [];

  return rows.map((row) => ({
    rep_id: asNumber(row.rep_id, 0),
    rep_name: typeof row.rep_name === "string" ? row.rep_name : `Rep ${asNumber(row.rep_id, 0)}`,
    revenue_ytd: asNumber(row.revenue ?? row.revenue_ytd, 0),
    monthly_avg: asNumber(row.monthly_avg, 0),
    invoices: asNumber(row.invoices, 0),
    active_customers: asNumber(row.active_customers ?? row.active_dealers, 0),
    total_customers: asNumber(row.total_customers, 0),
    active_pct: row.active_pct == null ? null : asNumber(row.active_pct, 0),
  }));
}

export type CategoryRow = {
  category_key: string;
  display_name: string;
  icon_url: string | null;
  total_sales: number;
  share_pct: number;
};

export async function getCategoryTotals({ from, to }: DateRange): Promise<CategoryRow[]> {
  const rows = (await callRpc<Array<Record<string, NumericLike | string>>>(
    "sales_category_totals",
    {
      from_date: from,
      to_date: to,
    },
  )) ?? [];

  return rows.map((row) => ({
    category_key: typeof row.category_key === "string" ? row.category_key : "uncategorized",
    display_name: normalizeCollectionName(row.display_name ?? row.category_key),
    icon_url: typeof row.icon_url === "string" ? row.icon_url : null,
    total_sales: asNumber(row.total_sales ?? row.revenue, 0),
    share_pct: asNumber(row.share_pct, 0),
  }));
}

export type DealerEngagementRow = {
  active_cnt: number;
  total_assigned: number;
  active_pct: number;
};

export async function getDealerEngagement({ from, to }: DateRange): Promise<DealerEngagementRow> {
  const rows = (await callRpc<Array<Record<string, NumericLike>>>(
    "sales_org_dealer_engagement_trailing_v3",
    {
      from_date: from,
      to_date: to,
    },
  )) ?? [];

  const row = rows[0] ?? {};
  return {
    active_cnt: asNumber(row.active_cnt, 0),
    total_assigned: asNumber(row.total_assigned, 0),
    active_pct: asNumber(row.active_pct, 0),
  };
}
