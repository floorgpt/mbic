-- RPC Functions for Dealer & Sales Pulse Dashboard
-- This migration creates 3 new RPC functions:
-- 1. sales_category_trends_by_month: Category sales with trend indicators and collection breakdown
-- 2. sales_reps_vs_targets: Rep performance vs monthly targets
-- 3. sales_by_county_fl: Florida sales aggregated by county regions

set search_path = public, extensions;

-- ============================================================================
-- 1. SALES CATEGORY TRENDS BY MONTH
-- Returns category sales for a specific month with trend vs prior month
-- and breakdown by collection (master_collection → collection hierarchy)
-- ============================================================================

drop function if exists public.sales_category_trends_by_month(date, text, text) cascade;

create function public.sales_category_trends_by_month(
  p_target_month date,  -- First day of the target month (e.g., '2025-08-01')
  p_category text default null,
  p_collection text default null
)
returns table (
  category_key text,
  display_name text,
  current_sales numeric,
  prior_sales numeric,
  trend_direction text,  -- 'up', 'down', or 'flat'
  trend_pct numeric,
  collections jsonb  -- Array of {collection_name, sales, share_pct}
)
language sql
stable
security definer
as $$
  with target_month_bounds as (
    select
      date_trunc('month', p_target_month)::date as month_start,
      (date_trunc('month', p_target_month) + interval '1 month')::date as month_end,
      (date_trunc('month', p_target_month) - interval '1 month')::date as prior_month_start,
      date_trunc('month', p_target_month)::date as prior_month_end
  ),
  current_month_sales as (
    select
      coalesce(s.collection, 'Uncategorized') as category_key,
      coalesce(s.collection, 'Uncategorized') as display_name,
      s.collection,
      sum(s.invoice_amount::numeric) as sales
    from sales_demo s
    cross join target_month_bounds tmb
    where s.invoice_date >= tmb.month_start
      and s.invoice_date < tmb.month_end
      and (p_category is null or s.collection = p_category)
      and (p_collection is null or s.collection = p_collection)
    group by s.collection
  ),
  prior_month_sales as (
    select
      coalesce(s.collection, 'Uncategorized') as category_key,
      sum(s.invoice_amount::numeric) as sales
    from sales_demo s
    cross join target_month_bounds tmb
    where s.invoice_date >= tmb.prior_month_start
      and s.invoice_date < tmb.prior_month_end
      and (p_category is null or s.collection = p_category)
      and (p_collection is null or s.collection = p_collection)
    group by s.collection
  ),
  category_totals as (
    select
      category_key,
      display_name,
      sum(sales) as current_total
    from current_month_sales
    group by category_key, display_name
  ),
  collection_breakdown as (
    select
      cms.category_key,
      jsonb_agg(
        jsonb_build_object(
          'collection_name', cms.collection,
          'sales', cms.sales,
          'share_pct', round((cms.sales / nullif(ct.current_total, 0)) * 100, 2)
        )
        order by cms.sales desc
      ) as collections
    from current_month_sales cms
    join category_totals ct on ct.category_key = cms.category_key
    group by cms.category_key
  )
  select
    ct.category_key,
    ct.display_name,
    ct.current_total as current_sales,
    coalesce(pms.sales, 0) as prior_sales,
    case
      when coalesce(pms.sales, 0) = 0 then 'up'
      when ct.current_total > pms.sales then 'up'
      when ct.current_total < pms.sales then 'down'
      else 'flat'
    end as trend_direction,
    case
      when coalesce(pms.sales, 0) = 0 then 100.0
      else round(((ct.current_total - pms.sales) / pms.sales) * 100, 2)
    end as trend_pct,
    coalesce(cb.collections, '[]'::jsonb) as collections
  from category_totals ct
  left join prior_month_sales pms on pms.category_key = ct.category_key
  left join collection_breakdown cb on cb.category_key = ct.category_key
  order by ct.current_total desc;
$$;

grant execute on function public.sales_category_trends_by_month(date, text, text) to authenticated, anon, service_role;

-- ============================================================================
-- 2. SALES REPS VS TARGETS
-- Returns rep sales vs monthly targets with achievement percentage
-- ============================================================================

drop function if exists public.sales_reps_vs_targets(date, date) cascade;

