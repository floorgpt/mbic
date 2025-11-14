-- RPC Function for Dealer Activity Month Details
-- This provides comprehensive month data for the drawer storytelling
-- including revenue, dealer engagement changes, and reactivated dealers

set search_path = public, extensions;

-- ============================================================================
-- 1. DEALER ACTIVITY MONTH DETAILS
-- Returns comprehensive data for a specific month including:
-- - Active dealer count and percentage
-- - Total revenue
-- - Comparison with prior month (revenue & engagement)
-- - Reactivated dealers (60, 90, 120 day periods)
-- ============================================================================

drop function if exists public.dealer_activity_month_details(date) cascade;

create function public.dealer_activity_month_details(
  p_target_month date  -- First day of the target month (e.g., '2025-08-01')
)
returns table (
  -- Current month metrics
  month_date date,
  active_dealers integer,
  total_dealers integer,
  active_pct numeric,
  total_revenue numeric,

  -- Prior month metrics
  prior_month_date date,
  prior_active_dealers integer,
  prior_total_dealers integer,
  prior_active_pct numeric,
  prior_total_revenue numeric,

  -- Trend calculations
  revenue_change_pct numeric,
  engagement_change_pct numeric,
  revenue_trend text,  -- 'increase' or 'decrease'
  engagement_trend text  -- 'increase' or 'decrease'
)
language sql
stable
security definer
as $$
  with month_bounds as (
    select
      date_trunc('month', p_target_month)::date as current_month_start,
      (date_trunc('month', p_target_month) + interval '1 month')::date as current_month_end,
      (date_trunc('month', p_target_month) - interval '1 month')::date as prior_month_start,
      date_trunc('month', p_target_month)::date as prior_month_end
  ),
  total_assigned_dealers as (
    -- Count all assigned dealers (excluding Dismissed and Intercompany)
    select count(distinct customer_id) as total_dealers
    from customers_demo
    where rep_id not in (14, 15)
  ),
  current_month_data as (
    select
      count(distinct s.customer_id) as active_dealers,
      sum(s.invoice_amount::numeric) as total_revenue
    from sales_demo s
    join customers_demo c on c.customer_id = s.customer_id
    cross join month_bounds mb
    where c.rep_id not in (14, 15)  -- Exclude Dismissed and Intercompany
      and s.invoice_date >= mb.current_month_start
      and s.invoice_date < mb.current_month_end
  ),
  prior_month_data as (
    select
      count(distinct s.customer_id) as active_dealers,
      sum(s.invoice_amount::numeric) as total_revenue
    from sales_demo s
    join customers_demo c on c.customer_id = s.customer_id
    cross join month_bounds mb
    where c.rep_id not in (14, 15)  -- Exclude Dismissed and Intercompany
      and s.invoice_date >= mb.prior_month_start
      and s.invoice_date < mb.prior_month_end
  )
  select
    (select current_month_start from month_bounds) as month_date,
    cmd.active_dealers::integer,
    tad.total_dealers::integer,
    round((cmd.active_dealers::numeric / nullif(tad.total_dealers, 0)) * 100, 2) as active_pct,
    coalesce(cmd.total_revenue, 0) as total_revenue,

    (select prior_month_start from month_bounds) as prior_month_date,
    pmd.active_dealers::integer,
    tad.total_dealers::integer as prior_total_dealers,
    round((pmd.active_dealers::numeric / nullif(tad.total_dealers, 0)) * 100, 2) as prior_active_pct,
    coalesce(pmd.total_revenue, 0) as prior_total_revenue,

    -- Revenue change percentage
    case
      when pmd.total_revenue = 0 or pmd.total_revenue is null then 100
      else round(((cmd.total_revenue - pmd.total_revenue) / pmd.total_revenue) * 100, 2)
    end as revenue_change_pct,

    -- Engagement change percentage (active dealer %)
    round(
      (cmd.active_dealers::numeric / nullif(tad.total_dealers, 0) * 100) -
      (pmd.active_dealers::numeric / nullif(tad.total_dealers, 0) * 100),
      2
    ) as engagement_change_pct,

    -- Trend indicators
    case
      when cmd.total_revenue >= coalesce(pmd.total_revenue, 0) then 'increase'
      else 'decrease'
    end as revenue_trend,

    case
      when (cmd.active_dealers::numeric / nullif(tad.total_dealers, 0)) >=
           (pmd.active_dealers::numeric / nullif(tad.total_dealers, 0)) then 'increase'
      else 'decrease'
    end as engagement_trend

  from current_month_data cmd
  cross join prior_month_data pmd
  cross join total_assigned_dealers tad;
$$;

-- ============================================================================
-- 2. REACTIVATED DEALERS BY PERIOD
-- Returns dealers who made a purchase in the target month after being inactive
-- for 60, 90, or 120 days
-- ============================================================================

drop function if exists public.reactivated_dealers_by_month(date) cascade;

