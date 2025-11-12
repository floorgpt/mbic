-- RPC Function: sales_by_zip_fl
-- Aggregates sales data by ZIP code for Florida dealers
-- Used for choropleth map visualization of geographic sales distribution

CREATE OR REPLACE FUNCTION public.sales_by_zip_fl(
  from_date DATE,
  to_date DATE,
  p_category TEXT DEFAULT NULL,
  p_collection TEXT DEFAULT NULL
)
RETURNS TABLE (
  zip_code TEXT,
  revenue NUMERIC,
  dealer_count INT,
  order_count INT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT
    LPAD(SUBSTRING(REGEXP_REPLACE(c.dealer_billing_address_postal_code, '\D', '', 'g') FROM 1 FOR 5), 5, '0') AS zip_code,
    COALESCE(SUM(s.invoice_amount), 0)::NUMERIC AS revenue,
    COUNT(DISTINCT s.customer_id)::INT AS dealer_count,
    COUNT(s.sale_id)::INT AS order_count
  FROM public.sales_demo s
  INNER JOIN public.customers_demo c
    ON c.customer_id = s.customer_id
  WHERE s.invoice_date >= from_date
    AND s.invoice_date < to_date
    AND c.dealer_billing_address_state = 'FL'
    AND c.dealer_billing_address_postal_code IS NOT NULL
    AND (p_category IS NULL OR s.category = p_category)
    AND (p_collection IS NULL OR s.collection = p_collection)
  GROUP BY LPAD(SUBSTRING(REGEXP_REPLACE(c.dealer_billing_address_postal_code, '\D', '', 'g') FROM 1 FOR 5), 5, '0')
  ORDER BY revenue DESC
$$;

-- Add function comments
COMMENT ON FUNCTION public.sales_by_zip_fl(DATE, DATE, TEXT, TEXT) IS
  'Aggregates sales by ZIP code for Florida dealers within a date range. Supports optional filtering by category and collection.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.sales_by_zip_fl(DATE, DATE, TEXT, TEXT) TO anon, authenticated, service_role;
