-- Add category_key column to loss_opportunities table
-- This column was referenced in the code but missing from the database schema

-- Check if column exists first, then add if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'loss_opportunities'
        AND column_name = 'category_key'
    ) THEN
        ALTER TABLE public.loss_opportunities
        ADD COLUMN category_key text;

        COMMENT ON COLUMN public.loss_opportunities.category_key IS 'Product category key (e.g., vinyl, laminate)';
    END IF;
END $$;
