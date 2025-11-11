// Types for Operations Hub

export type FutureSaleStatus = "open" | "in_process" | "closed";

// Detailed future sale opportunity with all fields
export type FutureSaleOpportunityDetail = {
  id: number;
  project_name: string;
  dealer_id: number;
  dealer_name: string;
  rep_id: number;
  rep_name: string;
  expected_qty: number;
  expected_unit_price: number | null;
  potential_amount: number;
  probability_pct: number;
  expected_close_date: string | null;
  needed_by_date: string | null;
  expected_sku: string | null;
  // Parsed from expected_sku (format: "collection:color")
  collection: string;
  color: string;
  status: FutureSaleStatus;
  ops_stock_confirmed: boolean;
  ops_confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// Update payload for future sale opportunity
export type FutureSaleUpdatePayload = {
  status?: FutureSaleStatus;
  notes?: string | null;
  expected_qty?: number;
  expected_unit_price?: number | null;
  probability_pct?: number;
  expected_close_date?: string | null;
  needed_by_date?: string | null;
  ops_stock_confirmed?: boolean;
  ops_confirmed_at?: string | null;
};

// Response from future sales API
export type FutureSalesListResponse = {
  ok: boolean;
  data: FutureSaleOpportunityDetail[];
  count: number;
  err?: string | null;
};

export type FutureSaleDetailResponse = {
  ok: boolean;
  data: FutureSaleOpportunityDetail | null;
  err?: string | null;
};

export type FutureSaleUpdateResponse = {
  ok: boolean;
  data: FutureSaleOpportunityDetail | null;
  err?: string | null;
};

export type ConfirmStockResponse = {
  ok: boolean;
  data: FutureSaleOpportunityDetail | null;
  webhook?: {
    ok: boolean;
    err?: string | null;
  };
  err?: string | null;
};

// Incoming stock types
export type IncomingStockStatus = "pending" | "in_transit" | "arrived" | "delayed";

export type IncomingStockRow = {
  id: number;
  master_category: string | null;
  category: string | null;
  collection: string;
  color: string | null;
  sku: string | null;
  quantity: number;
  rate: number | null;
  stock_value: number | null;
  incoming_from: string | null;
  destination_port: string | null;
  eta_status: IncomingStockStatus;
  eta_arrival_date: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type IncomingStockInsert = {
  master_category?: string | null;
  category?: string | null;
  collection: string;
  color?: string | null;
  sku?: string | null;
  quantity: number;
  rate?: number | null;
  stock_value?: number | null;
  incoming_from?: string | null;
  destination_port?: string | null;
  eta_status?: IncomingStockStatus;
  eta_arrival_date?: string | null;
  received_at?: string | null;
  notes?: string | null;
  created_by?: string | null;
};

export type IncomingStockListResponse = {
  ok: boolean;
  data: IncomingStockRow[];
  count: number;
  err?: string | null;
};
