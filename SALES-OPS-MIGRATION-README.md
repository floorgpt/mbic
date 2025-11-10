# 🚀 Sales Ops Migration - Quick Start

## What's Missing

Your sales-ops page at https://cpf-mbic2.netlify.app/sales-ops is currently showing **no data** because **13 RPC functions are missing** from Supabase.

## What I Created

✅ **Migration File**: `supabase/migrations/20250107_sales_ops_rpcs_v3.sql` ⬅️ **USE THIS ONE**
✅ **14 RPC Functions** to power the sales-ops dashboard
✅ **Documentation**: `docs/sales-ops-migration-guide.md`
✅ **Verification Script**: `scripts/verify-salesops-migration.mjs`

## Quick Apply (Use V3!) ⭐

### Option 1: Supabase Dashboard (Easiest)

1. **Open**: https://supabase.com/dashboard/project/sqhqzrtmjspwqqhnjtss/sql/new
2. **Copy** all SQL from: `supabase/migrations/20250107_sales_ops_rpcs_v3.sql` ⬅️ **V3**
3. **Paste** into SQL Editor
4. **Click** "Run"
5. **Verify**: Run `node scripts/verify-salesops-migration.mjs`

### Option 2: Supabase CLI

```bash
cd /Users/jaimacmini/Documents/mbic-poc
supabase db push
```

## What Gets Fixed

| Feature | Before | After |
|---------|--------|-------|
| **Gross Revenue Card** | Shows $0 | Shows $6.1M YTD ✅ |
| **Top Collections Card** | Empty | Shows clickable tiles ✅ |
| **Fill Rate KPI** | N/A | Shows 85% (simulated) ⚠️ |
| **Inventory Turnover** | N/A | Shows 4.2x (simulated) ⚠️ |
| **Future Opportunities** | Empty | Shows loss opportunities ✅ |

## Functions Created

### ✅ Real Data (Uses existing sales_demo table)
- `sales_ops_category_kpis` - Category-level revenue/profit
- `sales_ops_kpis_by_collection` - Collection performance
- `sales_ops_dealer_bounce_rate` - Calculated churn rate
- `list_future_sale_opps_open` - From loss_opportunities

### ⚠️ Simulated Data (Placeholders for future tables)
- `sales_ops_fill_rate` - 85% (needs order data)
- `sales_ops_import_lead_time` - 45 days (needs POs)
- `sales_ops_forecast_accuracy` - 78% (needs forecasts)
- `sales_ops_inventory_turnover` - 4.2x (needs inventory)
- `ops_reports_made_by_month` - Random (needs ops_reports)
- `ops_comm_consistency_index` - 92% (needs comm tracking)
- `list_incoming_stock_by_collection` - Empty (needs POs)

## Verify It Worked

```bash
node scripts/verify-salesops-migration.mjs
```

Expected output:
```
✅ sales_ops_category_kpis              X rows
✅ sales_ops_kpis_by_collection         Y rows
...
🎉 SUCCESS! All Sales Ops RPC functions are working!
```

## Next Steps

1. **Apply the migration** (see Quick Apply above)
2. **Visit**: https://cpf-mbic2.netlify.app/sales-ops
3. **Verify** Gross Revenue and Top Collections show data
4. **Future**: Replace simulated metrics with real tables

## Full Documentation

See detailed guide: [docs/sales-ops-migration-guide.md](docs/sales-ops-migration-guide.md)

## Why Some Metrics Are Simulated

The Sales Ops page expects tables that don't exist yet:
- `inventory_summary` - For turnover calculations
- `purchase_orders` - For lead times and incoming stock
- `sales_forecasts` - For forecast accuracy
- `ops_reports` - For report tracking
- `communications_log` - For consistency metrics

These can be added later - the important parts (Gross Revenue and Collections) use real sales data.

## Questions?

- Migration issues? Check [docs/sales-ops-migration-guide.md](docs/sales-ops-migration-guide.md) "Troubleshooting" section
- Data structure? See [docs/mbic-supabase-integration.md](docs/mbic-supabase-integration.md)
- PostgREST limits? See [docs/supabase-postgrest-limit-issue.md](docs/supabase-postgrest-limit-issue.md)
