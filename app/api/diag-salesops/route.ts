import { NextResponse } from "next/server";

import {
  getCategoryKpis,
  getCategoryKpisMonthly,
  getCollectionsLeaderboard,
  getCollectionsMonthly,
  getCommConsistency,
  getDealerBounce,
  getFillRate,
  getForecastAccuracy,
  getFutureOppsOpen,
  getImportLeadTime,
  getIncomingStockByCollection,
  getInventoryTurnover,
  getReportsByMonth,
} from "@/lib/mbic-supabase-salesops";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PanelResult = {
  label: string;
  ok: boolean;
  count: number;
  err?: string;
};

type SafeAwaited<T> = Awaited<T> extends { data: infer Data; _meta: infer Meta }
  ? { data: Data; meta: Meta }
  : never;

async function probeSafe<T extends Promise<{ data: unknown; _meta: { ok: boolean; count: number; err?: string } }>>(
  label: string,
  promise: T,
): Promise<PanelResult & SafeAwaited<T>> {
  try {
    const result = await promise;
    return {
      label,
      ok: result._meta.ok,
      count: result._meta.count,
      err: result._meta.err,
      data: result.data,
      meta: result._meta,
    };
  } catch (error) {
    return {
      label,
      ok: false,
      count: 0,
      err: (error as Error)?.message ?? String(error),
      data: [],
      meta: { ok: false, count: 0, err: (error as Error)?.message ?? String(error) },
    } as PanelResult & SafeAwaited<T>;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "2025-01-01";
  const to = url.searchParams.get("to") ?? "2025-10-01";

  const panels = await Promise.all([
    probeSafe("sales_ops_category_kpis", getCategoryKpis(from, to)),
    probeSafe("sales_ops_category_kpis_monthly", getCategoryKpisMonthly(from, to)),
    probeSafe("sales_ops_fill_rate", getFillRate(from, to)),
    probeSafe("sales_ops_import_lead_time", getImportLeadTime(from, to)),
    probeSafe("sales_ops_forecast_accuracy", getForecastAccuracy(from, to)),
    probeSafe("sales_ops_inventory_turnover", getInventoryTurnover(from, to)),
    probeSafe("sales_ops_dealer_bounce_rate", getDealerBounce(from, to)),
    probeSafe("ops_reports_made_by_month", getReportsByMonth(from, to)),
    probeSafe("ops_comm_consistency_index", getCommConsistency(from, to)),
    probeSafe("sales_ops_kpis_by_collection", getCollectionsLeaderboard(from, to)),
    probeSafe("sales_ops_kpis_monthly_by_collection", getCollectionsMonthly(from, to)),
    probeSafe("list_future_sale_opps_open", getFutureOppsOpen(from, to)),
    probeSafe("list_incoming_stock_by_collection", getIncomingStockByCollection(from, to)),
  ]);

  const summary = panels.map(({ label, ok, count, err }) => ({ label, ok, count, err }));

  return NextResponse.json({
    ok: summary.every((panel) => panel.ok),
    from,
    to,
    panels,
    summary,
  });
}
