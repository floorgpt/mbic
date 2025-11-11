# Apply Collection Dealer Enhancement

This document explains how to apply the SQL migration that enhances the `sales_ops_collection_by_dealer` function with executive insights.

## What Does This Migration Add?

The enhanced function adds three new fields to help C-level executives understand dealer performance at a glance:

1. **dealer_id** - Allows navigation to dealer details in the Sales page
2. **preferred_color** - The most purchased color/SKU for that dealer
3. **buying_power_pct** - Each dealer's percentage of the collection's total revenue (80/20 principle)

## How to Apply the Migration

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to: **SQL Editor** (left sidebar)
3. Click **New Query**

### Step 2: Run the Migration SQL

Copy the entire contents of this file:
```
supabase/migrations/20250111_enhance_collection_by_dealer.sql
```

Paste it into the SQL Editor and click **Run** or press `Ctrl+Enter` (Cmd+Enter on Mac).

### Step 3: Verify the Migration

Run this test query in the SQL Editor:

```sql
SELECT * FROM sales_ops_collection_by_dealer('Spirit', '2025-01-01', '2025-11-10')
LIMIT 5;
```

You should see columns including:
- `dealer`
- `dealer_id`  ← NEW
- `revenue`
- `avg_price`
- `avg_cogs`
- `gross_margin`
- `gross_profit`
- `preferred_color` ← NEW
- `buying_power_pct` ← NEW

### Step 4: Refresh the Application

Once the migration is applied, refresh your browser. The Top Collections drawer will now display:

**Executive Summary:**
- "From your [N] active dealers, [X%] of purchase volume goes to your top 5 dealers, and [Color] is the preferred choice."

**Top 5 Dealers Section:**
- Highlighted cards with buying power %
- Preferred color for each dealer
- Eye icon to navigate to dealer details

**Paginated Dealer List:**
- Shows 5 dealers at a time
- Sortable by revenue
- Quick navigation to dealer details

## Troubleshooting

### If the migration fails:

1. **Check for syntax errors** - Ensure the entire SQL was copied correctly
2. **Check permissions** - You need admin/service_role access
3. **Check existing function** - The migration will drop and recreate the function

### If data doesn't appear:

1. **Verify the function exists**:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'sales_ops_collection_by_dealer';
   ```

2. **Check for data**:
   ```sql
   SELECT count(*) FROM sales_demo WHERE collection = 'Spirit';
   ```

3. **Test the function directly**:
   ```sql
   SELECT dealer, dealer_id, preferred_color, buying_power_pct
   FROM sales_ops_collection_by_dealer('Spirit', '2025-01-01', '2025-11-10')
   LIMIT 3;
   ```

## Alternative: Apply via Command Line

If you have `psql` installed and access to the `DATABASE_URL`:

```bash
psql "$DATABASE_URL" -f supabase/migrations/20250111_enhance_collection_by_dealer.sql
```

## Rollback (if needed)

If you need to rollback to the previous version:

```sql
drop function if exists public.sales_ops_collection_by_dealer(text, date, date) cascade;

-- Then re-run the original migration from:
-- supabase/migrations/20250107_sales_ops_rpcs_v3.sql
-- (lines 179-222 only - the sales_ops_collection_by_dealer function)
```
