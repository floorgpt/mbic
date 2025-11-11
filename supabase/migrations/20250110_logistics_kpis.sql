-- Create logistics_kpis table for Operations Hub dashboard
-- Stores monthly logistics KPIs including sales, costs, inventory, and order metrics

CREATE TABLE IF NOT EXISTS logistics_kpis (
  id BIGSERIAL PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  sales NUMERIC(12, 2) NOT NULL DEFAULT 0,
  costs NUMERIC(12, 2) NOT NULL DEFAULT 0,
  gross_margin_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  inventory_turnover NUMERIC(5, 2) NOT NULL DEFAULT 0,
  avg_delivery_days INTEGER NOT NULL DEFAULT 0,
  delivered_orders INTEGER NOT NULL DEFAULT 0,
  in_progress_orders INTEGER NOT NULL DEFAULT 0,
  not_delivered_orders INTEGER NOT NULL DEFAULT 0,
  order_accuracy_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(month, year)
);

-- Create index for faster date-based queries
CREATE INDEX idx_logistics_kpis_date ON logistics_kpis(year DESC, month DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE logistics_kpis ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users"
  ON logistics_kpis
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed dummy data for Jan-Sept 2025
INSERT INTO logistics_kpis (month, year, sales, costs, gross_margin_pct, inventory_turnover, avg_delivery_days, delivered_orders, in_progress_orders, not_delivered_orders, order_accuracy_pct)
VALUES
  -- January 2025
  (1, 2025, 608900.00, 365340.00, 30.5, 2.8, 72, 145, 23, 8, 94.2),

  -- February 2025
  (2, 2025, 652100.00, 391260.00, 31.2, 3.1, 68, 158, 19, 6, 95.1),

  -- March 2025
  (3, 2025, 689450.00, 413670.00, 32.0, 3.3, 66, 172, 17, 5, 95.8),

  -- April 2025
  (4, 2025, 701200.00, 420720.00, 32.5, 3.4, 64, 180, 15, 4, 96.3),

  -- May 2025
  (5, 2025, 715800.00, 429480.00, 32.8, 3.5, 63, 188, 14, 3, 96.7),

  -- June 2025
  (6, 2025, 728600.00, 437160.00, 33.0, 3.6, 65, 195, 16, 4, 96.1),

  -- July 2025
  (7, 2025, 719300.00, 431580.00, 33.2, 3.5, 66, 189, 18, 5, 95.6),

  -- August 2025
  (8, 2025, 726900.00, 436140.00, 33.1, 3.5, 65, 192, 17, 4, 95.9),

  -- September 2025 (most recent - matches wireframe values)
  (9, 2025, 733284.00, 439367.00, 33.1, 3.5, 65, 198, 19, 5, 96.2);

-- Create RPC function to get current logistics KPIs (latest month)
CREATE OR REPLACE FUNCTION get_current_logistics_kpis()
RETURNS TABLE (
  month INTEGER,
  year INTEGER,
  sales NUMERIC,
  costs NUMERIC,
  gross_margin_pct NUMERIC,
  inventory_turnover NUMERIC,
  avg_delivery_days INTEGER,
  delivered_orders INTEGER,
  in_progress_orders INTEGER,
  not_delivered_orders INTEGER,
  order_accuracy_pct NUMERIC,
  sales_change_pct NUMERIC,
  costs_change_pct NUMERIC,
  margin_change_pct NUMERIC,
  turnover_change_pct NUMERIC,
  delivery_change_pct NUMERIC
) AS $$
DECLARE
  current_rec RECORD;
  previous_rec RECORD;
BEGIN
  -- Get the most recent month
  SELECT * INTO current_rec
  FROM logistics_kpis
  ORDER BY year DESC, month DESC
  LIMIT 1;

  -- Get the same month from previous year for comparison
  SELECT * INTO previous_rec
  FROM logistics_kpis
  WHERE year = current_rec.year - 1 AND month = current_rec.month
  LIMIT 1;

  -- If no previous year data, compare with previous month
  IF previous_rec IS NULL THEN
    SELECT * INTO previous_rec
    FROM logistics_kpis
    WHERE (year = current_rec.year AND month < current_rec.month)
       OR (year = current_rec.year - 1)
    ORDER BY year DESC, month DESC
    LIMIT 1;
  END IF;

  -- Calculate percentage changes
  RETURN QUERY
  SELECT
    current_rec.month,
    current_rec.year,
    current_rec.sales,
    current_rec.costs,
    current_rec.gross_margin_pct,
    current_rec.inventory_turnover,
    current_rec.avg_delivery_days,
    current_rec.delivered_orders,
    current_rec.in_progress_orders,
    current_rec.not_delivered_orders,
    current_rec.order_accuracy_pct,
    CASE WHEN previous_rec IS NOT NULL AND previous_rec.sales > 0
      THEN ((current_rec.sales - previous_rec.sales) / previous_rec.sales * 100)
      ELSE 0
    END AS sales_change_pct,
    CASE WHEN previous_rec IS NOT NULL AND previous_rec.costs > 0
      THEN ((current_rec.costs - previous_rec.costs) / previous_rec.costs * 100)
      ELSE 0
    END AS costs_change_pct,
    CASE WHEN previous_rec IS NOT NULL
      THEN (current_rec.gross_margin_pct - previous_rec.gross_margin_pct)
      ELSE 0
    END AS margin_change_pct,
    CASE WHEN previous_rec IS NOT NULL AND previous_rec.inventory_turnover > 0
      THEN ((current_rec.inventory_turnover - previous_rec.inventory_turnover) / previous_rec.inventory_turnover * 100)
      ELSE 0
    END AS turnover_change_pct,
    CASE WHEN previous_rec IS NOT NULL AND previous_rec.avg_delivery_days > 0
      THEN ((current_rec.avg_delivery_days - previous_rec.avg_delivery_days) / previous_rec.avg_delivery_days::NUMERIC * 100)
      ELSE 0
    END AS delivery_change_pct;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create RPC function to get all logistics KPIs for export
CREATE OR REPLACE FUNCTION get_all_logistics_kpis()
RETURNS TABLE (
  id BIGINT,
  month INTEGER,
  year INTEGER,
  sales NUMERIC,
  costs NUMERIC,
  gross_margin_pct NUMERIC,
  inventory_turnover NUMERIC,
  avg_delivery_days INTEGER,
  delivered_orders INTEGER,
  in_progress_orders INTEGER,
  not_delivered_orders INTEGER,
  order_accuracy_pct NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.month,
    k.year,
    k.sales,
    k.costs,
    k.gross_margin_pct,
    k.inventory_turnover,
    k.avg_delivery_days,
    k.delivered_orders,
    k.in_progress_orders,
    k.not_delivered_orders,
    k.order_accuracy_pct,
    k.created_at,
    k.updated_at
  FROM logistics_kpis k
  ORDER BY k.year DESC, k.month DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE logistics_kpis IS 'Stores monthly logistics KPIs for Operations Hub dashboard';
COMMENT ON FUNCTION get_current_logistics_kpis() IS 'Returns current month KPIs with year-over-year percentage changes';
COMMENT ON FUNCTION get_all_logistics_kpis() IS 'Returns all logistics KPIs data for export/download';
