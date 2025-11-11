/**
 * Types for Operations Hub Logistics Dashboard
 */

export type LogisticsKPI = {
  id: number;
  month: number;
  year: number;
  sales: number;
  costs: number;
  gross_margin_pct: number;
  inventory_turnover: number;
  avg_delivery_days: number;
  delivered_orders: number;
  in_progress_orders: number;
  not_delivered_orders: number;
  order_accuracy_pct: number;
  created_at: string;
  updated_at: string;
};

export type LogisticsKPIWithChanges = {
  month: number;
  year: number;
  sales: number;
  costs: number;
  gross_margin_pct: number;
  inventory_turnover: number;
  avg_delivery_days: number;
  delivered_orders: number;
  in_progress_orders: number;
  not_delivered_orders: number;
  order_accuracy_pct: number;
  sales_change_pct: number;
  costs_change_pct: number;
  margin_change_pct: number;
  turnover_change_pct: number;
  delivery_change_pct: number;
};

export type OrdersByStatus = {
  delivered: number;
  in_progress: number;
  not_delivered: number;
};

export type OrderAccuracyData = {
  month: string;
  year: number;
  accuracy_pct: number;
};

export type LogisticsResponse = {
  ok: boolean;
  data: LogisticsKPIWithChanges | null;
  orders_by_status: OrdersByStatus | null;
  order_accuracy_trend: OrderAccuracyData[];
  err?: string;
};

export type LogisticsExportResponse = {
  ok: boolean;
  data: LogisticsKPI[];
  count: number;
  err?: string;
};

export type FutureSalesTotals = {
  total_sqft: number;
  revenue_at_risk: number;
  count: number;
};
