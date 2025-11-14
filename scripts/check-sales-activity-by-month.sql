-- ============================================================================
-- SQL Query to Check Sales Activity by Month
-- Run this in Supabase SQL Editor to see which months have actual sales data
-- ============================================================================

-- Check all months with sales activity
SELECT
  date_trunc('month', invoice_date)::date as month,
  to_char(date_trunc('month', invoice_date), 'Mon YYYY') as month_label,
  COUNT(*) as order_count,
  COUNT(DISTINCT customer_id) as active_dealer_count,
  SUM(invoice_amount::numeric) as total_revenue,
  ROUND(AVG(invoice_amount::numeric), 2) as avg_order_value
FROM sales_demo
GROUP BY date_trunc('month', invoice_date)
ORDER BY month DESC;

-- ============================================================================
-- Alternative: Check date range for all sales data
-- ============================================================================

SELECT
  MIN(invoice_date) as earliest_sale,
  MAX(invoice_date) as latest_sale,
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as total_active_dealers,
  SUM(invoice_amount::numeric) as total_revenue
FROM sales_demo;

-- ============================================================================
-- Check for 2024 vs 2025 data specifically
-- ============================================================================

SELECT
  EXTRACT(YEAR FROM invoice_date) as year,
  COUNT(*) as order_count,
  COUNT(DISTINCT customer_id) as active_dealer_count,
  SUM(invoice_amount::numeric) as total_revenue
FROM sales_demo
GROUP BY EXTRACT(YEAR FROM invoice_date)
ORDER BY year;
