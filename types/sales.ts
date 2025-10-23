export type SalesRow = {
  invoice_date: string; // ISO date (YYYY-MM-DD)
  invoice_amount: number;
  customer_id: number;
  rep_id: number | null;
  invoice_number: string | null;
  collection: string | null;
};

export type MonthlyTotal = {
  month: string; // YYYY-MM
  total: number;
  rows: number;
};
