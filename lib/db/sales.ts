import { cache } from "react";

import { getSupabaseClient } from "@/lib/supabase/client";
import type { MonthlyTotal, SalesRow } from "@/types/sales";

type FetchRangeArgs = {
  start?: string;
  end?: string;
  customerId?: number;
  repId?: number;
};

type SalesDemoSelectRow = {
  invoice_date: string;
  invoice_amount: number | string | null;
  customer_id: number;
  rep_id: number | null;
  invoice_number: string | null;
};

export async function fetchSalesRange({
  start,
  end,
  customerId,
  repId,
}: FetchRangeArgs = {}): Promise<SalesRow[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("sales_demo")
    .select("invoice_date, invoice_amount, customer_id, rep_id, invoice_number");

  if (start) {
    query = query.gte("invoice_date", start);
  }
  if (end) {
    query = query.lt("invoice_date", end);
  }
  if (customerId) {
    query = query.eq("customer_id", customerId);
  }
  if (repId) {
    query = query.eq("rep_id", repId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const rows = (data ?? []) as SalesDemoSelectRow[];

  return rows.map((row) => ({
    invoice_date: new Date(row.invoice_date).toISOString().slice(0, 10),
    invoice_amount:
      typeof row.invoice_amount === "string"
        ? Number(row.invoice_amount)
        : Number(row.invoice_amount ?? 0),
    customer_id: Number(row.customer_id),
    rep_id: row.rep_id === null ? null : Number(row.rep_id),
    invoice_number: row.invoice_number ?? null,
  }));
}

export function groupByMonth(rows: SalesRow[]): MonthlyTotal[] {
  const monthly = new Map<string, { total: number; rows: number }>();

  for (const row of rows) {
    const month = row.invoice_date.slice(0, 7);
    const current = monthly.get(month) ?? { total: 0, rows: 0 };
    current.total += row.invoice_amount ?? 0;
    current.rows += 1;
    monthly.set(month, current);
  }

  return Array.from(monthly.entries())
    .map(([month, value]) => ({
      month,
      total: Number(value.total.toFixed(2)),
      rows: value.rows,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function calculateGrandTotal(rows: SalesRow[]): number {
  const total = rows.reduce((sum, row) => sum + (row.invoice_amount ?? 0), 0);
  return Number(total.toFixed(2));
}

export const fetchSalesRangeCached = cache(fetchSalesRange);
