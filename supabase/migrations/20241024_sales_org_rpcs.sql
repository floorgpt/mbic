-- Organization-level RPCs for MBIC dashboard visuals.
-- These are read-only helpers that aggregate directly within Postgres
-- to avoid transferring raw invoice rows to the application tier.

set search_path = public, extensions;

create or replace function public.sales_org_kpis(
  from_date date,
  to_date date
)
returns table (
  revenue_ytd numeric,
  active_dealers int,
  growth_rate numeric
)
language sql
stable
security definer
as $$
  with base as (
    select
      coalesce(sum(invoice_amount), 0)::numeric as revenue_ytd,
      count(distinct customer_id)::int as active_dealers
    from public.sales_demo
    where invoice_date >= from_date
      and invoice_date < to_date
  ),
  this_mo as (
    select coalesce(sum(invoice_amount), 0)::numeric as rev
    from public.sales_demo
    where invoice_date >= date_trunc('month', to_date - interval '1 day')
      and invoice_date < date_trunc('month', to_date) + interval '1 month'
  ),
  prev_mo as (
    select coalesce(sum(invoice_amount), 0)::numeric as rev
    from public.sales_demo
    where invoice_date >= date_trunc('month', to_date - interval '1 month')
      and invoice_date < date_trunc('month', to_date - interval '1 day')
  )
  select
    base.revenue_ytd,
    base.active_dealers,
    case
      when prev_mo.rev = 0 then null
      else round(((this_mo.rev - prev_mo.rev) / prev_mo.rev) * 100, 2)
    end as growth_rate
  from base, this_mo, prev_mo;
$$;

create or replace function public.sales_org_monthly(
  from_date date,
  to_date date
)
returns table (
  month text,
  month_total numeric
)
language sql
stable
security definer
as $$
  select
    to_char(date_trunc('month', invoice_date), 'YYYY-MM') as month,
    sum(invoice_amount)::numeric as month_total
  from public.sales_demo
  where invoice_date >= from_date
    and invoice_date < to_date
  group by 1
  order by 1;
$$;

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
  from base cross join ttl
  order by base.revenue desc
  limit top_n;
$$;

create or replace function public.sales_org_top_dealers(
  from_date date,
  to_date date,
  top_n int
)
returns table (
  customer_id bigint,
  dealer_name text,
  revenue_ytd numeric,
  monthly_avg numeric,
  invoices int
)
language sql
stable
security definer
as $$
  with months as (
    select greatest(
      1,
      extract(
        month
        from age(
          to_date,
          date_trunc('year', from_date)
        )
      )::int
    ) as m
  ),
  agg as (
    select
      s.customer_id,
      c.dealer_name,
      sum(s.invoice_amount)::numeric as revenue_ytd,
      count(*)::int as invoices
    from public.sales_demo s
    join public.customers_demo c
      on c.customer_id = s.customer_id
    where s.invoice_date >= from_date
      and s.invoice_date < to_date
    group by s.customer_id, c.dealer_name
  )
  select
    agg.customer_id,
    agg.dealer_name,
    agg.revenue_ytd,
    round(agg.revenue_ytd / months.m, 2) as monthly_avg,
    agg.invoices
  from agg, months
  order by agg.revenue_ytd desc
  limit top_n;
$$;

create or replace function public.sales_org_top_reps(
  from_date date,
  to_date date,
  top_n int
)
returns table (
  rep_id bigint,
  rep_name text,
  revenue numeric,
  invoices int,
  active_dealers int
)
language sql
stable
security definer
as $$
  with agg as (
    select
      s.rep_id,
      r.rep_name,
      sum(s.invoice_amount)::numeric as revenue,
      count(*)::int as invoices,
      count(distinct s.customer_id)::int as active_dealers
    from public.sales_demo s
    join public.sales_reps_demo r
      on r.rep_id = s.rep_id
    where s.invoice_date >= from_date
      and s.invoice_date < to_date
    group by s.rep_id, r.rep_name
  )
  select *
  from agg
  order by revenue desc
  limit top_n;
$$;
