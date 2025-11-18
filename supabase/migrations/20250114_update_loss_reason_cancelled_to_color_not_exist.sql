-- Update loss_opportunities: Change "cancelled" reason to "color_not_exist"
-- Date: 2025-01-14
-- Description: Updates the lost_reason column to rename "Cancelado" to "Color No Existe"

-- Update existing records with "cancelled" to "color_not_exist"
UPDATE public.loss_opportunities
SET lost_reason = 'color_not_exist'
WHERE lost_reason = 'cancelled';

-- Update the column comment to reflect the new value
COMMENT ON COLUMN public.loss_opportunities.lost_reason IS 'Reason for lost opportunity (no_stock, price, competitor, color_not_exist, other)';

-- Log the number of records updated
DO $$
DECLARE
    updated_count integer;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM public.loss_opportunities
    WHERE lost_reason = 'color_not_exist';

    RAISE NOTICE 'Updated loss_reason column. Current count of color_not_exist records: %', updated_count;
END $$;
