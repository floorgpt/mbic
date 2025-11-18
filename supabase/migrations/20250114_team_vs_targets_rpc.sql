-- RPC function to get sales rep performance vs targets for a specific month
-- Returns actual sales vs target with variance for Team vs Targets chart

CREATE OR REPLACE FUNCTION team_vs_targets_month(p_target_month text)
RETURNS TABLE (
  rep_id integer,
  rep_name text,
  rep_initials text,
  target_amount numeric,
  actual_sales numeric,
  variance_amount numeric,
  variance_pct numeric,
  achievement_pct numeric,
  status text
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_sales AS (
    -- Get actual sales per rep for the target month
    SELECT
      sr.rep_id,
      sr.rep_name,
      COALESCE(SUM(s.total), 0) as actual_sales
    FROM sales_reps_demo sr
    LEFT JOIN sales_demo s
      ON sr.rep_id = s.rep_id
      AND to_char(s.invoice_date, 'YYYY-MM') = p_target_month
    WHERE sr.rep_id IS NOT NULL
    GROUP BY sr.rep_id, sr.rep_name
  ),
  targets AS (
    -- Get targets for the month
    SELECT
      st.rep_id,
      st.target_amount
    FROM sales_targets st
    WHERE st.target_month = p_target_month
  )
  SELECT
    ms.rep_id,
    ms.rep_name,
    -- Extract initials from rep name (e.g., "Juan Pedro" -> "JP")
    CASE
      WHEN ms.rep_name IS NULL OR ms.rep_name = '' THEN '--'
      WHEN position(' ' in ms.rep_name) > 0 THEN
        upper(substring(ms.rep_name from 1 for 1)) ||
        upper(substring(split_part(ms.rep_name, ' ', 2) from 1 for 1))
      ELSE upper(substring(ms.rep_name from 1 for 2))
    END as rep_initials,
    COALESCE(t.target_amount, 200000.00) as target_amount,
    ms.actual_sales,
    (ms.actual_sales - COALESCE(t.target_amount, 200000.00)) as variance_amount,
    CASE
      WHEN COALESCE(t.target_amount, 200000.00) > 0 THEN
        ROUND(((ms.actual_sales - COALESCE(t.target_amount, 200000.00)) / COALESCE(t.target_amount, 200000.00)) * 100, 1)
      ELSE 0
    END as variance_pct,
    CASE
      WHEN COALESCE(t.target_amount, 200000.00) > 0 THEN
        ROUND((ms.actual_sales / COALESCE(t.target_amount, 200000.00)) * 100, 1)
      ELSE 0
    END as achievement_pct,
    CASE
      WHEN ms.actual_sales >= COALESCE(t.target_amount, 200000.00) THEN 'achieved'
      WHEN ms.actual_sales >= COALESCE(t.target_amount, 200000.00) * 0.9 THEN 'near'
      ELSE 'below'
    END as status
  FROM monthly_sales ms
  LEFT JOIN targets t ON ms.rep_id = t.rep_id
  ORDER BY ms.actual_sales DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION team_vs_targets_month(text) IS 'Get sales rep performance vs targets for a specific month (format: YYYY-MM)';
