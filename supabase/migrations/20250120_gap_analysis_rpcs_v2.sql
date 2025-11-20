-- Gap Analysis Feature: RPC Functions (Version 2)
-- Fixed version with DROP FUNCTION IF EXISTS

-- ============================================================================
-- Drop existing functions if they exist
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_zip_gap_analysis(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_zip_opportunity_details(TEXT);

-- ============================================================================
-- RPC 1: get_zip_gap_analysis
-- Returns ZIP codes where we have NO sales but competitors have presence
-- Used to render red circles on the Florida ZIP map
-- ============================================================================

CREATE FUNCTION public.get_zip_gap_analysis(
  from_date DATE,
  to_date DATE
)
RETURNS TABLE (
  zip_code TEXT,
  total_est_revenue NUMERIC,
  competitor_count INT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  WITH our_sales AS (
    -- Get ZIPs where we have sales in the date range
    SELECT DISTINCT
      LPAD(SUBSTRING(REGEXP_REPLACE(c.dealer_billing_address_postal_code, '\D', '', 'g') FROM 1 FOR 5), 5, '0') AS zip_code
    FROM public.sales_demo s
    INNER JOIN public.customers_demo c ON c.customer_id = s.customer_id
    WHERE s.invoice_date >= from_date
      AND s.invoice_date < to_date
      AND c.dealer_billing_address_state = 'FL'
      AND c.dealer_billing_address_postal_code IS NOT NULL
  )
  SELECT
    cmd.zip_code,
    SUM(cmd.est_annual_revenue)::NUMERIC AS total_est_revenue,
    COUNT(*)::INT AS competitor_count
  FROM public.competitors_market_data cmd
  WHERE cmd.zip_code NOT IN (SELECT zip_code FROM our_sales)
    AND cmd.zip_code IS NOT NULL
    AND LENGTH(cmd.zip_code) = 5
  GROUP BY cmd.zip_code
  ORDER BY total_est_revenue DESC;
$$;

-- ============================================================================
-- RPC 2: get_zip_opportunity_details
-- Returns detailed list of competitors for a specific ZIP code
-- Used to populate the Gap Drawer table when user clicks a red circle
-- ============================================================================

CREATE FUNCTION public.get_zip_opportunity_details(
  p_zip_code TEXT
)
RETURNS TABLE (
  store_name TEXT,
  store_type TEXT,
  city TEXT,
  est_annual_revenue NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT
    cmd.store_name,
    cmd.store_type,
    cmd.city,
    cmd.est_annual_revenue,
    cmd.latitude,
    cmd.longitude
  FROM public.competitors_market_data cmd
  WHERE cmd.zip_code = p_zip_code
  ORDER BY cmd.est_annual_revenue DESC;
$$;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_zip_gap_analysis(DATE, DATE)
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_zip_opportunity_details(TEXT)
  TO anon, authenticated, service_role;

-- ============================================================================
-- Add Comments
-- ============================================================================

COMMENT ON FUNCTION public.get_zip_gap_analysis(DATE, DATE) IS
  'Returns ZIP codes with gap opportunities (competitors present, our sales = $0). Used for red circle visualization on map. Revenue sum and competitor count aggregated per ZIP.';

COMMENT ON FUNCTION public.get_zip_opportunity_details(TEXT) IS
  'Returns detailed competitor data for a specific ZIP code. Used in Gap Drawer. Sorted by estimated annual revenue (highest first) to show biggest threats/opportunities.';
