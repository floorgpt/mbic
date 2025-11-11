-- Update list_future_sale_opps_open RPC to show ALL unconfirmed opportunities
-- The date range filter should not exclude future opportunities
-- This is for the "Future Sale Opportunities (Unconfirmed)" card
-- Date: 2025-01-11 (v2)

DROP FUNCTION IF EXISTS public.list_future_sale_opps_open(date, date) CASCADE;

CREATE FUNCTION public.list_future_sale_opps_open(
  from_date DATE,
  to_date DATE
)
RETURNS TABLE (
  id INTEGER,
  project_name TEXT,
  dealer TEXT,
  dealer_id INTEGER,
  expected_sku TEXT,
  expected_qty NUMERIC,
  expected_unit_price NUMERIC,
  potential_amount NUMERIC,
  probability_pct NUMERIC,
  expected_close_date TEXT,
  needed_by_date TEXT,
  rep TEXT,
  rep_id INTEGER,
  status TEXT,
  ops_stock_confirmed BOOLEAN,
  ops_confirmed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  -- Return ALL future sale opportunities that haven't been stock-confirmed yet
  -- Date range parameters are kept for API compatibility but not used for filtering
  -- This shows opportunities regardless of their expected_close_date
  SELECT
    fso.id,
    fso.project_name,
    c.dealer_name AS dealer,
    fso.dealer_id,
    COALESCE(fso.expected_sku, 'TBD') AS expected_sku,
    fso.expected_qty,
    fso.expected_unit_price,
    (fso.expected_qty * COALESCE(fso.expected_unit_price, 0)) AS potential_amount,
    fso.probability_pct,
    fso.expected_close_date::TEXT,
    fso.needed_by_date::TEXT,
    r.rep_name AS rep,
    fso.rep_id,
    COALESCE(fso.status, 'open') AS status,
    COALESCE(fso.ops_stock_confirmed, FALSE) AS ops_stock_confirmed,
    fso.ops_confirmed_at,
    fso.notes,
    fso.created_at
  FROM public.future_sale_opportunities fso
  JOIN public.customers_demo c ON c.customer_id = fso.dealer_id
  JOIN public.sales_reps_demo r ON r.rep_id = fso.rep_id
  WHERE fso.ops_stock_confirmed = FALSE
  ORDER BY fso.expected_close_date ASC NULLS LAST, fso.created_at DESC
  LIMIT 100;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.list_future_sale_opps_open(date, date) TO authenticated, anon, service_role;

-- Add comment
COMMENT ON FUNCTION public.list_future_sale_opps_open IS 'Lists ALL future sale opportunities that are unconfirmed by Operations team, regardless of expected close date';
