-- MBIC sales analytics RPCs
-- These functions aggregate directly within the database to avoid the
-- 1,000-row client limit and provide consistent results for large reps.

set search_path = public, extensions;

create or replace function public.sales_rep_kpis(
  p_rep_id bigint,
  p_from date,
  p_to date
)
returns table(
  rep_id bigint,
  total_revenue numeric,
  invoice_count bigint,
  avg_invoice numeric,
  unique_customers bigint,
  top_dealer_id bigint,
  top_dealer_name text,
  top_dealer_revenue numeric
)
language sql
stable
security definer
as $$
  with filtered as (
    select
      invoice_amount::numeric as invoice_amount,
      customer_id
    from public.sales_demo
    where rep_id = p_rep_id
      and invoice_date >= p_from
      and invoice_date < p_to
  ),
  totals as (
    select
      coalesce(sum(invoice_amount), 0)::numeric as total_revenue,
      count(*)::bigint as invoice_count,
      case
        when count(*) = 0 then 0
        else (sum(invoice_amount) / count(*))
      end::numeric as avg_invoice,
      count(distinct customer_id)::bigint as unique_customers
    from filtered
  ),
  dealer_rank as (
    select
      customer_id,
      sum(invoice_amount)::numeric as revenue,
      row_number() over (order by sum(invoice_amount) desc nulls last) as rnk
    from filtered
    group by customer_id
  ),
  top_dealer as (
    select
      d.customer_id,
      c.dealer_name,
      d.revenue
    from dealer_rank d
    left join public.customers_demo c
      on c.customer_id = d.customer_id
    where d.rnk = 1
  )
  select
    p_rep_id,
    totals.total_revenue,
    totals.invoice_count,
    totals.avg_invoice,
    totals.unique_customers,
    top_dealer.customer_id as top_dealer_id,
    top_dealer.dealer_name as top_dealer_name,
    top_dealer.revenue as top_dealer_revenue
  from totals
  left join top_dealer on true;
$$;

create or replace function public.sales_rep_monthly(
  p_rep_id bigint,
  p_from date,
  p_to date
)
returns table(
  month_label text,
  month_revenue numeric,
  invoice_count bigint
)
language sql
stable
security definer
as $$
  with filtered as (
    select
      date_trunc('month', invoice_date)::date as month_date,
      to_char(date_trunc('month', invoice_date), 'YYYY-MM') as month_label,
      invoice_amount::numeric as invoice_amount
    from public.sales_demo
    where rep_id = p_rep_id
      and invoice_date >= p_from
      and invoice_date < p_to
  )
  select
    month_label,
    coalesce(sum(invoice_amount), 0)::numeric as month_revenue,
    count(*)::bigint as invoice_count
  from filtered
  group by month_label, month_date
  order by month_date, month_label;
$$;

create or replace function public.sales_rep_dealers(
  p_rep_id bigint,
  p_from date,
  p_to date,
  p_limit int default 50,
  p_offset int default 0
)
returns table(
  customer_id bigint,
  dealer_name text,
  invoices bigint,
  revenue numeric,
  avg_invoice numeric
)
language sql
stable
security definer
as $$
  with filtered as (
    select
      customer_id,
      invoice_amount::numeric as invoice_amount
    from public.sales_demo
    where rep_id = p_rep_id
      and invoice_date >= p_from
      and invoice_date < p_to
  ),
  aggregated as (
    select
      f.customer_id,
      coalesce(sum(f.invoice_amount), 0)::numeric as revenue,
      count(*)::bigint as invoices,
      case
        when count(*) = 0 then 0
        else (sum(f.invoice_amount) / count(*))
      end::numeric as avg_invoice
    from filtered f
    group by f.customer_id
  )
  select
    a.customer_id,
    c.dealer_name,
    a.invoices,
    a.revenue,
    a.avg_invoice
  from aggregated a
  left join public.customers_demo c
    on c.customer_id = a.customer_id
  order by a.revenue desc
  limit p_limit offset p_offset;
$$;

create or replace function public.sales_dealer_monthly(
  p_rep_id bigint,
  p_customer_id bigint,
  p_from date,
  p_to date
)
returns table(
  month_label text,
  month_revenue numeric,
  invoice_count bigint
)
language sql
stable
security definer
as $$
  with filtered as (
    select
      date_trunc('month', invoice_date)::date as month_date,
      to_char(date_trunc('month', invoice_date), 'YYYY-MM') as month_label,
      invoice_amount::numeric as invoice_amount
    from public.sales_demo
    where rep_id = p_rep_id
      and customer_id = p_customer_id
      and invoice_date >= p_from
      and invoice_date < p_to
  )
  select
    month_label,
    coalesce(sum(invoice_amount), 0)::numeric as month_revenue,
    count(*)::bigint as invoice_count
  from filtered
  group by month_label, month_date
  order by month_date, month_label;
$$;
