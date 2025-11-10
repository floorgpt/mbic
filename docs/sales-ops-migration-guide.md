# Sales Ops Migration Guide

## Overview

This guide explains how to apply the Sales Ops RPC functions migration to enable the sales-ops dashboard page.

## What's Missing

The sales-ops page at `/sales-ops` currently shows **no data** for:
- **Gross Revenue** card (calls `sales_ops_category_kpis`)
- **Top Collections** card (calls `sales_ops_kpis_by_collection`)
- Plus 11 other operational metrics

All 13 required RPC functions are missing from the Supabase database.

## What Was Created

A new migration file has been created at:
```
supabase/migrations/20250107_sales_ops_rpcs.sql
```

This migration creates **14 RPC functions**:

### Category-Level KPIs
1. **`sales_ops_category_kpis`** - Aggregates sales by category with profit margins
2. **`sales_ops_category_kpis_monthly`** - Monthly category performance
3. **`sales_ops_kpis_by_collection`** - Collection-level revenue and profit
4. **`sales_ops_kpis_monthly_by_collection`** - Monthly collection trends
5. **`sales_ops_collection_by_dealer`** - Dealer breakdown for a specific collection

### Operational Metrics
6. **`sales_ops_fill_rate`** - Order fulfillment rate
7. **`sales_ops_import_lead_time`** - Average import lead time
8. **`sales_ops_forecast_accuracy`** - Forecast vs actual accuracy
9. **`sales_ops_inventory_turnover`** - Inventory turnover ratio
10. **`sales_ops_dealer_bounce_rate`** - Calculated dealer churn rate

### Reports & Planning
11. **`ops_reports_made_by_month`** - Monthly report counts
12. **`ops_comm_consistency_index`** - Communication consistency metric
13. **`list_future_sale_opps_open`** - Future opportunities from loss_opportunities table
14. **`list_incoming_stock_by_collection`** - Incoming stock by collection (placeholder)

## Implementation Notes

### Based on Existing Data

The functions are built using your **existing tables**:
- `sales_demo` - Invoice transactions
- `customers_demo` - Customer/dealer information
- `sales_reps_demo` - Sales rep details
- `product_categories` - Category metadata
- `loss_opportunities` - Lost sales tracking

### Simulated Metrics

Some functions return **simulated data** because the required tables don't exist yet:

| Function | Status | Notes |
|----------|--------|-------|
| `sales_ops_category_kpis` | ✅ Real Data | Calculates from sales_demo |
| `sales_ops_kpis_by_collection` | ✅ Real Data | Calculates from sales_demo |
| `sales_ops_dealer_bounce_rate` | ✅ Real Data | Calculated from dealer activity |
| `list_future_sale_opps_open` | ✅ Real Data | Uses loss_opportunities table |
| `sales_ops_fill_rate` | ⚠️ Simulated | Returns 85% (needs order fulfillment data) |
| `sales_ops_import_lead_time` | ⚠️ Simulated | Returns 45 days (needs purchase orders) |
| `sales_ops_forecast_accuracy` | ⚠️ Simulated | Returns 78% (needs forecast table) |
| `sales_ops_inventory_turnover` | ⚠️ Simulated | Returns 4.2x (needs inventory data) |
| `ops_reports_made_by_month` | ⚠️ Simulated | Random counts (needs ops_reports table) |
| `ops_comm_consistency_index` | ⚠️ Simulated | Returns 92% (needs comm tracking) |
| `list_incoming_stock_by_collection` | ⚠️ Placeholder | Empty result (needs purchase_orders table) |

### Profit Margin Assumptions

For revenue/profit calculations, the functions use a **40% margin assumption** since there's no COGS data yet:
- `avg_cogs` = price × 0.60 (60% of selling price)
- `gross_margin` = 40%
- `gross_profit` = revenue × 0.40

## How to Apply the Migration

