-- Customer Rep Transfer History Table
-- Tracks when customers are reassigned from one sales rep to another

CREATE TABLE IF NOT EXISTS public.customer_rep_transfers (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  from_rep_id BIGINT NULL,
  to_rep_id BIGINT NULL,
  transferred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT NULL,
  CONSTRAINT customer_rep_transfers_customer_fkey
    FOREIGN KEY (customer_id)
    REFERENCES customers_demo(customer_id)
    ON DELETE CASCADE,
  CONSTRAINT customer_rep_transfers_from_rep_fkey
    FOREIGN KEY (from_rep_id)
    REFERENCES sales_reps_demo(rep_id)
    ON DELETE SET NULL,
  CONSTRAINT customer_rep_transfers_to_rep_fkey
    FOREIGN KEY (to_rep_id)
    REFERENCES sales_reps_demo(rep_id)
    ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_rep_transfers_customer
  ON public.customer_rep_transfers(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_rep_transfers_from_rep
  ON public.customer_rep_transfers(from_rep_id);

CREATE INDEX IF NOT EXISTS idx_customer_rep_transfers_to_rep
  ON public.customer_rep_transfers(to_rep_id);

CREATE INDEX IF NOT EXISTS idx_customer_rep_transfers_date
  ON public.customer_rep_transfers(transferred_at DESC);

-- Comment
COMMENT ON TABLE public.customer_rep_transfers IS 'Tracks historical transfers of customers between sales representatives';
