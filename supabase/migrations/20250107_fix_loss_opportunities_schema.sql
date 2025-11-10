-- Fix loss_opportunities table schema
-- Add all missing columns that are referenced in the application code

DO $$
BEGIN
    -- Add category_key if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'loss_opportunities' AND column_name = 'category_key'
    ) THEN
        ALTER TABLE public.loss_opportunities ADD COLUMN category_key text;
        COMMENT ON COLUMN public.loss_opportunities.category_key IS 'Product category key (e.g., vinyl, laminate)';
    END IF;

    -- Add collection if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'loss_opportunities' AND column_name = 'collection'
    ) THEN
        ALTER TABLE public.loss_opportunities ADD COLUMN collection text;
        COMMENT ON COLUMN public.loss_opportunities.collection IS 'Product collection name';
    END IF;

    -- Add color if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'loss_opportunities' AND column_name = 'color'
    ) THEN
        ALTER TABLE public.loss_opportunities ADD COLUMN color text;
        COMMENT ON COLUMN public.loss_opportunities.color IS 'Product color name';
    END IF;

    -- Add expected_sku if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'loss_opportunities' AND column_name = 'expected_sku'
    ) THEN
        ALTER TABLE public.loss_opportunities ADD COLUMN expected_sku text;
        COMMENT ON COLUMN public.loss_opportunities.expected_sku IS 'Expected SKU identifier (collection:color)';
    END IF;

    -- Add lost_reason if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'loss_opportunities' AND column_name = 'lost_reason'
    ) THEN
        ALTER TABLE public.loss_opportunities ADD COLUMN lost_reason text;
        COMMENT ON COLUMN public.loss_opportunities.lost_reason IS 'Reason for lost opportunity (no_stock, price, competitor, cancelled, other)';
    END IF;

    -- Add requested_qty if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'loss_opportunities' AND column_name = 'requested_qty'
    ) THEN
        ALTER TABLE public.loss_opportunities ADD COLUMN requested_qty numeric NOT NULL DEFAULT 0;
        COMMENT ON COLUMN public.loss_opportunities.requested_qty IS 'Quantity that was requested';
    END IF;

    -- Add potential_amount if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'loss_opportunities' AND column_name = 'potential_amount'
    ) THEN
        ALTER TABLE public.loss_opportunities ADD COLUMN potential_amount numeric NOT NULL DEFAULT 0;
        COMMENT ON COLUMN public.loss_opportunities.potential_amount IS 'Potential revenue amount (qty * price)';
    END IF;

    -- Add due_to_stock if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'loss_opportunities' AND column_name = 'due_to_stock'
    ) THEN
        ALTER TABLE public.loss_opportunities ADD COLUMN due_to_stock boolean DEFAULT false;
        COMMENT ON COLUMN public.loss_opportunities.due_to_stock IS 'True if loss was due to stock unavailability';
    END IF;

    -- Add notes if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'loss_opportunities' AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.loss_opportunities ADD COLUMN notes text;
        COMMENT ON COLUMN public.loss_opportunities.notes IS 'Additional notes about the lost opportunity';
    END IF;

END $$;

-- Verify the schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'loss_opportunities'
ORDER BY ordinal_position;
