import { cache } from "react";

import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  CustomersDemoRow,
  SalesDemoRow,
  SalesRepRow,
} from "@/types/database";

type DealerSales = {
  dealer_name: string;
  total_sales: number;
};

type MonthlyDealerAverage = {
  dealer_name: string;
  month: string;
  total_sales: number;
  monthly_avg_invoice: number;
};

type CollectionSales = {
  collection: string;
  total_sales: number;
};

type ActiveCustomers = {
  rep_name: string;
  active_customers: number;
};

type DealerInvoiceBreakdown = {
  dealer_name: string;
  invoice_total: number;
  invoice_count: number;
};

type SalesRepPerformance = {
  rep_id: number;
  rep_name: string;
  total_sales: number;
  invoice_count: number;
  customer_count: number;
};

type SalesDataset = {
  sales: SalesDemoRow[];
  customers: CustomersDemoRow[];
  reps: SalesRepRow[];
};

const fetchDataset = cache(async (): Promise<SalesDataset> => {
  const supabase = getSupabaseClient();
  const [salesResult, customersResult, repsResult] = await Promise.all([
    supabase
      .from("sales_demo")
      .select("customer_id, rep_id, invoice_amount, invoice_date, collection"),
    supabase.from("customers_demo").select("customer_id, dealer_name, rep_id"),
    supabase.from("sales_reps_demo").select("rep_id, rep_name, email, rep_phone"),
  ]);

  if (salesResult.error) {
    throw salesResult.error;
  }
  if (customersResult.error) {
    throw customersResult.error;
  }
  if (repsResult.error) {
    throw repsResult.error;
  }

  return {
    sales: salesResult.data ?? [],
    customers: customersResult.data ?? [],
    reps: repsResult.data ?? [],
  };
});

export async function fetchTotalSalesPerDealer(): Promise<DealerSales[]> {
  const { sales, customers } = await fetchDataset();
  const customerMap = new Map(
    customers.map((customer) => [customer.customer_id, customer.dealer_name]),
  );

  const totals = new Map<string, number>();

  for (const sale of sales) {
    const dealerName = customerMap.get(sale.customer_id) ?? "Unknown Dealer";
    const current = totals.get(dealerName) ?? 0;
    totals.set(dealerName, current + sale.invoice_amount);
  }

  return Array.from(totals.entries())
    .map(([dealer_name, total_sales]) => ({
      dealer_name,
      total_sales,
    }))
    .sort((a, b) => b.total_sales - a.total_sales);
}

export async function fetchMonthlyAveragesPerDealer(): Promise<
  MonthlyDealerAverage[]
> {
  const { sales, customers } = await fetchDataset();
  const customerMap = new Map(
    customers.map((customer) => [customer.customer_id, customer.dealer_name]),
  );

  type Aggregate = {
    total: number;
    count: number;
  };

  const aggregates = new Map<string, Aggregate>();

  for (const sale of sales) {
    const dealerName = customerMap.get(sale.customer_id) ?? "Unknown Dealer";
    const month = new Date(sale.invoice_date).toISOString().slice(0, 7);
    const key = `${dealerName}__${month}`;
    const current = aggregates.get(key) ?? { total: 0, count: 0 };

    aggregates.set(key, {
      total: current.total + sale.invoice_amount,
      count: current.count + 1,
    });
  }

  return Array.from(aggregates.entries()).map(([key, aggregate]) => {
    const [dealer_name, month] = key.split("__");
    const monthly_avg_invoice =
      aggregate.count === 0 ? 0 : aggregate.total / aggregate.count;

    return {
      dealer_name,
      month,
      total_sales: aggregate.total,
      monthly_avg_invoice: Number(monthly_avg_invoice.toFixed(2)),
    };
  });
}

export async function fetchTopDealers(limit = 3): Promise<DealerSales[]> {
  const totals = await fetchTotalSalesPerDealer();
  return totals.slice(0, limit);
}

export async function fetchTopRepsByRevenue(limit = 10): Promise<
  SalesRepPerformance[]
> {
  const { sales, reps, customers } = await fetchDataset();
  const repMap = new Map<number, SalesRepRow>();
  reps.forEach((rep) => repMap.set(rep.rep_id, rep));

  const customersByRep = new Map<number, Set<number>>();
  const aggregate = new Map<
    number,
    { total: number; invoices: number; customers: Set<number> }
  >();

  for (const customer of customers) {
    if (customer.rep_id) {
      if (!customersByRep.has(customer.rep_id)) {
        customersByRep.set(customer.rep_id, new Set());
      }
      customersByRep.get(customer.rep_id)!.add(customer.customer_id);
    }
  }

  for (const sale of sales) {
    if (!sale.rep_id) continue;
    const current = aggregate.get(sale.rep_id) ?? {
      total: 0,
      invoices: 0,
      customers: new Set<number>(),
    };
    current.total += sale.invoice_amount;
    current.invoices += 1;
    current.customers.add(sale.customer_id);
    aggregate.set(sale.rep_id, current);
  }

  const results: SalesRepPerformance[] = [];

  aggregate.forEach((value, repId) => {
    const rep = repMap.get(repId);
    if (!rep) return;
    const assignedCustomers = customersByRep.get(repId)?.size ?? 0;
    results.push({
      rep_id: repId,
      rep_name: rep.rep_name,
      total_sales: value.total,
      invoice_count: value.invoices,
      customer_count: Math.max(value.customers.size, assignedCustomers),
    });
  });

  return results
    .sort((a, b) => b.total_sales - a.total_sales)
    .slice(0, limit);
}

