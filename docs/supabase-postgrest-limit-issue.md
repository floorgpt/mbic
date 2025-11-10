# Supabase PostgREST 1000-Row Limit Issue

## Problem Discovery

During validation of sales data for Juan Pedro Boscan (rep_id: 1), we discovered a critical discrepancy:

- **RPC Function Result**: $1,611,458.68 (3,670 invoices)
- **Raw Query Result**: $389,410.08 (1,000 invoices)
- **Missing Data**: $1,222,048.60 (76% of total revenue)

## Root Cause

**Supabase PostgREST has a hard-coded maximum row limit of 1,000** that cannot be overridden, even with:
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`)
- `.limit(1000000)` parameter
- `.range(0, 999999)` parameter

This is a **PostgREST configuration setting** at the Supabase project level, not a client-side issue.

## Test Results

```javascript
// Query WITHOUT .limit()
.select('*').eq('rep_id', 1)
// Returns: 1000 rows, Count: 3670

// Query WITH .limit(1000000)
.select('*').eq('rep_id', 1).limit(1000000)
// Returns: 1000 rows, Count: 3670 ❌

// Query WITH .range()
.select('*').eq('rep_id', 1).range(0, 999999)
// Returns: 1000 rows, Count: 3670 ❌
```

## Impact

### Affected Functions (lib/db/sales.ts):
1. `fetchSalesRange()` - Returns max 1,000 invoices per query
2. `fetchCustomerNames()` - Returns max 1,000 customers
3. `fetchRepNames()` - Returns max 1,000 reps (currently fine)
4. `aggregateDealers()` - Works on truncated data
5. `aggregateCollections()` - Works on truncated data
6. `aggregateReps()` - Works on truncated data

### Affected Sales Reps:
- **Juan Pedro Boscan** (1): 3,670 invoices → only 1,000 returned (73% missing)
- **Leonardo Lusinchi** (4): 2,241 invoices → only 1,000 returned (55% missing)
- **Joaquin Izquierdo** (5): 2,562 invoices → only 1,000 returned (61% missing)
- **Eileen Cardenas** (6): 1,438 invoices → only 1,000 returned (30% missing)
- **Carolina Concepcion** (7): 1,070 invoices → only 1,000 returned (7% missing)
- **Esteban Gavotti** (8): 2,182 invoices → only 1,000 returned (54% missing)
- **Chris Harris** (10): 1,291 invoices → only 1,000 returned (23% missing)

### Unaffected Reps (< 1,000 invoices):
- Angela Milazzo (9): 894 invoices ✅
- Jorge Guerrero (3): 102 invoices ✅
- Valentina Rincon (11): 12 invoices ✅

## Solution

### Option 1: Use RPC Functions Exclusively (RECOMMENDED)

RPC functions return **pre-aggregated data** from Postgres and bypass the PostgREST row limit.

**Existing RPC Functions:**
- `sales_rep_kpis(p_rep_id, p_from, p_to)` - Returns KPIs for a rep
- `sales_rep_monthly(p_rep_id, p_from, p_to)` - Returns monthly totals
- `sales_rep_dealers(p_rep_id, p_from, p_to, p_limit, p_offset)` - Returns dealer breakdowns
- `sales_org_kpis_v2(from_date, to_date)` - Organization-level KPIs
- `sales_org_monthly_v2(from_date, to_date)` - Organization monthly data
- `sales_org_top_dealers(from_date, to_date, limit, offset)` - Top dealers
- `sales_org_top_reps(from_date, to_date, limit, offset)` - Top reps

**Status**: ✅ Already implemented in `lib/mbic-sales.ts` and `lib/mbic-supabase.ts`

### Option 2: Pagination with Raw Queries

Implement pagination to fetch data in chunks of 1,000 rows:

```typescript
async function fetchAllSalesForRep(repId: number): Promise<SalesRow[]> {
  const batchSize = 1000;
  let offset = 0;
  const allRows: SalesRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('sales_demo')
      .select('*')
      .eq('rep_id', repId)
      .range(offset, offset + batchSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRows.push(...data);
    if (data.length < batchSize) break;
    offset += batchSize;
  }

  return allRows;
}
```

**Status**: ⚠️ Not recommended - Multiple round trips, slower performance

### Option 3: Increase PostgREST Limit (REQUIRES SUPABASE ADMIN)

Contact Supabase support or modify PostgREST configuration:

```sql
-- In your Supabase project settings or PostgREST config
ALTER DATABASE postgres SET pgrst.max_rows = 100000;
```

**Status**: 🔒 Requires Supabase project admin access

## Recommendation

**Use RPC functions exclusively** for all sales data queries. The current implementation in `lib/mbic-sales.ts` and `lib/mbic-supabase.ts` already follows this pattern and returns correct data.

### Action Items:

1. ✅ Keep RPC-based queries in `lib/mbic-sales.ts`
2. ✅ Keep RPC-based queries in `lib/mbic-supabase.ts`
3. ⚠️ Deprecate raw queries in `lib/db/sales.ts` OR add pagination
4. ⚠️ Deprecate `lib/supabase/queries.ts` (uses raw queries with `cache()`)
5. ✅ Dashboard already uses RPC functions via `lib/mbic-supabase.ts`

## Validation

Run the validation script to confirm data consistency:

```bash
node scripts/validate-sales-data.mjs
```

Expected result: All reps should show ✅ when using RPC functions.

## References

- [PostgREST Max Rows Configuration](https://postgrest.org/en/stable/references/api/tables_views.html#limits-and-pagination)
- [Supabase Limits Documentation](https://supabase.com/docs/guides/platform/limits)
