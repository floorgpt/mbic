-- Update list_incoming_stock_by_collection RPC to read from incoming_stock table
-- Instead of placeholder/empty data
-- Date: 2025-01-11

DROP FUNCTION IF EXISTS public.list_incoming_stock_by_collection(date, date) CASCADE;

CREATE FUNCTION public.list_incoming_stock_by_collection(
  from_date DATE,
  to_date DATE
)
RETURNS TABLE (
  id INTEGER,
  collection TEXT,
  color TEXT,
  sku TEXT,
  qty NUMERIC,
  rate NUMERIC,
  stock_value NUMERIC,
  eta_date TEXT,
  eta_status TEXT,
  received_at TEXT,
  incoming_from TEXT,
  destination_port TEXT,
  notes TEXT,
  created_at TIMESTAMP
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  -- Return incoming stock filtered by ETA arrival date within the date range
  SELECT
    ist.id,
    ist.collection,
    ist.color,
    COALESCE(ist.sku, 'TBD') AS sku,
    ist.quantity AS qty,
    ist.rate,
    ist.stock_value,
    ist.eta_arrival_date::TEXT AS eta_date,
    COALESCE(ist.eta_status, 'pending') AS eta_status,
    ist.received_at::TEXT,
    ist.incoming_from,
    ist.destination_port,
    ist.notes,
    ist.created_at
  FROM public.incoming_stock ist
  WHERE COALESCE(ist.eta_arrival_date, from_date) >= from_date
    AND COALESCE(ist.eta_arrival_date, to_date) <= to_date
  ORDER BY ist.eta_arrival_date ASC NULLS LAST, ist.created_at DESC
  LIMIT 100;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.list_incoming_stock_by_collection(date, date) TO authenticated, anon, service_role;

-- Add comment
COMMENT ON FUNCTION public.list_incoming_stock_by_collection IS 'Lists incoming stock shipments grouped/filtered by collection and ETA date';