export async function fetchTopCollections(limit = 5): Promise<
  CollectionSales[]
> {
  const { sales } = await fetchDataset();
  const totals = new Map<string, number>();

  for (const sale of sales) {
    if (!sale.collection) continue;
    const current = totals.get(sale.collection) ?? 0;
    totals.set(sale.collection, current + sale.invoice_amount);
  }

  return Array.from(totals.entries())
    .map(([collection, total_sales]) => ({
      collection,
      total_sales,
    }))
    .sort((a, b) => b.total_sales - a.total_sales)
    .slice(0, limit);
}

export async function fetchActiveCustomersByRep(
  repName: string,
): Promise<ActiveCustomers> {
  const { sales, reps } = await fetchDataset();
  const rep = reps.find(
    (candidate) =>
      candidate.rep_name.trim().toLowerCase() === repName.trim().toLowerCase(),
  );

  if (!rep) {
    return { rep_name: repName, active_customers: 0 };
  }

  const customers = new Set<number>();

  for (const sale of sales) {
    if (sale.rep_id === rep.rep_id) {
      customers.add(sale.customer_id);
    }
  }

  return { rep_name: rep.rep_name, active_customers: customers.size };
}

export async function fetchDealerBreakdownByRep(
  repName: string,
): Promise<DealerInvoiceBreakdown[]> {
  const { sales, customers, reps } = await fetchDataset();
  const rep = reps.find(
    (candidate) =>
      candidate.rep_name.trim().toLowerCase() === repName.trim().toLowerCase(),
  );

  if (!rep) return [];

  const customerMap = new Map(
    customers.map((customer) => [customer.customer_id, customer.dealer_name]),
  );

  const aggregate = new Map<
    string,
    { invoice_total: number; invoice_count: number }
  >();

  for (const sale of sales) {
    if (sale.rep_id !== rep.rep_id) continue;
    const dealerName = customerMap.get(sale.customer_id) ?? "Unknown Dealer";
    const current = aggregate.get(dealerName) ?? {
      invoice_total: 0,
      invoice_count: 0,
    };

    aggregate.set(dealerName, {
      invoice_total: current.invoice_total + sale.invoice_amount,
      invoice_count: current.invoice_count + 1,
    });
  }

  return Array.from(aggregate.entries())
    .map(([dealer_name, value]) => ({
      dealer_name,
      ...value,
    }))
    .sort((a, b) => b.invoice_total - a.invoice_total);
}

export async function fetchSalesReps(): Promise<SalesRepRow[]> {
  const { reps } = await fetchDataset();
  return reps.sort((a, b) => a.rep_name.localeCompare(b.rep_name));
}

export async function fetchRepSalesTrend(repName: string) {
  const { sales, reps } = await fetchDataset();
  const rep = reps.find(
    (candidate) =>
      candidate.rep_name.trim().toLowerCase() === repName.trim().toLowerCase(),
  );

  if (!rep) return [];

  const trendMap = new Map<string, number>();

  for (const sale of sales) {
    if (sale.rep_id !== rep.rep_id) continue;
    const month = new Date(sale.invoice_date).toISOString().slice(0, 7);
    const current = trendMap.get(month) ?? 0;
    trendMap.set(month, current + sale.invoice_amount);
  }

  return Array.from(trendMap.entries())
    .map(([month, total_sales]) => ({ month, total_sales }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function fetchDealerSalesTrend(
  repName: string,
  dealerName: string,
) {
  const { sales, reps, customers } = await fetchDataset();
  const rep = reps.find(
    (candidate) =>
      candidate.rep_name.trim().toLowerCase() === repName.trim().toLowerCase(),
  );

  if (!rep) return [];

  const dealer = customers.find(
    (customer) =>
      customer.dealer_name.trim().toLowerCase() ===
      dealerName.trim().toLowerCase(),
  );

  if (!dealer) return [];

  const trendMap = new Map<string, number>();

  for (const sale of sales) {
    if (sale.rep_id !== rep.rep_id) continue;
    if (sale.customer_id !== dealer.customer_id) continue;
    const month = new Date(sale.invoice_date).toISOString().slice(0, 7);
    const current = trendMap.get(month) ?? 0;
    trendMap.set(month, current + sale.invoice_amount);
  }

  return Array.from(trendMap.entries())
    .map(([month, total_sales]) => ({ month, total_sales }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function fetchRevenueTrend() {
  const { sales } = await fetchDataset();

  const trendMap = new Map<string, number>();

  for (const sale of sales) {
    const month = new Date(sale.invoice_date).toISOString().slice(0, 7);
    const current = trendMap.get(month) ?? 0;
    trendMap.set(month, current + sale.invoice_amount);
  }

  return Array.from(trendMap.entries())
    .map(([month, total_sales]) => ({ month, total_sales }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function fetchRevenueSummary() {
  const dealerTotals = await fetchTotalSalesPerDealer();
  const totalRevenue = dealerTotals.reduce(
    (acc, item) => acc + item.total_sales,
    0,
  );
  const activeDealers = dealerTotals.length;

  const trend = await fetchRevenueTrend();
  const sortedTrend = trend.sort((a, b) => a.month.localeCompare(b.month));
  const lastIndex = sortedTrend.length - 1;
  const last = sortedTrend[lastIndex];
  const prev = sortedTrend[lastIndex - 1];

  const growthRate =
    last && prev
      ? ((last.total_sales - prev.total_sales) / prev.total_sales) * 100
      : 0;

  return {
    totalRevenue,
    activeDealers,
    growthRate: Number(growthRate.toFixed(2)),
  };
}
