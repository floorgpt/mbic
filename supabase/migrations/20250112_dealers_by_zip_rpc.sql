-- RPC Function: dealers_by_zip
-- Returns dealers in a specific ZIP code with their sales data
-- Used for ZIP code drill-down from map visualization

-- Drop existing function first (if it exists)
DROP FUNCTION IF EXISTS public.dealers_by_zip(TEXT, DATE, DATE);

CREATE OR REPLACE FUNCTION public.dealers_by_zip(
  p_zip_code TEXT,
  from_date DATE,
  to_date DATE
)
RETURNS TABLE (
  customer_id INT,
  dealer_name TEXT,
  rep_id INT,
  rep_name TEXT,
  total_sales NUMERIC,
  order_count INT,
  cities TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  WITH zip_cities AS (
    SELECT DISTINCT dealer_billing_address_city
    FROM public.customers_demo
    WHERE LPAD(SUBSTRING(REGEXP_REPLACE(dealer_billing_address_postal_code, '\D', '', 'g') FROM 1 FOR 5), 5, '0') = p_zip_code
      AND dealer_billing_address_city IS NOT NULL
  )
  SELECT
    c.customer_id,
    c.dealer_name,
    c.rep_id,
    COALESCE(r.rep_name, 'Unassigned') AS rep_name,
    COALESCE(SUM(s.invoice_amount), 0)::NUMERIC AS total_sales,
    COUNT(s.sale_id)::INT AS order_count,
    (SELECT STRING_AGG(dealer_billing_address_city, ', ') FROM zip_cities) AS cities
  FROM public.customers_demo c
  LEFT JOIN public.sales_reps_demo r ON r.rep_id = c.rep_id
  LEFT JOIN public.sales_demo s
    ON s.customer_id = c.customer_id
    AND s.invoice_date >= from_date
    AND s.invoice_date < to_date
  WHERE LPAD(SUBSTRING(REGEXP_REPLACE(c.dealer_billing_address_postal_code, '\D', '', 'g') FROM 1 FOR 5), 5, '0') = p_zip_code
  GROUP BY c.customer_id, c.dealer_name, c.rep_id, r.rep_name
  ORDER BY total_sales DESC
$$;

-- Add function comments
COMMENT ON FUNCTION public.dealers_by_zip(TEXT, DATE, DATE) IS
  'Returns all dealers in a specific ZIP code with their sales metrics for a date range.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.dealers_by_zip(TEXT, DATE, DATE) TO anon, authenticated, service_role;
