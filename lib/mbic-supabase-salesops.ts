"use server";

import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { tryServerSafe, type SafeResult } from "@/lib/utils";
import {
  type CategoryKpiRow,
  type CategoryKpiMonthlyRow,
  type CollectionDealerRow,
  type CollectionLeaderboardRow,
  type CollectionMonthlyRow,
  type CommConsistencyRow,
  type DealerBounceRow,
  type FillRateRow,
  type ForecastAccuracyRow,
  type FutureOpportunityRow,
  type ImportLeadTimeRow,
  type IncomingStockRow,
  type InventoryTurnoverRow,
  type ReportsByMonthRow,
} from "@/types/salesops";

type RpcParams = Record<string, unknown>;
type RawRow = Record<string, unknown>;

function pickValue<T = unknown>(row: RawRow, keys: string[], fallback?: T): T | undefined {
  for (const key of keys) {
    if (key in row) {
      const value = row[key];
      if (value !== undefined && value !== null && value !== "") {
        return value as T;
      }
    }
  }
  return fallback;
}

function readNumber(row: RawRow, keys: string[], fallback = 0): number {
  const value = pickValue(row, keys);
  if (value == null) return fallback;
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readString(row: RawRow, keys: string[], fallback = ""): string {
  const value = pickValue(row, keys);
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function readNullableString(row: RawRow, keys: string[]): string | null {
  const value = pickValue(row, keys);
  if (value == null) return null;
  const casted = typeof value === "string" ? value.trim() : String(value);
  return casted.length ? casted : null;
}

function readBoolean(row: RawRow, keys: string[], fallback = false): boolean {
  const value = pickValue(row, keys);
  if (value == null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "t" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "f" || normalized === "0") {
      return false;
    }
  }
  return fallback;
}

async function callRpc<TRow extends RawRow>(fn: string, params: RpcParams): Promise<TRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc(fn as never, params as never);
  if (error) {
    throw new Error(`${fn} failed: ${error.message ?? "Unknown error"}`);
  }
  if (!data) return [];
  if (Array.isArray(data)) {
    return data as TRow[];
  }
  return [data as TRow];
}

function mapCategoryRow(row: RawRow): CategoryKpiRow {
  return {
    category_key: readString(row, ["category_key", "category"]),
    gross_revenue: readNumber(row, ["gross_revenue", "revenue"]),
    avg_price: readNumber(row, ["avg_price", "average_price"]),
    avg_cogs: readNumber(row, ["avg_cogs", "average_cogs", "cogs"]),
    gross_margin: readNumber(row, ["gross_margin", "margin_pct", "margin_percent"]),
    gross_profit: readNumber(row, ["gross_profit", "profit"]),
  };
}

function mapCategoryMonthlyRow(row: RawRow): CategoryKpiMonthlyRow {
  return {
    ...mapCategoryRow(row),
    bucket_month: readString(row, ["bucket_month", "report_month", "month"]),
  };
}

function mapFillRateRow(row: RawRow): FillRateRow {
  return {
    fill_rate: readNumber(row, ["fill_rate", "pct", "percentage"]),
  };
}

function mapImportLeadTimeRow(row: RawRow): ImportLeadTimeRow {
  return {
    avg_days: readNumber(row, ["avg_days", "average_days", "lead_time_days"]),
  };
}

function mapForecastAccuracyRow(row: RawRow): ForecastAccuracyRow {
  return {
    accuracy_pct: readNumber(row, ["accuracy_pct", "forecast_accuracy", "pct"]),
  };
}

function mapInventoryTurnoverRow(row: RawRow): InventoryTurnoverRow {
  return {
    itr: readNumber(row, ["itr", "inventory_turnover"]),
  };
}

function mapDealerBounceRow(row: RawRow): DealerBounceRow {
  return {
    bounce_pct: readNumber(row, ["bounce_pct", "dealer_bounce_rate", "pct"]),
  };
}

function mapReportsByMonthRow(row: RawRow): ReportsByMonthRow {
  return {
    report_month: readString(row, ["report_month", "bucket_month", "month"]),
    count: readNumber(row, ["count", "reports"]),
  };
}

