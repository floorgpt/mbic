-- Make sku column nullable in loss_opportunities table
-- The SKU is often unknown at the time of reporting a lost opportunity

ALTER TABLE public.loss_opportunities
ALTER COLUMN sku DROP NOT NULL;

COMMENT ON COLUMN public.loss_opportunities.sku IS 'Product SKU (nullable - may be unknown at time of loss reporting)';

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'loss_opportunities'
  AND column_name = 'sku';
