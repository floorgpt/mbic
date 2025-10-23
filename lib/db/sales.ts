import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MonthlyTotal, SalesRow } from "@/types/sales";

export type DealerAggregate = {
  customer_id: number;
  dealer_name: string;
  revenue: number;
  invoices: number;
  average_invoice: number;
  revenue_share: number;
  latest_month?: string;
  latest_month_avg?: number;
};

export type RepSalesData = {
  rows: SalesRow[];
  monthlyTotals: MonthlyTotal[];
  grandTotal: number;
  invoiceCount: number;
  uniqueCustomers: number;
  dealers: DealerAggregate[];
};

export type CollectionAggregate = {
  collection: string;
  revenue: number;
  invoices: number;
  revenue_share: number;
};

export type RepAggregate = {
  rep_id: number;
  rep_name: string;
  revenue: number;
  invoices: number;
  customer_count: number;
  revenue_share: number;
};

export type OrganizationSalesOverview = {
  rows: SalesRow[];
  monthlyTotals: MonthlyTotal[];
  grandTotal: number;
  invoiceCount: number;
  activeDealers: number;
  growthRate: number;
  dealerAggregates: DealerAggregate[];
  collectionAggregates: CollectionAggregate[];
  repAggregates: RepAggregate[];
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
  collection: string | null;
};