function mapCommConsistencyRow(row: RawRow): CommConsistencyRow {
  return {
    consistency_pct: readNumber(row, ["consistency_pct", "pct", "consistency_index"]),
  };
}

function mapCollectionLeaderboardRow(row: RawRow): CollectionLeaderboardRow {
  return {
    collection: readString(row, ["collection", "collection_name", "collection_key"]),
    gross_revenue: readNumber(row, ["gross_revenue", "revenue"]),
    gross_profit: readNumber(row, ["gross_profit", "profit"]),
    gross_margin: readNumber(row, ["gross_margin", "margin_pct", "margin_percent"]),
    avg_price: readNumber(row, ["avg_price", "average_price"]),
    avg_cogs: readNumber(row, ["avg_cogs", "average_cogs", "cogs"]),
  };
}

function mapCollectionMonthlyRow(row: RawRow): CollectionMonthlyRow {
  return {
    ...mapCollectionLeaderboardRow(row),
    bucket_month: readString(row, ["bucket_month", "report_month", "month"]),
  };
}

function mapCollectionDealerRow(row: RawRow): CollectionDealerRow {
  return {
    dealer: readString(row, ["dealer", "dealer_name"]),
    revenue: readNumber(row, ["revenue", "gross_revenue"]),
    avg_price: readNumber(row, ["avg_price", "average_price"]),
    avg_cogs: readNumber(row, ["avg_cogs", "average_cogs", "cogs"]),
    gross_margin: readNumber(row, ["gross_margin", "margin_pct", "margin_percent"]),
    gross_profit: readNumber(row, ["gross_profit", "profit"]),
  };
}

function mapFutureOpportunityRow(row: RawRow): FutureOpportunityRow {
  return {
    project_name: readString(row, ["project_name", "project"]),
    expected_sku: readString(row, ["expected_sku", "sku"]),
    expected_qty: readNumber(row, ["expected_qty", "qty", "quantity"]),
    expected_close_date: readNullableString(row, ["expected_close_date", "close_date"]),
    dealer: readString(row, ["dealer", "dealer_name"]),
    rep: readString(row, ["rep", "rep_name"]),
    ops_stock_confirmed: readBoolean(row, ["ops_stock_confirmed", "stock_confirmed", "is_confirmed"], false),
  };
}

function mapIncomingStockRow(row: RawRow): IncomingStockRow {
  return {
    collection: readString(row, ["collection", "collection_name"]),
    sku: readString(row, ["sku", "product_sku"]),
    qty: readNumber(row, ["qty", "quantity"]),
    eta_date: readNullableString(row, ["eta_date", "eta"]),
    received_at: readNullableString(row, ["received_at", "arrived_at"]),
  };
}

function mapSafeResult<TRow>(
  safe: SafeResult<RawRow[]>,
  mapper: (row: RawRow) => TRow,
): SafeResult<TRow[]> {
  const mapped = (safe.data ?? []).map(mapper);
  return {
    data: mapped,
    _meta: {
      ...safe._meta,
      count: mapped.length,
    },
  };
}

export async function getCategoryKpis(from: string, to: string): Promise<SafeResult<CategoryKpiRow[]>> {
  const safe = await tryServerSafe(
    callRpc<RawRow>("sales_ops_category_kpis", { from, to }),
    "sales_ops_category_kpis",
    [],
  );
  return mapSafeResult(safe, mapCategoryRow);
}

export async function getCategoryKpisMonthly(from: string, to: string): Promise<SafeResult<CategoryKpiMonthlyRow[]>> {
  const safe = await tryServerSafe(
    callRpc<RawRow>("sales_ops_category_kpis_monthly", { from, to }),
    "sales_ops_category_kpis_monthly",
    [],
  );
  return mapSafeResult(safe, mapCategoryMonthlyRow);
}

export async function getFillRate(from: string, to: string): Promise<SafeResult<FillRateRow[]>> {
  const safe = await tryServerSafe(
    callRpc<RawRow>("sales_ops_fill_rate", { from, to }),
    "sales_ops_fill_rate",
    [],
  );
  return mapSafeResult(safe, mapFillRateRow);
}

