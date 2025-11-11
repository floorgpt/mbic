-- Enhanced Collection by Dealer with Color Preferences and Dealer IDs
-- This migration enhances the sales_ops_collection_by_dealer function to include:
-- - dealer_id for navigation purposes
-- - preferred_color (most purchased color/SKU)
-- - buying_power_pct (percentage of collection's total revenue)

set search_path = public, extensions;

-- Drop existing function
drop function if exists public.sales_ops_collection_by_dealer(text, date, date) cascade;

-- Create enhanced function
create function public.sales_ops_collection_by_dealer(
  p_collection text,
  from_date date,
  to_date date
)
returns table (
  dealer text,
  dealer_id int,
  revenue numeric,
  avg_price numeric,
  avg_cogs numeric,
  gross_margin numeric,
  gross_profit numeric,
  preferred_color text,
  buying_power_pct numeric
)
language sql
stable
security definer
as $$
  with sales_data as (
    select
      c.dealer_name as dealer,
      c.customer_id as dealer_id,
      s.invoice_amount::numeric as amount,
      coalesce(s.color, s.sku, 'N/A') as color
    from public.sales_demo s
    join public.customers_demo c on c.customer_id = s.customer_id
    where s.collection = p_collection
      and s.invoice_date >= from_date
      and s.invoice_date < to_date
  ),
  dealer_aggregates as (
    select
      dealer,
      dealer_id,
      coalesce(sum(amount), 0)::numeric as revenue,
      case
        when count(*) > 0 then (sum(amount) / count(*))
        else 0
      end::numeric as avg_price,
      case
        when count(*) > 0 then round((sum(amount) / count(*)) * 0.60, 2)
        else 0
      end as avg_cogs, -- Simulated: 60% of price
      40.0 as gross_margin, -- Simulated: 40% margin
      round(coalesce(sum(amount), 0) * 0.40, 2) as gross_profit -- Simulated: 40% profit
    from sales_data
    group by dealer, dealer_id
  ),
  color_preferences as (
    select distinct on (dealer, dealer_id)
      dealer,
      dealer_id,
      color as preferred_color
    from sales_data
    group by dealer, dealer_id, color
    order by dealer, dealer_id, sum(amount) desc
  ),
  total_collection_revenue as (
    select coalesce(sum(revenue), 1) as total_rev
    from dealer_aggregates
  )
  select
    da.dealer,
    da.dealer_id,
    da.revenue,
    da.avg_price,
    da.avg_cogs,
    da.gross_margin,
    da.gross_profit,
    cp.preferred_color,
    round((da.revenue / tcr.total_rev) * 100, 2) as buying_power_pct
  from dealer_aggregates da
  left join color_preferences cp on cp.dealer = da.dealer and cp.dealer_id = da.dealer_id
  cross join total_collection_revenue tcr
  order by da.revenue desc;
$$;

-- Grant execute permissions
grant execute on function public.sales_ops_collection_by_dealer(text, date, date) to authenticated, anon, service_role;
