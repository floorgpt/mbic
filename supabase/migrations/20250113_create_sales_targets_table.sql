-- Create sales_targets table to track monthly sales targets per rep
CREATE TABLE IF NOT EXISTS sales_targets (
  id BIGSERIAL PRIMARY KEY,
  rep_id INTEGER NOT NULL,
  target_month TEXT NOT NULL, -- Format: YYYY-MM
  target_amount NUMERIC(12, 2) NOT NULL DEFAULT 200000.00,
  fiscal_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(rep_id, target_month)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sales_targets_rep_month ON sales_targets(rep_id, target_month);
CREATE INDEX IF NOT EXISTS idx_sales_targets_fiscal_year ON sales_targets(fiscal_year);

-- Add comment
COMMENT ON TABLE sales_targets IS 'Monthly sales targets for each sales rep';
COMMENT ON COLUMN sales_targets.target_month IS 'Target month in YYYY-MM format';
COMMENT ON COLUMN sales_targets.target_amount IS 'Monthly sales target amount in USD';

-- Seed 2025 data with $200k monthly target for each rep
-- First, get all active reps from sales_reps_demo
INSERT INTO sales_targets (rep_id, target_month, target_amount, fiscal_year)
SELECT
  sr.rep_id,
  to_char(month_series.month, 'YYYY-MM') as target_month,
  200000.00 as target_amount,
  2025 as fiscal_year
FROM
  sales_reps_demo sr
CROSS JOIN
  generate_series(
    '2025-01-01'::date,
    '2025-12-01'::date,
    '1 month'::interval
  ) AS month_series(month)
WHERE
  sr.rep_id IS NOT NULL
ON CONFLICT (rep_id, target_month) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_sales_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sales_targets_updated_at
  BEFORE UPDATE ON sales_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_targets_updated_at();
