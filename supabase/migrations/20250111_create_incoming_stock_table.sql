-- Create incoming_stock table for Operations team
-- Stores incoming inventory data with ETA tracking
-- Date: 2025-01-11

CREATE TABLE IF NOT EXISTS public.incoming_stock (
  id SERIAL PRIMARY KEY,

  -- Product Identification
  master_category TEXT,
  category TEXT,
  collection TEXT NOT NULL,
  color TEXT,
  sku TEXT,

  -- Quantity & Value
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  rate NUMERIC,  -- Unit price ($/unit)
  stock_value NUMERIC,  -- Calculated: quantity × rate

  -- Operations Data
  incoming_from TEXT,  -- Origin/supplier
  destination_port TEXT,
  eta_status TEXT DEFAULT 'pending' CHECK (eta_status IN ('pending', 'in_transit', 'arrived', 'delayed')),
  eta_arrival_date DATE,
  received_at TIMESTAMP,

  -- Audit Fields
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  notes TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_incoming_stock_eta ON public.incoming_stock(eta_arrival_date);
CREATE INDEX IF NOT EXISTS idx_incoming_stock_collection ON public.incoming_stock(collection);
CREATE INDEX IF NOT EXISTS idx_incoming_stock_status ON public.incoming_stock(eta_status);
CREATE INDEX IF NOT EXISTS idx_incoming_stock_created ON public.incoming_stock(created_at DESC);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_incoming_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_incoming_stock_updated_at
  BEFORE UPDATE ON public.incoming_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.update_incoming_stock_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.incoming_stock IS 'Tracks incoming inventory shipments with ETA and status tracking';
COMMENT ON COLUMN public.incoming_stock.master_category IS 'Top-level product category (e.g., Flooring)';
COMMENT ON COLUMN public.incoming_stock.category IS 'Product category (e.g., vinyl, laminate, hardwood)';
COMMENT ON COLUMN public.incoming_stock.collection IS 'Product collection/series name';
COMMENT ON COLUMN public.incoming_stock.color IS 'Product color/variant';
COMMENT ON COLUMN public.incoming_stock.sku IS 'Stock Keeping Unit identifier';
COMMENT ON COLUMN public.incoming_stock.quantity IS 'Quantity in square feet (SqFt)';
COMMENT ON COLUMN public.incoming_stock.rate IS 'Unit price per square foot ($/SqFt)';
COMMENT ON COLUMN public.incoming_stock.stock_value IS 'Total value (quantity × rate)';
COMMENT ON COLUMN public.incoming_stock.eta_status IS 'Shipment status: pending, in_transit, arrived, delayed';
COMMENT ON COLUMN public.incoming_stock.eta_arrival_date IS 'Expected or actual arrival date';
COMMENT ON COLUMN public.incoming_stock.received_at IS 'Timestamp when stock was physically received';

-- Grant permissions
GRANT SELECT ON public.incoming_stock TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.incoming_stock TO authenticated, service_role;
GRANT USAGE ON SEQUENCE public.incoming_stock_id_seq TO authenticated, service_role;
