-- Sales Ops RPCs for operational KPIs and analytics
-- These functions support the sales-ops dashboard with category-level,
-- collection-level, and operational metrics.
--
-- Note: Some functions return placeholder/simulated data for metrics
-- that require tables not yet in the schema (inventory, forecasts, etc.)

set search_path = public, extensions;

-- ============================================================================
-- CATEGORY-LEVEL KPIs
-- ============================================================================

create or replace function public.sales_ops_category_kpis(
  from_date date,
  to_date date
)
returns table (
  category_key text,
  gross_revenue numeric,
  avg_price numeric,
  avg_cogs numeric,
  gross_margin numeric,
  gross_profit numeric,
  volume int
)
language sql
stable
security definer
as $$
  with sales_by_category as (
    select
      coalesce(s.collection, 'Uncategorized') as category_key,
      s.invoice_amount::numeric as amount,
      1 as invoice_count
    from public.sales_demo s
    where s.invoice_date >= from_date
      and s.invoice_date < to_date
  ),
  aggregated as (
    select
      category_key,
      coalesce(sum(amount), 0)::numeric as gross_revenue,
      count(*)::int as volume,
      case
        when count(*) > 0 then (sum(amount) / count(*))
        else 0
      end::numeric as avg_price
    from sales_by_category
    group by category_key
  )
  select
    a.category_key,
    a.gross_revenue,
    a.avg_price,
    round(a.avg_price * 0.60, 2) as avg_cogs, -- Simulated: 60% of price
    round((a.avg_price - (a.avg_price * 0.60)) / a.avg_price * 100, 2) as gross_margin, -- Simulated: 40% margin
    round(a.gross_revenue * 0.40, 2) as gross_profit, -- Simulated: 40% profit
    a.volume
  from aggregated a
  order by a.gross_revenue desc;
$$;

create or replace function public.sales_ops_category_kpis_monthly(
  from_date date,
  to_date date
)
returns table (
  bucket_month text,
  category_key text,
  gross_revenue numeric,
  gross_profit numeric,
  gross_margin numeric
)
language sql
stable
security definer
as $$
  select
    to_char(date_trunc('month', s.invoice_date), 'YYYY-MM') as bucket_month,
    coalesce(s.collection, 'Uncategorized') as category_key,
    coalesce(sum(s.invoice_amount), 0)::numeric as gross_revenue,
    round(coalesce(sum(s.invoice_amount), 0) * 0.40, 2) as gross_profit, -- Simulated: 40% margin
    40.0 as gross_margin -- Simulated: 40% margin
  from public.sales_demo s
  where s.invoice_date >= from_date
    and s.invoice_date < to_date
  group by bucket_month, category_key
  order by bucket_month, gross_revenue desc;
$$;

-- ============================================================================
-- COLLECTION-LEVEL KPIs
-- ============================================================================

create or replace function public.sales_ops_kpis_by_collection(
  from_date date,
  to_date date
)
returns table (
  collection text,
  gross_revenue numeric,
  gross_profit numeric,
  gross_margin numeric,
  volume int
)
language sql
stable
security definer
as $$
  with sales_by_collection as (
    select
      coalesce(s.collection, 'Uncategorized') as collection,
      s.invoice_amount::numeric as amount
    from public.sales_demo s
    where s.invoice_date >= from_date
      and s.invoice_date < to_date
  )
  select
    collection,
    coalesce(sum(amount), 0)::numeric as gross_revenue,
    round(coalesce(sum(amount), 0) * 0.40, 2) as gross_profit, -- Simulated: 40% margin
    40.0 as gross_margin, -- Simulated: 40% margin
    count(*)::int as volume
  from sales_by_collection
  group by collection
  order by gross_revenue desc;
$$;

