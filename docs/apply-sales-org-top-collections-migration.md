# Apply sales_org_top_collections Migration

The `sales_org_top_collections` function needs to be created/updated in your Supabase database to fix the console error.

## Option 1: Apply via Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to: **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the SQL below:

```sql
-- Create or replace the sales_org_top_collections function
create or replace function public.sales_org_top_collections(
  from_date date,
  to_date date,
  top_n int
)
returns table (
  collection text,
  revenue numeric,
  share_pct numeric
)
language sql
stable
security definer
as $$
  with base as (
    select
      collection,
      sum(invoice_amount)::numeric as revenue
    from public.sales_demo
    where invoice_date >= from_date
      and invoice_date < to_date
    group by collection
  ),
  ttl as (
    select coalesce(sum(revenue), 0)::numeric as total from base
  )
  select
    base.collection,
    base.revenue,
    case
      when ttl.total = 0 then 0
      else round((base.revenue / ttl.total) * 100, 2)
    end as share_pct
  from base, ttl
  order by base.revenue desc
  limit top_n;
$$;

-- Grant permissions
grant execute on function public.sales_org_top_collections(date, date, int) to authenticated, anon, service_role;
```

5. Click **Run** or press `Ctrl+Enter` (Cmd+Enter on Mac)

## Option 2: Apply All Missing Migrations

If you want to apply all missing migrations at once, run this file:

```bash
psql "$DATABASE_URL" -f supabase/migrations/20241024_sales_org_rpcs.sql
```

## Verify the Migration

After applying, refresh your dashboard page. The console error should be gone and you should see the Top Collections data loading properly.

## Troubleshooting

If you still see errors:

1. **Check the function exists:**
   ```sql
   SELECT proname, pronargs
   FROM pg_proc
   WHERE proname = 'sales_org_top_collections';
   ```
   Should show `pronargs = 3` (3 parameters)

2. **Test the function directly:**
   ```sql
   SELECT * FROM sales_org_top_collections('2025-01-01', '2025-10-01', 20);
   ```

3. **Clear Supabase cache:**
   - Sometimes you need to wait a few seconds for Supabase to refresh its schema cache
   - Try refreshing your app after 10-15 seconds
