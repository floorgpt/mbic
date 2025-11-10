-- Add target_price column and safely remove needed_by_date
-- Migration for loss_opportunities table improvements
-- Date: 2025-01-10

DO $$
BEGIN
    -- Drop needed_by_date column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'loss_opportunities'
        AND column_name = 'needed_by_date'
    ) THEN
        ALTER TABLE public.loss_opportunities DROP COLUMN needed_by_date;
        RAISE NOTICE 'Dropped column needed_by_date';
    ELSE
        RAISE NOTICE 'Column needed_by_date does not exist, skipping drop';
    END IF;

    -- Add target_price column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'loss_opportunities'
        AND column_name = 'target_price'
    ) THEN
        ALTER TABLE public.loss_opportunities
        ADD COLUMN target_price numeric;

        COMMENT ON COLUMN public.loss_opportunities.target_price IS
            'Target price per square foot ($/SqFt) - nullable field captured from loss opportunity form';

        RAISE NOTICE 'Added column target_price';
    ELSE
        RAISE NOTICE 'Column target_price already exists';
    END IF;
END $$;

-- Document the logical column order for reference
-- Note: PostgreSQL does not physically reorder columns without a full table rebuild.
-- This is a reference for developers on the intended logical structure:
--
-- CORE FIELDS (Primary business keys):
--   1. id (serial, primary key)
--   2. dealer_id (integer, references customers_demo)
--   3. rep_id (integer, references sales_reps_demo)
--   4. lost_date (date, when opportunity was lost)
--   5. requested_qty (numeric, quantity requested)
--   6. target_price (numeric, $/SqFt pricing - NEW)
--   7. potential_amount (numeric, qty × price)
--
-- BUSINESS FIELDS (Loss context):
--   8. due_to_stock (boolean, stock availability flag)
--   9. lost_reason (text, reason code: no_stock, price, competitor, cancelled, other)
--   10. notes (text, additional context)
--
-- PRODUCT FIELDS (Product identification):
--   11. category_key (text, product category)
--   12. collection (text, collection name)
--   13. color (text, color name)
--   14. expected_sku (text, expected SKU identifier)
--   15. sku (text, actual SKU if known)
--
-- AUDIT FIELDS (Timestamps):
--   16. created_by (text, user identifier - if exists)
--   17. created_at (timestamp, record creation)
--   18. updated_at (timestamp, last update - if exists)

-- Verify the schema changes
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'loss_opportunities'
ORDER BY ordinal_position;
