-- Migration: Add record_id UUID column to loss_opportunities table
-- This provides a unique UUID identifier for each record, separate from the auto-increment id
-- Useful for public-facing identifiers and linking records across systems

-- Add record_id column if it doesn't exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loss_opportunities'
    AND column_name = 'record_id'
  ) THEN
    ALTER TABLE public.loss_opportunities
    ADD COLUMN record_id UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Backfill existing records with UUIDs
UPDATE public.loss_opportunities
SET record_id = gen_random_uuid()
WHERE record_id IS NULL;

-- Add unique constraint to record_id
ALTER TABLE public.loss_opportunities
ADD CONSTRAINT loss_opportunities_record_id_unique UNIQUE (record_id);

-- Create index for faster lookups by record_id
CREATE INDEX IF NOT EXISTS idx_loss_opportunities_record_id
ON public.loss_opportunities(record_id);

-- Create trigger to auto-generate record_id for new inserts
CREATE OR REPLACE FUNCTION public.set_loss_opportunity_record_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.record_id IS NULL THEN
    NEW.record_id := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_loss_opportunity_record_id_trigger
ON public.loss_opportunities;

CREATE TRIGGER set_loss_opportunity_record_id_trigger
  BEFORE INSERT ON public.loss_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_loss_opportunity_record_id();

-- Add comment for documentation
COMMENT ON COLUMN public.loss_opportunities.record_id IS
'Unique UUID identifier for this loss opportunity record. Auto-generated on insert.';
