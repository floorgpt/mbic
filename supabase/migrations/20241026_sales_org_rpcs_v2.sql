-- v2 organization-level RPCs with richer metadata for dashboard widgets.

set search_path = public, extensions;

create or replace function public.sales_org_kpis_v2(
  from_date date,
  to_date date
)
returns table (
  revenue_ytd numeric,
  active_dealers int,
  growth_rate numeric,
  prior_period_available boolean
)
language sql
stable
security definer
as $$
  with current_period as (
    select
      coalesce(sum(invoice_amount), 0)::numeric as revenue_ytd,
      count(distinct customer_id)::int as active_dealers
    from public.sales_demo
    where invoice_date >= from_date
      and invoice_date < to_date
  ),
  prior_period as (
    select
      coalesce(sum(invoice_amount), 0)::numeric as revenue_ytd
    from public.sales_demo
    where invoice_date >= (from_date - interval '1 year')
      and invoice_date < (to_date - interval '1 year')
  )
  select
    current_period.revenue_ytd,
    current_period.active_dealers,
    case
      when prior_period.revenue_ytd = 0 then null
      else round(((current_period.revenue_ytd - prior_period.revenue_ytd) / prior_period.revenue_ytd) * 100, 2)
    end as growth_rate,
    prior_period.revenue_ytd > 0 as prior_period_available
  from current_period, prior_period;
$$;

create or replace function public.sales_org_monthly_v2(
  from_date date,
  to_date date
)
returns table (
  month_label text,
  month_total numeric
)
language sql
stable
security definer
as $$
  select
    to_char(date_trunc('month', invoice_date), 'YYYY-MM') as month_label,
    sum(invoice_amount)::numeric as month_total
  from public.sales_demo
  where invoice_date >= from_date
    and invoice_date < to_date
  group by 1
  order by 1;
$$;

create or replace function public.sales_category_totals_v2(
  from_date date,
  to_date date
)
returns table (
  category_key text,
  display_name text,
  icon_url text,
  total_sales numeric,
  share_pct numeric
)
language sql
stable
security definer
as $$
  with sales_by_category as (
    select
      coalesce(s.collection, 'uncategorized') as category_key,
      sum(s.invoice_amount)::numeric as total_sales
    from public.sales_demo s
    where s.invoice_date >= from_date
      and s.invoice_date < to_date
    group by coalesce(s.collection, 'uncategorized')
  ),
  enriched as (
    select
      sbc.category_key,
      coalesce(pc.display_name, initcap(replace(sbc.category_key, '-', ' '))) as display_name,
      pc.icon_url,
      sbc.total_sales
    from sales_by_category sbc
    left join public.product_categories pc
      on pc.category_key = sbc.category_key
  ),
  ttl as (
    select coalesce(sum(total_sales), 0)::numeric as ttl_sales
    from enriched
  )
  select
    enriched.category_key,
    enriched.display_name,
    enriched.icon_url,
    enriched.total_sales,
    case
      when ttl.ttl_sales = 0 then 0
      else round((enriched.total_sales / ttl.ttl_sales) * 100, 2)
    end as share_pct
  from enriched cross join ttl
  order by enriched.total_sales desc;
$$;

create or replace function public.sales_org_top_dealers_v2(
  from_date date,
  to_date date,
  top_n int default 10
)
returns table (
  customer_id bigint,
  dealer_name text,
  revenue_ytd numeric,
  monthly_avg numeric,
  share_pct numeric,
  invoices int,
  rep_initials text
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
    ) as months_in_range
  ),
  agg as (
    select
      s.customer_id,
      c.dealer_name,
      sum(s.invoice_amount)::numeric as revenue_ytd,
      count(*)::int as invoices,
      s.rep_id,
      r.rep_name
    from public.sales_demo s
    join public.customers_demo c on c.customer_id = s.customer_id
    left join public.sales_reps_demo r on r.rep_id = s.rep_id
    where s.invoice_date >= from_date
      and s.invoice_date < to_date
    group by s.customer_id, c.dealer_name, s.rep_id, r.rep_name
  ),
  total_revenue as (
    select coalesce(sum(revenue_ytd), 0)::numeric as ttl from agg
  )
  select
    agg.customer_id,
    agg.dealer_name,
    agg.revenue_ytd,
    round(agg.revenue_ytd / months.months_in_range, 2) as monthly_avg,
    case
      when total_revenue.ttl = 0 then 0
      else round((agg.revenue_ytd / total_revenue.ttl) * 100, 2)
    end as share_pct,
    agg.invoices,
    case
      when agg.rep_name is null then null
      else regexp_replace(upper(coalesce(agg.rep_name, '')), '(^|\\s)(\\S)', '\\2', 'g')
    end as rep_initials
  from agg
  cross join months
  cross join total_revenue
  order by agg.revenue_ytd desc
  limit top_n;
$$;

create or replace function public.sales_org_top_reps_v2(
  from_date date,
  to_date date,
  top_n int default 10
)
returns table (
  rep_id bigint,
  rep_name text,
  revenue_ytd numeric,
  monthly_avg numeric,
  invoices int,
  active_customers int,
  total_customers int,
  active_pct numeric
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
    ) as months_in_range
  ),
  agg as (
    select
      s.rep_id,
      r.rep_name,
      sum(s.invoice_amount)::numeric as revenue_ytd,
      count(*)::int as invoices,
      count(distinct s.customer_id)::int as active_customers
    from public.sales_demo s
    join public.sales_reps_demo r on r.rep_id = s.rep_id
    where s.invoice_date >= from_date
      and s.invoice_date < to_date
    group by s.rep_id, r.rep_name
  ),
  totals as (
    select
      rep.rep_id,
      count(*)::int as total_customers
    from public.customers_demo rep
    group by rep.rep_id
  )
  select
    agg.rep_id,
    agg.rep_name,
    agg.revenue_ytd,
    round(agg.revenue_ytd / months.months_in_range, 2) as monthly_avg,
    agg.invoices,
    agg.active_customers,
    coalesce(totals.total_customers, 0) as total_customers,
    case
      when coalesce(totals.total_customers, 0) = 0 then 0
      else round((agg.active_customers::numeric / totals.total_customers) * 100, 2)
    end as active_pct
  from agg
  cross join months
  left join totals on totals.rep_id = agg.rep_id
  order by agg.revenue_ytd desc
  limit top_n;
$$;