export async function fetchSalesRange({
  start,
  end,
  customerId,
  repId,
}: FetchRangeArgs = {}): Promise<SalesRow[]> {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("sales_demo")
    .select(
      "invoice_date, invoice_amount, customer_id, rep_id, invoice_number, collection",
      { count: "exact" },
    );

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

  const { data, error } = await query.limit(1000000);
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
    collection: row.collection ?? null,
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

async function resolveReportingWindow(start?: string, end?: string): Promise<{
  start: string;
  end: string;
}> {
  if (start && end) {
    return { start, end };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sales_demo")
    .select("invoice_date")
    .order("invoice_date", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<{ invoice_date: string | null }>;
  const latestDate =
    rows.length > 0 && rows[0]?.invoice_date
      ? new Date(rows[0].invoice_date)
      : null;

  const reference = start
    ? new Date(start)
    : latestDate ?? new Date();

  const targetYear = reference.getUTCFullYear();

  return {
    start: start ?? `${targetYear}-01-01`,
    end: end ?? `${targetYear + 1}-01-01`,
  };
}

async function fetchCustomerNames(customerIds: number[]): Promise<Map<number, string>> {
  if (customerIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseAdminClient();
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

export function aggregateDealers(
  rows: SalesRow[],
  nameMap: Map<number, string>,
  grandTotal: number,
): DealerAggregate[] {
  type DealerInfo = {
    revenue: number;
    invoices: number;
    monthly: Map<string, { revenue: number; invoices: number }>;
  };

  const dealers = new Map<number, DealerInfo>();

  for (const row of rows) {
    const key = row.customer_id;
    const current =
      dealers.get(key) ?? {
        revenue: 0,
        invoices: 0,
        monthly: new Map<string, { revenue: number; invoices: number }>(),
      };
    current.revenue += row.invoice_amount ?? 0;
    current.invoices += 1;
    const month = row.invoice_date.slice(0, 7);
    const monthBucket = current.monthly.get(month) ?? {
      revenue: 0,
      invoices: 0,
    };
    monthBucket.revenue += row.invoice_amount ?? 0;
    monthBucket.invoices += 1;
    current.monthly.set(month, monthBucket);
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

      const months = Array.from(info.monthly.keys()).sort();
      const latestMonth = months[months.length - 1];
      const latestBucket = latestMonth ? info.monthly.get(latestMonth) : undefined;
      const latestAvg = latestBucket && latestBucket.invoices
        ? Number((latestBucket.revenue / latestBucket.invoices).toFixed(2))
        : undefined;

      return {
        customer_id: customerId,
        dealer_name: nameMap.get(customerId) ?? `Dealer ${customerId}`,
        revenue,
        invoices: info.invoices,
        average_invoice: average,
        revenue_share: share,
        latest_month: latestMonth,
        latest_month_avg: latestAvg,
      } satisfies DealerAggregate;
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function groupByDealerMonth(rows: SalesRow[], dealerId: number): MonthlyTotal[] {
  const filtered = rows.filter((row) => row.customer_id === dealerId);
  return groupByMonth(filtered);
}

export async function fetchRepSalesData(repId: number): Promise<RepSalesData> {
  const rows = await fetchSalesRange({ repId });

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

function aggregateCollections(rows: SalesRow[], grandTotal: number): CollectionAggregate[] {
  const map = new Map<string, { revenue: number; invoices: number }>();

  for (const row of rows) {
    const key = row.collection ?? "Uncategorized";
    const entry = map.get(key) ?? { revenue: 0, invoices: 0 };
    entry.revenue += row.invoice_amount ?? 0;
    entry.invoices += 1;
    map.set(key, entry);
  }

  return Array.from(map.entries())
    .map(([collection, info]) => {
      const revenue = Number(info.revenue.toFixed(2));
      const share = grandTotal
        ? Number(((info.revenue / grandTotal) * 100).toFixed(1))
        : 0;
      return {
        collection,
        revenue,
        invoices: info.invoices,
        revenue_share: share,
      } satisfies CollectionAggregate;
    })
    .sort((a, b) => b.revenue - a.revenue);
}

async function fetchRepNames(repIds: number[]): Promise<Map<number, string>> {
  if (repIds.length === 0) return new Map();
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sales_reps_demo")
    .select("rep_id, rep_name")
    .in("rep_id", repIds);

  if (error) throw error;

  const rows = (data ?? []) as Array<{ rep_id: number; rep_name: string }>;
  const map = new Map<number, string>();
  for (const row of rows) {
    map.set(Number(row.rep_id), row.rep_name);
  }
  return map;
}

function aggregateReps(
  rows: SalesRow[],
  repNames: Map<number, string>,
  grandTotal: number,
): RepAggregate[] {
  const reps = new Map<number, { revenue: number; invoices: number; customers: Set<number> }>();

  for (const row of rows) {
    if (row.rep_id == null) continue;
    const entry =
      reps.get(row.rep_id) ?? {
        revenue: 0,
        invoices: 0,
        customers: new Set<number>(),
      };
    entry.revenue += row.invoice_amount ?? 0;
    entry.invoices += 1;
    entry.customers.add(row.customer_id);
    reps.set(row.rep_id, entry);
  }

  return Array.from(reps.entries())
    .map(([repId, info]) => {
      const revenue = Number(info.revenue.toFixed(2));
      const share = grandTotal
        ? Number(((info.revenue / grandTotal) * 100).toFixed(1))
        : 0;
      return {
        rep_id: repId,
        rep_name: repNames.get(repId) ?? `Rep ${repId}`,
        revenue,
        invoices: info.invoices,
        customer_count: info.customers.size,
        revenue_share: share,
      } satisfies RepAggregate;
    })
    .sort((a, b) => b.revenue - a.revenue);
}

function calculateGrowthRate(monthlyTotals: MonthlyTotal[]): number {
  if (monthlyTotals.length < 2) return 0;
  const sorted = [...monthlyTotals].sort((a, b) => a.month.localeCompare(b.month));
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  if (!prev.total) return 0;
  const delta = ((latest.total - prev.total) / prev.total) * 100;
  return Number(delta.toFixed(1));
}

function calculateActiveDealers(rows: SalesRow[], windowDays = 90): number {
  if (rows.length === 0) return 0;
  const latestTimestamp = rows.reduce(
    (max, row) => Math.max(max, Date.parse(row.invoice_date)),
    0,
  );
  const threshold = new Date(latestTimestamp);
  threshold.setDate(threshold.getDate() - windowDays);
  const thresholdISO = threshold.toISOString().slice(0, 10);

  const active = new Set<number>();
  for (const row of rows) {
    if (row.invoice_date >= thresholdISO) {
      active.add(row.customer_id);
    }
  }
  return active.size;
}

export async function fetchOrganizationSalesOverview({
  start,
  end,
}: {
  start?: string;
  end?: string;
} = {}): Promise<OrganizationSalesOverview> {
  const { start: yearStart, end: yearEnd } = await resolveReportingWindow(start, end);

  const rows = await fetchSalesRange({ start: yearStart, end: yearEnd });
  const grandTotal = calculateGrandTotal(rows);
  const invoiceCount = rows.length;
  const monthlyTotals = groupByMonth(rows);
  const growthRate = calculateGrowthRate(monthlyTotals);
  const activeDealers = calculateActiveDealers(rows);

  const uniqueCustomerIds = Array.from(new Set(rows.map((row) => row.customer_id)));
  const nameMap = await fetchCustomerNames(uniqueCustomerIds);

  const dealerAggregates = aggregateDealers(rows, nameMap, grandTotal);
  const collectionAggregates = aggregateCollections(rows, grandTotal);

  const repIds = Array.from(new Set(rows.map((row) => row.rep_id ?? undefined).filter((id): id is number => typeof id === "number")));
  const repNames = await fetchRepNames(repIds);
  const repAggregates = aggregateReps(rows, repNames, grandTotal);

  return {
    rows,
    monthlyTotals,
    grandTotal,
    invoiceCount,
    activeDealers,
    growthRate,
    dealerAggregates,
    collectionAggregates,
    repAggregates,
  };
}