create function public.reactivated_dealers_by_month(
  p_target_month date  -- First day of the target month (e.g., '2025-08-01')
)
returns table (
  customer_id integer,
  dealer_name text,
  rep_name text,
  last_purchase_date date,
  days_inactive integer,
  reactivation_period text,  -- '60-89 days', '90-119 days', '120+ days'
  current_month_revenue numeric,
  current_month_orders integer
)
language sql
stable
security definer
as $$
  with month_bounds as (
    select
      date_trunc('month', p_target_month)::date as month_start,
      (date_trunc('month', p_target_month) + interval '1 month')::date as month_end
  ),
  -- Get all sales in target month
  current_month_sales as (
    select
      s.customer_id,
      sum(s.invoice_amount::numeric) as revenue,
      count(*) as order_count
    from sales_demo s
    cross join month_bounds mb
    where s.invoice_date >= mb.month_start
      and s.invoice_date < mb.month_end
    group by s.customer_id
  ),
  -- Get last purchase date before target month for each dealer
  prior_purchases as (
    select
      s.customer_id,
      max(s.invoice_date) as last_purchase_date
    from sales_demo s
    cross join month_bounds mb
    where s.invoice_date < mb.month_start
    group by s.customer_id
  )
  select
    c.customer_id,
    c.dealer_name,
    coalesce(sr.rep_name, 'Unassigned') as rep_name,
    pp.last_purchase_date,
    (select month_start from month_bounds)::date - pp.last_purchase_date as days_inactive,
    case
      when (select month_start from month_bounds)::date - pp.last_purchase_date >= 120 then '120+ days'
      when (select month_start from month_bounds)::date - pp.last_purchase_date >= 90 then '90-119 days'
      when (select month_start from month_bounds)::date - pp.last_purchase_date >= 60 then '60-89 days'
      else 'Less than 60 days'
    end as reactivation_period,
    cms.revenue as current_month_revenue,
    cms.order_count as current_month_orders
  from customers_demo c
  join current_month_sales cms on cms.customer_id = c.customer_id
  join prior_purchases pp on pp.customer_id = c.customer_id
  left join sales_reps_demo sr on sr.rep_id = c.rep_id
  where c.rep_id not in (14, 15)  -- Exclude Dismissed and Intercompany
    and (select month_start from month_bounds)::date - pp.last_purchase_date >= 60
  order by days_inactive desc, cms.revenue desc;
$$;

-- ============================================================================
-- 3. ACTIVE DEALERS LIST FOR MONTH
-- Returns list of all active dealers in a specific month
-- ============================================================================

drop function if exists public.active_dealers_by_month(date) cascade;

create function public.active_dealers_by_month(
  p_target_month date  -- First day of the target month (e.g., '2025-08-01')
)
returns table (
  customer_id integer,
  dealer_name text,
  rep_name text,
  total_revenue numeric,
  order_count integer
)
language sql
stable
security definer
as $$
  with month_bounds as (
    select
      date_trunc('month', p_target_month)::date as month_start,
      (date_trunc('month', p_target_month) + interval '1 month')::date as month_end
  )
  select
    c.customer_id,
    c.dealer_name,
    coalesce(sr.rep_name, 'Unassigned') as rep_name,
    sum(s.invoice_amount::numeric) as total_revenue,
    count(*)::integer as order_count
  from customers_demo c
  join sales_demo s on s.customer_id = c.customer_id
  left join sales_reps_demo sr on sr.rep_id = c.rep_id
  cross join month_bounds mb
  where c.rep_id not in (14, 15)  -- Exclude Dismissed and Intercompany
    and s.invoice_date >= mb.month_start
    and s.invoice_date < mb.month_end
  group by c.customer_id, c.dealer_name, sr.rep_name
  order by total_revenue desc;
$$;

-- ============================================================================
-- 4. INACTIVE DEALERS LIST FOR MONTH
-- Returns list of all inactive dealers in a specific month (assigned but no sales)
-- ============================================================================

drop function if exists public.inactive_dealers_by_month(date) cascade;

create function public.inactive_dealers_by_month(
  p_target_month date  -- First day of the target month (e.g., '2025-08-01')
)
returns table (
  customer_id integer,
  dealer_name text,
  rep_name text,
  last_purchase_date date,
  days_inactive integer
)
language sql
stable
security definer
as $$
  with month_bounds as (
    select
      date_trunc('month', p_target_month)::date as month_start,
      (date_trunc('month', p_target_month) + interval '1 month')::date as month_end
  ),
  active_in_month as (
    select distinct s.customer_id
    from sales_demo s
    cross join month_bounds mb
    where s.invoice_date >= mb.month_start
      and s.invoice_date < mb.month_end
  ),
  last_purchases as (
    select
      customer_id,
      max(invoice_date) as last_purchase_date
    from sales_demo
    group by customer_id
  )
  select
    c.customer_id,
    c.dealer_name,
    coalesce(sr.rep_name, 'Unassigned') as rep_name,
    lp.last_purchase_date,
    case
      when lp.last_purchase_date is null then null
      else (select month_start from month_bounds)::date - lp.last_purchase_date
    end as days_inactive
  from customers_demo c
  left join active_in_month aim on aim.customer_id = c.customer_id
  left join last_purchases lp on lp.customer_id = c.customer_id
  left join sales_reps_demo sr on sr.rep_id = c.rep_id
  where c.rep_id not in (14, 15)  -- Exclude Dismissed and Intercompany
    and aim.customer_id is null
  order by days_inactive desc nulls last, c.dealer_name;
$$;

-- Grant execute permissions
grant execute on function public.dealer_activity_month_details(date) to authenticated, anon;
grant execute on function public.reactivated_dealers_by_month(date) to authenticated, anon;
grant execute on function public.active_dealers_by_month(date) to authenticated, anon;
grant execute on function public.inactive_dealers_by_month(date) to authenticated, anon;
