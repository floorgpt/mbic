-- Gap Analysis Feature: Competitor Market Data Table
-- This table stores competitor location and revenue data for gap analysis
-- Data sourced from OpenStreetMap via sync-market-data Edge Function

-- Create competitors market data table
CREATE TABLE IF NOT EXISTS public.competitors_market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zip_code TEXT NOT NULL,
  store_name TEXT NOT NULL,
  store_type TEXT NOT NULL CHECK (store_type IN ('Big Box', 'Specialized')),
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  city TEXT NOT NULL,
  est_annual_revenue NUMERIC NOT NULL DEFAULT 0,
  tier_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate stores in same ZIP
  CONSTRAINT unique_zip_store UNIQUE (zip_code, store_name)
);

-- Index for fast ZIP lookups
CREATE INDEX IF NOT EXISTS idx_competitors_zip
  ON public.competitors_market_data(zip_code);

-- Index for revenue sorting
CREATE INDEX IF NOT EXISTS idx_competitors_revenue
  ON public.competitors_market_data(est_annual_revenue DESC);

-- Index for city lookups
CREATE INDEX IF NOT EXISTS idx_competitors_city
  ON public.competitors_market_data(city);

-- RLS Policies (read-only for authenticated users)
ALTER TABLE public.competitors_market_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.competitors_market_data;
DROP POLICY IF EXISTS "Allow service role full access" ON public.competitors_market_data;

-- Allow read access for authenticated and anonymous users
CREATE POLICY "Allow authenticated read access"
  ON public.competitors_market_data
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow service role full access for Edge Function
CREATE POLICY "Allow service role full access"
  ON public.competitors_market_data
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.competitors_market_data TO anon, authenticated;
GRANT ALL ON public.competitors_market_data TO service_role;

-- Add table comment
COMMENT ON TABLE public.competitors_market_data IS
  'Stores competitor market data for gap analysis. Updated via sync-market-data Edge Function. Contains big box stores (Home Depot, Lowe''s, Floor & Decor) with estimated annual revenue based on tier multipliers.';

-- Add column comments
COMMENT ON COLUMN public.competitors_market_data.zip_code IS
  'Florida ZIP code (5 digits)';
COMMENT ON COLUMN public.competitors_market_data.store_name IS
  'Store brand name (e.g., Home Depot, Lowe''s)';
COMMENT ON COLUMN public.competitors_market_data.store_type IS
  'Store category: Big Box or Specialized';
COMMENT ON COLUMN public.competitors_market_data.est_annual_revenue IS
  'Estimated annual revenue: Base revenue × tier_multiplier';
COMMENT ON COLUMN public.competitors_market_data.tier_multiplier IS
  'Revenue multiplier: 1.25 for high-volume cities, 0.9 for others';
