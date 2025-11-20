-- Add missing tier_multiplier column to competitors_market_data table
-- This is a fix for the existing table that was created without this column

-- Add the tier_multiplier column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'competitors_market_data'
    AND column_name = 'tier_multiplier'
  ) THEN
    ALTER TABLE public.competitors_market_data
    ADD COLUMN tier_multiplier NUMERIC NOT NULL DEFAULT 1.0;

    COMMENT ON COLUMN public.competitors_market_data.tier_multiplier IS
      'Revenue multiplier: 1.25 for high-volume cities, 0.9 for others';
  END IF;
END $$;
