-- Update list_future_sale_opps_open RPC to read from future_sale_opportunities
-- Instead of placeholder data from loss_opportunities
-- Date: 2025-01-11

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
  -- Return future sale opportunities that haven't been stock-confirmed yet
  -- Filtered by expected_close_date within the date range
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
    AND COALESCE(fso.expected_close_date, from_date) >= from_date
    AND COALESCE(fso.expected_close_date, to_date) <= to_date
  ORDER BY fso.expected_close_date ASC NULLS LAST, fso.created_at DESC
  LIMIT 100;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.list_future_sale_opps_open(date, date) TO authenticated, anon, service_role;

-- Add comment
COMMENT ON FUNCTION public.list_future_sale_opps_open IS 'Lists future sale opportunities that are unconfirmed by Operations team';
