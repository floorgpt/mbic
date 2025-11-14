-- Fix the sales_org_dealer_engagement_trailing_v3 RPC to use correct dealer counts
-- This ensures the bar chart matches the drawer percentages

set search_path = public, extensions;

drop function if exists public.sales_org_dealer_engagement_trailing_v3(date, date) cascade;

create or replace function public.sales_org_dealer_engagement_trailing_v3(
  from_date date,
  to_date date
)
returns table (
  month date,
  active_cnt integer,
  inactive_cnt integer,
  total_assigned integer,
  active_pct numeric
)
language sql
stable
security definer
as $$
  with total_assigned_dealers as (
    -- Count all assigned dealers (excluding Dismissed rep_id=14 and Intercompany rep_id=15)
    select count(distinct customer_id)::integer as total
    from customers_demo
    where rep_id not in (14, 15)
  ),
  month_series as (
    select generate_series(
      date_trunc('month', from_date)::date,
      date_trunc('month', to_date)::date,
      '1 month'::interval
    )::date as month_start
  ),
  monthly_activity as (
    select
      date_trunc('month', s.invoice_date)::date as month_start,
      count(distinct s.customer_id)::integer as active_cnt
    from sales_demo s
    join customers_demo c on c.customer_id = s.customer_id
    where c.rep_id not in (14, 15)  -- Exclude Dismissed and Intercompany
      and s.invoice_date >= from_date
      and s.invoice_date <= to_date
    group by date_trunc('month', s.invoice_date)::date
  )
  select
    ms.month_start as month,
    coalesce(ma.active_cnt, 0) as active_cnt,
    (tad.total - coalesce(ma.active_cnt, 0))::integer as inactive_cnt,
    tad.total as total_assigned,
    round(
      (coalesce(ma.active_cnt, 0)::numeric / nullif(tad.total, 0)) * 100,
      2
    ) as active_pct
  from month_series ms
  cross join total_assigned_dealers tad
  left join monthly_activity ma on ma.month_start = ms.month_start
  order by ms.month_start;
$$;

grant execute on function public.sales_org_dealer_engagement_trailing_v3(date, date) to authenticated, anon;
