export type CategoryKpiRow = {
  category_key: string;
  gross_revenue: number;
  avg_price: number;
  avg_cogs: number;
  gross_margin: number;
  gross_profit: number;
};

export type CategoryKpiMonthlyRow = CategoryKpiRow & {
  bucket_month: string;
};

export type FillRateRow = {
  fill_rate: number;
};

export type ImportLeadTimeRow = {
  avg_days: number;
};

export type ForecastAccuracyRow = {
  accuracy_pct: number;
};

export type InventoryTurnoverRow = {
  itr: number;
};

export type DealerBounceRow = {
  bounce_pct: number;
};

export type ReportsByMonthRow = {
  report_month: string;
  count: number;
};

export type CommConsistencyRow = {
  consistency_pct: number;
};

export type CollectionLeaderboardRow = {
  collection: string;
  gross_revenue: number;
  gross_profit: number;
  gross_margin: number;
  avg_price: number;
  avg_cogs: number;
};

export type CollectionMonthlyRow = CollectionLeaderboardRow & {
  bucket_month: string;
};

export type CollectionDealerRow = {
  dealer: string;
  revenue: number;
  avg_price: number;
  avg_cogs: number;
  gross_margin: number;
  gross_profit: number;
};

export type FutureOpportunityRow = {
  project_name: string;
  expected_sku: string;
  expected_qty: number;
  expected_close_date: string | null;
  dealer: string;
  rep: string;
  ops_stock_confirmed: boolean | null;
};

export type IncomingStockRow = {
  collection: string;
  sku: string;
  qty: number;
  eta_date: string | null;
  received_at: string | null;
};
