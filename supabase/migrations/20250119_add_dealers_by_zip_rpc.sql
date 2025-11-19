-- Create RPC to get dealer details by ZIP code
-- Returns list of dealers with their sales data for a specific ZIP

create or replace function public.dealers_by_zip_fl(
  p_zip_code text,
  from_date date,
  to_date date
)
returns table (
  customer_id text,
  dealer_name text,
  dealer_city text,
  dealer_zip text,
  revenue numeric,
  order_count int,
  sales_rep text
)
language sql
stable
security definer
as $$
  select
    c.customer_id,
    c.dealer_name,
    c.dealer_billing_address_city as dealer_city,
    c.dealer_billing_address_postal_code as dealer_zip,
    sum(s.invoice_amount::numeric) as revenue,
    count(*) as order_count,
    coalesce(r.rep_name, 'Unassigned') as sales_rep
  from sales_demo s
  join customers_demo c on c.customer_id = s.customer_id
  left join sales_reps_demo r on r.rep_id = c.rep_id
  where s.invoice_date >= from_date
    and s.invoice_date < to_date
    and c.dealer_billing_address_state = 'FL'
    and c.dealer_billing_address_postal_code = p_zip_code
  group by c.customer_id, c.dealer_name, c.dealer_billing_address_city, c.dealer_billing_address_postal_code, r.rep_name
  order by revenue desc;
$$;

grant execute on function public.dealers_by_zip_fl(text, date, date) to authenticated, anon, service_role;