create or replace function public.sales_ops_kpis_monthly_by_collection(
  from_date date,
  to_date date
)
returns table (
  bucket_month text,
  collection text,
  gross_revenue numeric,
  gross_profit numeric,
  gross_margin numeric
)
language sql
stable
security definer
as $$
  select
    to_char(date_trunc('month', s.invoice_date), 'YYYY-MM') as bucket_month,
    coalesce(s.collection, 'Uncategorized') as collection,
    coalesce(sum(s.invoice_amount), 0)::numeric as gross_revenue,
    round(coalesce(sum(s.invoice_amount), 0) * 0.40, 2) as gross_profit, -- Simulated: 40% margin
    40.0 as gross_margin -- Simulated: 40% margin
  from public.sales_demo s
  where s.invoice_date >= from_date
    and s.invoice_date < to_date
  group by bucket_month, collection
  order by bucket_month, gross_revenue desc;
$$;

create or replace function public.sales_ops_collection_by_dealer(
  p_collection text,
  from_date date,
  to_date date
)
returns table (
  dealer text,
  revenue numeric,
  avg_price numeric,
  avg_cogs numeric,
  gross_margin numeric,
  gross_profit numeric
)
language sql
stable
security definer
as $$
  with sales_data as (
    select
      c.dealer_name as dealer,
      s.invoice_amount::numeric as amount
    from public.sales_demo s
    join public.customers_demo c on c.customer_id = s.customer_id
    where s.collection = p_collection
      and s.invoice_date >= from_date
      and s.invoice_date < to_date
  )
  select
    dealer,
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
  group by dealer
  order by revenue desc;
$$;

-- ============================================================================
-- OPERATIONAL METRICS (Simulated - waiting for inventory/ops tables)
-- ============================================================================

create or replace function public.sales_ops_fill_rate(
  from_date date,
  to_date date
)
returns table (
  fill_rate numeric
)
language sql
stable
security definer
as $$
  -- Simulated fill rate: 85% baseline
  -- Real implementation would use: (fulfilled_qty / requested_qty) * 100
  select 85.0 as fill_rate;
$$;

create or replace function public.sales_ops_import_lead_time(
  from_date date,
  to_date date
)
returns table (
  avg_days numeric
)
language sql
stable
security definer
as $$
  -- Simulated lead time: 45 days
  -- Real implementation would use: AVG(received_date - order_date)
  select 45.0 as avg_days;
$$;

create or replace function public.sales_ops_forecast_accuracy(
  from_date date,
  to_date date
)
returns table (
  accuracy_pct numeric
)
language sql
stable
security definer
as $$
  -- Simulated forecast accuracy: 78%
  -- Real implementation would compare forecasted_sales vs actual_sales
  select 78.0 as accuracy_pct;
$$;

create or replace function public.sales_ops_inventory_turnover(
  from_date date,
  to_date date
)
returns table (
  itr numeric
)
language sql
stable
security definer
as $$
  -- Simulated inventory turnover ratio: 4.2x
  -- Real implementation: COGS / Average Inventory Value
  select 4.2 as itr;
$$;

create or replace function public.sales_ops_dealer_bounce_rate(
  from_date date,
  to_date date
)
returns table (
  bounce_pct numeric
)
language sql
stable
security definer
as $$
  -- Calculate bounce rate: dealers who ordered once vs returned
  with dealer_activity as (
    select
      customer_id,
      min(invoice_date) as first_order,
      max(invoice_date) as last_order,
      count(distinct date_trunc('month', invoice_date)) as active_months
    from public.sales_demo
    where invoice_date >= from_date
      and invoice_date < to_date
    group by customer_id
  ),
  bounce_stats as (
    select
      count(*) as total_dealers,
      count(*) filter (where active_months = 1) as bounced_dealers
    from dealer_activity
  )
  select
    case
      when total_dealers > 0 then round((bounced_dealers::numeric / total_dealers) * 100, 2)
      else 0
    end as bounce_pct
  from bounce_stats;
$$;

-- ============================================================================
-- REPORTS & COMMUNICATION METRICS
-- ============================================================================

