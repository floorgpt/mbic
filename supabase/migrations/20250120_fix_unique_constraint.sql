-- Fix missing UNIQUE constraint on competitors_market_data table
-- This constraint is needed for upsert operations in the sync-market-data Edge Function

DO $$
BEGIN
  -- Check if constraint exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_zip_store'
    AND conrelid = 'public.competitors_market_data'::regclass
  ) THEN
    -- Add the constraint
    ALTER TABLE public.competitors_market_data
    ADD CONSTRAINT unique_zip_store UNIQUE (zip_code, store_name);

    RAISE NOTICE 'Added unique_zip_store constraint';
  ELSE
    RAISE NOTICE 'unique_zip_store constraint already exists';
  END IF;
END $$;

-- Verify constraint exists
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'unique_zip_store'
  AND conrelid = 'public.competitors_market_data'::regclass;
