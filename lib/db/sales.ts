import { cache } from "react";

import { getSupabaseClient } from "@/lib/supabase/client";
import type { MonthlyTotal, SalesRow } from "@/types/sales";

export type DealerAggregate = {
  customer_id: number;
  dealer_name: string;
  revenue: number;
  invoices: number;
  average_invoice: number;
  revenue_share: number;
};

export type RepSalesData = {
  rows: SalesRow[];
  monthlyTotals: MonthlyTotal[];
  grandTotal: number;
  invoiceCount: number;
  uniqueCustomers: number;
  dealers: DealerAggregate[];
};

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

async function fetchCustomerNames(customerIds: number[]): Promise<Map<number, string>> {
  if (customerIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("customers_demo")
    .select("customer_id, dealer_name")
    .in("customer_id", customerIds);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<{ customer_id: number; dealer_name: string }>;

  const map = new Map<number, string>();
  for (const row of rows) {
    map.set(Number(row.customer_id), row.dealer_name);
  }
  return map;
}

function aggregateDealers(
  rows: SalesRow[],
  nameMap: Map<number, string>,
  grandTotal: number,
): DealerAggregate[] {
  const dealers = new Map<number, { revenue: number; invoices: number }>();

  for (const row of rows) {
    const key = row.customer_id;
    const current = dealers.get(key) ?? { revenue: 0, invoices: 0 };
    current.revenue += row.invoice_amount ?? 0;
    current.invoices += 1;
    dealers.set(key, current);
  }

  return Array.from(dealers.entries())
    .map(([customerId, info]) => {
      const revenue = Number(info.revenue.toFixed(2));
      const average = info.invoices
        ? Number((info.revenue / info.invoices).toFixed(2))
        : 0;
      const share = grandTotal
        ? Number(((info.revenue / grandTotal) * 100).toFixed(1))
        : 0;
      return {
        customer_id: customerId,
        dealer_name: nameMap.get(customerId) ?? `Dealer ${customerId}`,
        revenue,
        invoices: info.invoices,
        average_invoice: average,
        revenue_share: share,
      } satisfies DealerAggregate;
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function groupByDealerMonth(rows: SalesRow[], dealerId: number): MonthlyTotal[] {
  const filtered = rows.filter((row) => row.customer_id === dealerId);
  return groupByMonth(filtered);
}

export async function fetchRepSalesData(repId: number): Promise<RepSalesData> {
  const rows = await fetchSalesRangeCached({ repId });

  const grandTotal = calculateGrandTotal(rows);
  const invoiceCount = rows.length;

  const uniqueCustomerIds = Array.from(new Set(rows.map((row) => row.customer_id)));
  const nameMap = await fetchCustomerNames(uniqueCustomerIds);

  const dealers = aggregateDealers(rows, nameMap, grandTotal);
  const monthlyTotals = groupByMonth(rows);

  return {
    rows,
    monthlyTotals,
    grandTotal,
    invoiceCount,
    uniqueCustomers: uniqueCustomerIds.length,
    dealers,
  };
}