export async function getImportLeadTime(from: string, to: string): Promise<SafeResult<ImportLeadTimeRow[]>> {
  const safe = await tryServerSafe(
    callRpc<RawRow>("sales_ops_import_lead_time", { from, to }),
    "sales_ops_import_lead_time",
    [],
  );
  return mapSafeResult(safe, mapImportLeadTimeRow);
}

export async function getForecastAccuracy(from: string, to: string): Promise<SafeResult<ForecastAccuracyRow[]>> {
  const safe = await tryServerSafe(
    callRpc<RawRow>("sales_ops_forecast_accuracy", { from, to }),
    "sales_ops_forecast_accuracy",
    [],
  );
  return mapSafeResult(safe, mapForecastAccuracyRow);
}

export async function getInventoryTurnover(from: string, to: string): Promise<SafeResult<InventoryTurnoverRow[]>> {
  const safe = await tryServerSafe(
    callRpc<RawRow>("sales_ops_inventory_turnover", { from, to }),
    "sales_ops_inventory_turnover",
    [],
  );
  return mapSafeResult(safe, mapInventoryTurnoverRow);
}

export async function getDealerBounce(from: string, to: string): Promise<SafeResult<DealerBounceRow[]>> {
  const safe = await tryServerSafe(
    callRpc<RawRow>("sales_ops_dealer_bounce_rate", { from, to }),
    "sales_ops_dealer_bounce_rate",
    [],
  );
  return mapSafeResult(safe, mapDealerBounceRow);
}

export async function getReportsByMonth(from: string, to: string): Promise<SafeResult<ReportsByMonthRow[]>> {
  const safe = await tryServerSafe(
    callRpc<RawRow>("ops_reports_made_by_month", { from, to }),
    "ops_reports_made_by_month",
    [],
  );
  return mapSafeResult(safe, mapReportsByMonthRow);
}

export async function getCommConsistency(from: string, to: string): Promise<SafeResult<CommConsistencyRow[]>> {
  const safe = await tryServerSafe(
    callRpc<RawRow>("ops_comm_consistency_index", { from, to }),
    "ops_comm_consistency_index",
    [],
  );
  return mapSafeResult(safe, mapCommConsistencyRow);
}

export async function getCollectionsLeaderboard(from: string, to: string): Promise<SafeResult<CollectionLeaderboardRow[]>> {
  const safe = await tryServerSafe(
    callRpc<RawRow>("sales_ops_kpis_by_collection", { from, to }),
    "sales_ops_kpis_by_collection",
    [],
  );
  return mapSafeResult(safe, mapCollectionLeaderboardRow);
}

export async function getCollectionsMonthly(from: string, to: string): Promise<SafeResult<CollectionMonthlyRow[]>> {
  const safe = await tryServerSafe(
    callRpc<RawRow>("sales_ops_kpis_monthly_by_collection", { from, to }),
    "sales_ops_kpis_monthly_by_collection",
    [],
  );
  return mapSafeResult(safe, mapCollectionMonthlyRow);
}

export async function getCollectionByDealer(
  collection: string,
  from: string,
  to: string,
): Promise<SafeResult<CollectionDealerRow[]>> {
  const safe = await tryServerSafe(
    callRpc<RawRow>("sales_ops_collections_by_dealer", { p_collection: collection, from, to }),
    "sales_ops_collections_by_dealer",
    [],
  );
  return mapSafeResult(safe, mapCollectionDealerRow);
}

export async function getFutureOppsOpen(from: string, to: string): Promise<SafeResult<FutureOpportunityRow[]>> {
  const safe = await tryServerSafe(
    callRpc<RawRow>("list_future_sale_opps_open", { from, to }),
    "list_future_sale_opps_open",
    [],
  );
  return mapSafeResult(safe, mapFutureOpportunityRow);
}

export async function getIncomingStockByCollection(from: string, to: string): Promise<SafeResult<IncomingStockRow[]>> {
  const safe = await tryServerSafe(
    callRpc<RawRow>("list_incoming_stock_by_collection", { from, to }),
    "list_incoming_stock_by_collection",
    [],
  );
  return mapSafeResult(safe, mapIncomingStockRow);
}
