-- Add all missing columns to competitors_market_data table
-- This ensures the table has all required columns for the Gap Analysis feature

DO $$
BEGIN
  -- Add latitude column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'competitors_market_data'
    AND column_name = 'latitude'
  ) THEN
    ALTER TABLE public.competitors_market_data
    ADD COLUMN latitude NUMERIC NOT NULL DEFAULT 0;

    COMMENT ON COLUMN public.competitors_market_data.latitude IS
      'Store latitude coordinate';

    RAISE NOTICE 'Added latitude column';
  ELSE
    RAISE NOTICE 'latitude column already exists';
  END IF;

  -- Add longitude column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'competitors_market_data'
    AND column_name = 'longitude'
  ) THEN
    ALTER TABLE public.competitors_market_data
    ADD COLUMN longitude NUMERIC NOT NULL DEFAULT 0;

    COMMENT ON COLUMN public.competitors_market_data.longitude IS
      'Store longitude coordinate';

    RAISE NOTICE 'Added longitude column';
  ELSE
    RAISE NOTICE 'longitude column already exists';
  END IF;

  -- Add city column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'competitors_market_data'
    AND column_name = 'city'
  ) THEN
    ALTER TABLE public.competitors_market_data
    ADD COLUMN city TEXT NOT NULL DEFAULT '';

    COMMENT ON COLUMN public.competitors_market_data.city IS
      'City name where store is located';

    RAISE NOTICE 'Added city column';
  ELSE
    RAISE NOTICE 'city column already exists';
  END IF;

  -- Add est_annual_revenue column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'competitors_market_data'
    AND column_name = 'est_annual_revenue'
  ) THEN
    ALTER TABLE public.competitors_market_data
    ADD COLUMN est_annual_revenue NUMERIC NOT NULL DEFAULT 0;

    COMMENT ON COLUMN public.competitors_market_data.est_annual_revenue IS
      'Estimated annual revenue: Base revenue × tier_multiplier';

    RAISE NOTICE 'Added est_annual_revenue column';
  ELSE
    RAISE NOTICE 'est_annual_revenue column already exists';
  END IF;

END $$;

-- Verify all columns exist
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'competitors_market_data'
ORDER BY ordinal_position;
