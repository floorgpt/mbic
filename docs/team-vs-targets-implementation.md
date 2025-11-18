# Team vs Targets Chart - Implementation Summary

## Overview
Phase 6 of Dealer Pulse: A horizontal bar chart showing sales rep performance against monthly targets with gradient color coding.

## Features Implemented

### 1. Gradient Color System
Performance-based color gradients for intuitive visual feedback:

| Achievement % | Color Range | Hex Values |
|--------------|-------------|------------|
| < 50% | Red | `#ef4444` |
| 51-70% | Red → Yellow | `#ef4444` → `#eab308` |
| 71-85% | Yellow → Pale Green | `#eab308` → `#84cc16` |
| 86-100%+ | Pale Green → Vivid Green | `#84cc16` → `#22c55e` |

### 2. Data Filtering
- Excludes "Dismissed" and "Intercompany" reps
- Uses `.trim().toLowerCase()` to handle trailing spaces in rep names
- Only shows active sales representatives

### 3. Chart Features
- **Layout**: Horizontal bar chart (vertical layout in Recharts)
- **Y-Axis**: All sales rep initials displayed (`interval={0}`)
- **X-Axis**: Formatted as `$XXXk` for readability
- **Reference Line**: Dashed line at target amount ($200k default)
- **Dynamic Height**: `Math.max(220, teamVsTargets.length * 25)` - scales with number of reps
- **Tooltip**: Shows rep name, actual sales, target, variance %, and achievement %

### 4. Database Schema

#### RPC Function: `team_vs_targets_month(p_target_month text)`
Returns performance metrics for all reps in a given month:

```sql
RETURNS TABLE (
  rep_id bigint,
  rep_name text,
  rep_initials text,
  target_amount numeric,
  actual_sales numeric,
  variance_amount numeric,
  variance_pct numeric,
  achievement_pct numeric,
  status text
)
```

**Key SQL Logic:**
- Joins `sales_reps_demo`, `sales_demo`, and `sales_targets`
- Aggregates sales by `invoice_amount` for the target month
- Calculates variance: `(actual - target) / target * 100`
- Calculates achievement: `(actual / target) * 100`
- Extracts initials from rep name (e.g., "Juan Pedro" → "JP")
- Orders by `actual_sales DESC`

#### Schema Fixes Applied
- Changed `sales_targets.rep_id` from `INTEGER` to `BIGINT`
- Matches `sales_reps_demo.rep_id` type (BIGINT)
- Required `DROP FUNCTION` before `CREATE OR REPLACE` when changing return type

## Files Modified

### Frontend
- `components/dashboard/dealer-sales-pulse.tsx`
  - Added `getAchievementColor(achievementPct)` function
  - Added `interpolateColor(color1, color2, ratio)` function
  - Team vs Targets chart component with filtering
  - Fetch logic with rep filtering

### Backend
- `app/api/team-vs-targets/route.ts` (already existed)
  - GET endpoint: `/api/team-vs-targets?targetMonth=YYYY-MM-DD`
  - Calls `team_vs_targets_month` RPC
  - Returns graceful empty array on error

### Database Migrations
1. `supabase/migrations/20250113_create_sales_targets_table.sql`
   - Updated `rep_id` from `INTEGER` to `BIGINT`

2. `supabase/migrations/20250114_team_vs_targets_rpc.sql`
   - Creates `team_vs_targets_month` RPC function
   - Includes `DROP FUNCTION IF EXISTS` for idempotency

3. `supabase/migrations/20250114_fix_team_vs_targets_complete.sql`
   - Combined migration for easy application
   - Alters table + drops + creates function

### Helper Scripts
- `scripts/fix-team-vs-targets.mjs`
  - Tests the RPC function
  - Shows sample results

## Testing

### Manual Test
1. Refresh browser at `http://localhost:3001/`
2. Click on any month bar in Dealer Pulse chart
3. Verify Team vs Targets chart displays:
   - All active reps (no "Dismissed" or "Intercompany")
   - Gradient colors based on performance
   - All initials visible on Y-axis
   - Tooltip shows correct metrics

### API Test
```bash
curl "http://localhost:3001/api/team-vs-targets?targetMonth=2025-01-15"
```

Expected: JSON with 13 reps (15 total - 2 filtered out)

## Migration Steps (Already Applied)

If you need to re-apply:

1. Open Supabase SQL Editor
2. Copy contents of `supabase/migrations/20250114_fix_team_vs_targets_complete.sql`
3. Run in SQL Editor
4. Verify function exists: `SELECT * FROM team_vs_targets_month('2025-01')`

## Known Issues & Solutions

### Issue 1: "structure of query does not match function result type"
**Cause**: `rep_id` type mismatch (INTEGER vs BIGINT)
**Solution**: Changed to BIGINT in both table and function

### Issue 2: "cannot change return type of existing function"
**Cause**: CREATE OR REPLACE cannot change return columns
**Solution**: Added `DROP FUNCTION IF EXISTS` before CREATE

### Issue 3: Dismissed/Intercompany reps showing in chart
**Cause**: Rep names have trailing spaces in database
**Solution**: Filter with `.trim().toLowerCase()`

### Issue 4: Column name error "s.total does not exist"
**Cause**: Wrong column name in SUM aggregation
**Solution**: Changed `SUM(s.total)` to `SUM(s.invoice_amount)`

## Performance Metrics

- **API Response Time**: ~100-200ms
- **Chart Render**: Instant (client-side)
- **Data Volume**: ~15 reps × 12 months = 180 target records/year

## Future Enhancements

- [ ] Add drill-down to rep details on bar click
- [ ] Show historical trend line
- [ ] Add target adjustment UI
- [ ] Export chart as image/PDF
- [ ] Add team-level aggregation view
- [ ] Support custom date ranges beyond monthly

## Related Documentation

- [Dealer Pulse Enhancements](../DEALER-PULSE-ENHANCEMENTS.md)
- [Sales Targets Schema](../supabase/migrations/20250113_create_sales_targets_table.sql)
- [Team vs Targets RPC](../supabase/migrations/20250114_team_vs_targets_rpc.sql)