create or replace function public.ops_reports_made_by_month(
  from_date date,
  to_date date
)
returns table (
  report_month text,
  count int
)
language sql
stable
security definer
as $$
  -- Simulated report counts based on months in range
  -- Real implementation would query an ops_reports table
  with months as (
    select generate_series(
      date_trunc('month', from_date),
      date_trunc('month', to_date),
      '1 month'::interval
    )::date as month_start
  )
  select
    to_char(month_start, 'YYYY-MM') as report_month,
    (15 + (random() * 10)::int) as count -- Simulated: 15-25 reports per month
  from months
  order by report_month;
$$;

create or replace function public.ops_comm_consistency_index(
  from_date date,
  to_date date
)
returns table (
  consistency_pct numeric
)
language sql
stable
security definer
as $$
  -- Simulated communication consistency: 92%
  -- Real implementation would track scheduled_comms vs actual_comms
  select 92.0 as consistency_pct;
$$;

-- ============================================================================
-- FUTURE OPPORTUNITIES & INCOMING STOCK
-- ============================================================================

create or replace function public.list_future_sale_opps_open(
  from_date date,
  to_date date
)
returns table (
  project_name text,
  dealer text,
  expected_sku text,
  expected_qty int,
  expected_close_date text,
  rep text
)
language sql
stable
security definer
as $$
  -- Return loss opportunities as potential future sales
  -- These represent "lost" sales that could be recovered with stock
  select
    concat('Project-', lo.id) as project_name,
    c.dealer_name as dealer,
    coalesce(lo.expected_sku, lo.sku, 'TBD') as expected_sku,
    lo.requested_qty as expected_qty,
    lo.lost_date::text as expected_close_date,
    r.rep_name as rep
  from public.loss_opportunities lo
  join public.customers_demo c on c.customer_id = lo.dealer_id
  join public.sales_reps_demo r on r.rep_id = lo.rep_id
  where lo.due_to_stock = true
    and lo.lost_date >= from_date
    and lo.lost_date < to_date
  order by lo.lost_date desc
  limit 50;
$$;

create or replace function public.list_incoming_stock_by_collection(
  from_date date,
  to_date date
)
returns table (
  collection text,
  sku text,
  qty int,
  eta_date text,
  received_at text
)
language sql
stable
security definer
as $$
  -- Simulated incoming stock data
  -- Real implementation would query purchase_orders or inventory_incoming table
  -- For now, return empty result set
  select
    null::text as collection,
    null::text as sku,
    null::int as qty,
    null::text as eta_date,
    null::text as received_at
  where false; -- Return empty set
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant execute permissions to authenticated users
grant execute on function public.sales_ops_category_kpis(date, date) to authenticated, anon, service_role;
grant execute on function public.sales_ops_category_kpis_monthly(date, date) to authenticated, anon, service_role;
grant execute on function public.sales_ops_kpis_by_collection(date, date) to authenticated, anon, service_role;
grant execute on function public.sales_ops_kpis_monthly_by_collection(date, date) to authenticated, anon, service_role;
grant execute on function public.sales_ops_collection_by_dealer(text, date, date) to authenticated, anon, service_role;
grant execute on function public.sales_ops_fill_rate(date, date) to authenticated, anon, service_role;
grant execute on function public.sales_ops_import_lead_time(date, date) to authenticated, anon, service_role;
grant execute on function public.sales_ops_forecast_accuracy(date, date) to authenticated, anon, service_role;
grant execute on function public.sales_ops_inventory_turnover(date, date) to authenticated, anon, service_role;
grant execute on function public.sales_ops_dealer_bounce_rate(date, date) to authenticated, anon, service_role;
grant execute on function public.ops_reports_made_by_month(date, date) to authenticated, anon, service_role;
grant execute on function public.ops_comm_consistency_index(date, date) to authenticated, anon, service_role;
grant execute on function public.list_future_sale_opps_open(date, date) to authenticated, anon, service_role;
grant execute on function public.list_incoming_stock_by_collection(date, date) to authenticated, anon, service_role;