create function public.sales_reps_vs_targets(
  from_date date,
  to_date date
)
returns table (
  rep_id int,
  rep_name text,
  rep_initials text,
  total_sales numeric,
  target_amount numeric,
  achievement_pct numeric,
  status text  -- 'exceeded', 'on-track', 'below-target'
)
language sql
stable
security definer
as $$
  with rep_sales as (
    select
      s.rep_id,
      sr.rep_name,
      sum(s.invoice_amount::numeric) as total_sales
    from sales_demo s
    join sales_reps_demo sr on sr.rep_id = s.rep_id
    where s.invoice_date >= from_date
      and s.invoice_date < to_date
      and s.rep_id is not null
    group by s.rep_id, sr.rep_name
  ),
  rep_targets as (
    select
      rep_id,
      sum(target_amount) as total_target
    from sales_targets
    where target_month >= to_char(from_date, 'YYYY-MM')
      and target_month < to_char(to_date, 'YYYY-MM')
    group by rep_id
  )
  select
    rs.rep_id,
    rs.rep_name,
    upper(substring(rs.rep_name from 1 for 2)) as rep_initials,
    rs.total_sales,
    coalesce(rt.total_target, 200000.00) as target_amount,
    round((rs.total_sales / nullif(coalesce(rt.total_target, 200000.00), 0)) * 100, 2) as achievement_pct,
    case
      when rs.total_sales >= coalesce(rt.total_target, 200000.00) then 'exceeded'
      when rs.total_sales >= (coalesce(rt.total_target, 200000.00) * 0.80) then 'on-track'
      else 'below-target'
    end as status
  from rep_sales rs
  left join rep_targets rt on rt.rep_id = rs.rep_id
  order by rs.total_sales desc;
$$;

grant execute on function public.sales_reps_vs_targets(date, date) to authenticated, anon, service_role;

-- ============================================================================
-- 3. SALES BY COUNTY (FLORIDA)
-- Returns sales aggregated by Florida counties, grouped into regions
-- ============================================================================

drop function if exists public.sales_by_county_fl(date, date) cascade;

create function public.sales_by_county_fl(
  from_date date,
  to_date date
)
returns table (
  zip_code text,
  county text,
  region text,  -- 'South Florida', 'Central Florida', 'North Florida'
  revenue numeric,
  dealer_count int,
  order_count int
)
language sql
stable
security definer
as $$
  -- County mapping based on ZIP codes
  -- South FL: Miami-Dade (33xxx), Broward (33xxx), Palm Beach (33xxx, 334xx), Monroe (33xxx), Collier (34xxx), Lee (33xxx, 339xx)
  -- Central FL: Orange (32xxx, 328xx), Hillsborough (33xxx, 336xx), Pinellas (33xxx, 337xx), Polk (33xxx, 338xx)
  -- North FL: Duval (32xxx), Alachua (32xxx, 326xx), Leon (32xxx, 323xx)

  with zip_sales as (
    select
      c.dealer_billing_address_postal_code as zip_code,
      sum(s.invoice_amount::numeric) as revenue,
      count(distinct s.customer_id) as dealer_count,
      count(*) as order_count
    from sales_demo s
    join customers_demo c on c.customer_id = s.customer_id
    where s.invoice_date >= from_date
      and s.invoice_date < to_date
      and c.dealer_billing_address_state = 'FL'
      and c.dealer_billing_address_postal_code is not null
    group by c.dealer_billing_address_postal_code
  )
  select
    zs.zip_code,
    case
      -- South Florida counties
      when zs.zip_code like '330%' or zs.zip_code like '331%' or zs.zip_code like '332%' then 'Miami-Dade'
      when zs.zip_code like '333%' then 'Broward'
      when zs.zip_code like '334%' then 'Palm Beach'
      when zs.zip_code like '341%' or zs.zip_code like '349%' then 'Collier'
      when zs.zip_code like '339%' then 'Lee'
      -- Central Florida counties
      when zs.zip_code like '328%' then 'Orange'
      when zs.zip_code like '336%' then 'Hillsborough'
      when zs.zip_code like '337%' then 'Pinellas'
      when zs.zip_code like '338%' then 'Polk'
      -- North Florida counties
      when zs.zip_code like '322%' then 'Duval'
      when zs.zip_code like '326%' then 'Alachua'
      when zs.zip_code like '323%' then 'Leon'
      else 'Other Florida'
    end as county,
    case
      -- Region classification
      when zs.zip_code like '330%' or zs.zip_code like '331%' or zs.zip_code like '332%' or
           zs.zip_code like '333%' or zs.zip_code like '334%' or
           zs.zip_code like '341%' or zs.zip_code like '349%' or zs.zip_code like '339%'
        then 'South Florida'
      when zs.zip_code like '328%' or zs.zip_code like '336%' or zs.zip_code like '337%' or zs.zip_code like '338%'
        then 'Central Florida'
      when zs.zip_code like '322%' or zs.zip_code like '326%' or zs.zip_code like '323%'
        then 'North Florida'
      else 'Other Florida'
    end as region,
    zs.revenue,
    zs.dealer_count,
    zs.order_count
  from zip_sales zs
  order by zs.revenue desc;
$$;

grant execute on function public.sales_by_county_fl(date, date) to authenticated, anon, service_role;
