-- RPC Function: list_loss_opportunities
-- Returns loss opportunities submitted by sales reps
-- Used for Sales Ops dashboard to track lost sales
-- Date: 2025-01-12

DROP FUNCTION IF EXISTS public.list_loss_opportunities(date, date) CASCADE;

CREATE FUNCTION public.list_loss_opportunities(
  from_date DATE,
  to_date DATE
)
RETURNS TABLE (
  id INTEGER,
  dealer TEXT,
  dealer_id INTEGER,
  rep TEXT,
  rep_id INTEGER,
  category_key TEXT,
  collection_key TEXT,
  color_name TEXT,
  expected_sku TEXT,
  requested_qty NUMERIC,
  target_price NUMERIC,
  potential_amount NUMERIC,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT
    lo.id,
    COALESCE(c.dealer_name, 'Unknown') AS dealer,
    lo.dealer_id,
    COALESCE(r.rep_name, 'Unknown') AS rep,
    lo.rep_id,
    lo.category_key,
    lo.collection AS collection_key,
    lo.color AS color_name,
    lo.expected_sku,
    lo.requested_qty,
    lo.target_price,
    lo.potential_amount,
    lo.lost_reason AS reason,
    lo.notes,
    lo.created_at
  FROM public.loss_opportunities lo
  LEFT JOIN public.customers_demo c ON c.customer_id = lo.dealer_id
  LEFT JOIN public.sales_reps_demo r ON r.rep_id = lo.rep_id
  WHERE lo.created_at >= from_date::TIMESTAMP
    AND lo.created_at < (to_date + INTERVAL '1 day')::TIMESTAMP
  ORDER BY lo.created_at DESC
  LIMIT 100;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.list_loss_opportunities(date, date) TO authenticated, anon, service_role;

-- Add comment
COMMENT ON FUNCTION public.list_loss_opportunities IS 'Lists loss opportunities submitted by sales reps within a date range. Includes dealer and rep information via LEFT JOIN.';
