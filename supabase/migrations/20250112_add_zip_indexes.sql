-- Add indexes for geographic queries on customers_demo table
-- These indexes improve performance for ZIP/state-based sales aggregation

CREATE INDEX IF NOT EXISTS idx_customers_demo_state
  ON public.customers_demo(dealer_billing_address_state)
  WHERE dealer_billing_address_state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_demo_postal_code
  ON public.customers_demo(dealer_billing_address_postal_code)
  WHERE dealer_billing_address_postal_code IS NOT NULL;

-- Composite index for state + postal_code queries
CREATE INDEX IF NOT EXISTS idx_customers_demo_state_postal
  ON public.customers_demo(dealer_billing_address_state, dealer_billing_address_postal_code)
  WHERE dealer_billing_address_state IS NOT NULL
    AND dealer_billing_address_postal_code IS NOT NULL;

COMMENT ON INDEX idx_customers_demo_state IS 'Index for filtering customers by state';
COMMENT ON INDEX idx_customers_demo_postal_code IS 'Index for filtering customers by ZIP/postal code';
COMMENT ON INDEX idx_customers_demo_state_postal IS 'Composite index for state + ZIP queries (e.g., Florida ZIP sales map)';
