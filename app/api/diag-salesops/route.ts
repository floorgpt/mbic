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
import type { SafeResult } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Runner = {
  label: string;
  run: (from: string, to: string) => Promise<SafeResult<unknown>>;
};

const RUNNERS: Runner[] = [
  { label: "sales_ops_category_kpis", run: getCategoryKpis as Runner["run"] },
  { label: "sales_ops_category_kpis_monthly", run: getCategoryKpisMonthly as Runner["run"] },
  { label: "sales_ops_fill_rate", run: getFillRate as Runner["run"] },
  { label: "sales_ops_import_lead_time", run: getImportLeadTime as Runner["run"] },
  { label: "sales_ops_forecast_accuracy", run: getForecastAccuracy as Runner["run"] },
  { label: "sales_ops_inventory_turnover", run: getInventoryTurnover as Runner["run"] },
  { label: "sales_ops_dealer_bounce_rate", run: getDealerBounce as Runner["run"] },
  { label: "ops_reports_made_by_month", run: getReportsByMonth as Runner["run"] },
  { label: "ops_comm_consistency_index", run: getCommConsistency as Runner["run"] },
  { label: "sales_ops_kpis_by_collection", run: getCollectionsLeaderboard as Runner["run"] },
  { label: "sales_ops_kpis_monthly_by_collection", run: getCollectionsMonthly as Runner["run"] },
  { label: "list_future_sale_opps_open", run: getFutureOppsOpen as Runner["run"] },
  { label: "list_incoming_stock_by_collection", run: getIncomingStockByCollection as Runner["run"] },
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "2025-01-01";
  const to = url.searchParams.get("to") ?? "2025-10-01";

  const results = [];

  for (const { label, run } of RUNNERS) {
    try {
      const res = await run(from, to);
      const meta = res._meta ?? { ok: false, count: 0 };
      const data = res.data;
      const count = Array.isArray(data) ? data.length : data ? 1 : 0;

      if (!meta.ok) {
        console.error("[salesops-diag]", label, meta);
      }

      results.push({
        label,
        ok: meta.ok,
        count,
        meta,
        sample: Array.isArray(data) ? data.slice(0, 1) : data ?? null,
      });
    } catch (error) {
      const message = (error as Error)?.message ?? String(error);
      console.error("[salesops-diag:exception]", label, message);
      results.push({
        label,
        ok: false,
        count: 0,
        meta: { ok: false, count: 0, err: message },
        sample: null,
      });
    }
  }

  return NextResponse.json({
    ok: results.every((panel) => panel.ok),
    from,
    to,
    results,
  });
}