### Option 1: Supabase Dashboard (Easiest)

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/sqhqzrtmjspwqqhnjtss/sql/new)
2. Copy the entire contents of:
   ```
   supabase/migrations/20250107_sales_ops_rpcs.sql
   ```
3. Paste into the SQL Editor
4. Click **"Run"**
5. Verify success (should see "Success. No rows returned")

### Option 2: Supabase CLI

```bash
cd /Users/jaimacmini/Documents/mbic-poc
supabase db push
```

### Option 3: Direct PostgreSQL

If you have `psql` installed:

```bash
psql "postgresql://postgres.sqhqzrtmjspwqqhnjtss:<password>@aws-0-us-east-1.pooler.supabase.com:6543/postgres" \
  < supabase/migrations/20250107_sales_ops_rpcs.sql
```

## Verification

After applying the migration, run this test:

```bash
node scripts/verify-salesops-migration.mjs
```

Or manually test in Supabase SQL Editor:

```sql
-- Test category KPIs
SELECT * FROM sales_ops_category_kpis('2025-01-01', '2025-10-01');

-- Test collections
SELECT * FROM sales_ops_kpis_by_collection('2025-01-01', '2025-10-01');

-- Test fill rate
SELECT * FROM sales_ops_fill_rate('2025-01-01', '2025-10-01');
```

## Expected Results

Once applied, the sales-ops page should show:

### ✅ Gross Revenue Card
- Should display real revenue aggregated by category
- Example: $6.1M YTD

### ✅ Top Collections Card
- Should show clickable collection tiles
- Click to see dealer-level breakdown
- Example: Collections like "Vintage", "Modern", etc.

### ⚠️ Operational Metrics
- Will show simulated values until real data sources are added:
  - Fill Rate: 85%
  - Lead Time: 45 days
  - Forecast Accuracy: 78%
  - Inventory Turnover: 4.2x

## Next Steps

### Immediate (Post-Migration)
1. Apply the migration
2. Visit https://cpf-mbic2.netlify.app/sales-ops
3. Verify Gross Revenue and Top Collections show data
4. Test collection drill-down functionality

### Short-term (Add Real Data Sources)
Create these tables to replace simulated metrics:

1. **`inventory_summary`** - Current stock levels
2. **`purchase_orders`** - Incoming stock and lead times
3. **`sales_forecasts`** - Forecasted vs actual comparisons
4. **`ops_reports`** - Operations team report tracking
5. **`communications_log`** - Rep/dealer communication tracking

### Long-term (Enhance Functions)
1. Add COGS data to sales_demo for real profit margins
2. Implement proper inventory turnover calculations
3. Add RLS policies if needed
4. Create views for complex aggregations

## Troubleshooting

### Migration Fails with "function already exists"

If you've partially applied this migration before:

```sql
-- Drop existing functions first
DROP FUNCTION IF EXISTS sales_ops_category_kpis(date, date);
DROP FUNCTION IF EXISTS sales_ops_kpis_by_collection(date, date);
-- ... repeat for all 14 functions
```

Then re-run the migration.

### No Data Showing After Migration

1. Check that the migration succeeded:
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name LIKE 'sales_ops_%';
   ```

2. Verify date range includes data:
   ```sql
   SELECT MIN(invoice_date), MAX(invoice_date)
   FROM sales_demo;
   ```

3. Check browser console for errors

### Permission Errors

The migration includes GRANT statements for `authenticated`, `anon`, and `service_role`. If you see permission errors, verify these roles exist in your Supabase project.

## Related Documentation

- [Supabase Integration Summary](./mbic-supabase-integration.md)
- [PostgREST 1000-Row Limit Issue](./supabase-postgrest-limit-issue.md)
- [Sales Rep RPCs](../supabase/migrations/20241023160000_sales_rep_rpcs.sql)
- [Organization RPCs](../supabase/migrations/20241026_sales_org_rpcs_v2.sql)
