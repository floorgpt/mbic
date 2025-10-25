'use server';

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type DateRange = {
  from: string; // inclusive (YYYY-MM-DD)
  to: string; // exclusive (YYYY-MM-DD)
};

export type RepKpisRow = {
  rep_id: number;
  total_revenue: number;
  invoice_count: number;
  avg_invoice: number;
  unique_customers: number;
  top_dealer_id: number | null;
  top_dealer_name: string | null;
  top_dealer_revenue: number | null;
};

export type RepMonthlyRow = {
  month_label: string;
  month_revenue: number;
  invoice_count: number;
};

export type RepDealerRow = {
  customer_id: number;
  dealer_name: string | null;
  invoices: number;
  revenue: number;
  avg_invoice: number;
};

export type DealerMonthlyRow = {
  month_label: string;
  month_revenue: number;
  invoice_count: number;
};

function parseNumeric(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

async function callRpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc<T>(fn, params);
  if (error) {
    throw error;
  }
  return data as T;
}

export async function getRepKpis(repId: number, range: DateRange): Promise<RepKpisRow> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .rpc<RepKpisRow>("sales_rep_kpis", {
      p_rep_id: repId,
      p_from: range.from,
      p_to: range.to,
    })
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  const row = data ?? {
    rep_id: repId,
    total_revenue: 0,
    invoice_count: 0,
    avg_invoice: 0,
    unique_customers: 0,
    top_dealer_id: null,
    top_dealer_name: null,
    top_dealer_revenue: null,
  };

  return {
    rep_id: repId,
    total_revenue: parseNumeric((row as RepKpisRow).total_revenue),
    invoice_count: Number((row as RepKpisRow).invoice_count ?? 0),
    avg_invoice: parseNumeric((row as RepKpisRow).avg_invoice),
    unique_customers: Number((row as RepKpisRow).unique_customers ?? 0),
    top_dealer_id:
      (row as RepKpisRow).top_dealer_id == null
        ? null
        : Number((row as RepKpisRow).top_dealer_id),
    top_dealer_name: (row as RepKpisRow).top_dealer_name ?? null,
    top_dealer_revenue:
      (row as RepKpisRow).top_dealer_revenue == null
        ? null
        : parseNumeric((row as RepKpisRow).top_dealer_revenue),
  };
}

export async function getRepMonthly(repId: number, range: DateRange): Promise<RepMonthlyRow[]> {
  const data = await callRpc<RepMonthlyRow[]>("sales_rep_monthly", {
    p_rep_id: repId,
    p_from: range.from,
    p_to: range.to,
  });

  return (data ?? []).map((row) => ({
    month_label: row.month_label,
    month_revenue: parseNumeric(row.month_revenue),
    invoice_count: Number(row.invoice_count ?? 0),
  }));
}

export async function getRepDealers(
  repId: number,
  range: DateRange,
  options: { limit?: number; offset?: number } = {},
): Promise<RepDealerRow[]> {
  const data = await callRpc<RepDealerRow[]>("sales_rep_dealers", {
    p_rep_id: repId,
    p_from: range.from,
    p_to: range.to,
    p_limit: options.limit ?? 100,
    p_offset: options.offset ?? 0,
  });

  return (data ?? []).map((row) => ({
    customer_id: Number(row.customer_id),
    dealer_name: row.dealer_name ?? null,
    invoices: Number(row.invoices ?? 0),
    revenue: parseNumeric(row.revenue),
    avg_invoice: parseNumeric(row.avg_invoice),
  }));
}

export async function getDealerMonthly(
  repId: number,
  dealerId: number,
  range: DateRange,
): Promise<DealerMonthlyRow[]> {
  const data = await callRpc<DealerMonthlyRow[]>("sales_dealer_monthly", {
    p_rep_id: repId,
    p_customer_id: dealerId,
    p_from: range.from,
    p_to: range.to,
  });

  return (data ?? []).map((row) => ({
    month_label: row.month_label,
    month_revenue: parseNumeric(row.month_revenue),
    invoice_count: Number(row.invoice_count ?? 0),
  }));
}
