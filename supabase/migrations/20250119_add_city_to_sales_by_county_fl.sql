-- Update sales_by_county_fl to include city column
-- This migration adds city information to the regional sales data

drop function if exists public.sales_by_county_fl(date, date);

create function public.sales_by_county_fl(
  from_date date,
  to_date date
)
returns table (
  zip_code text,
  city text,
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
  -- County and city mapping based on ZIP codes
  -- South FL: Miami-Dade (33xxx), Broward (33xxx), Palm Beach (33xxx, 334xx), Monroe (33xxx), Collier (34xxx), Lee (33xxx, 339xx)
  -- Central FL: Orange (32xxx, 328xx), Hillsborough (33xxx, 336xx), Pinellas (33xxx, 337xx), Polk (33xxx, 338xx)
  -- North FL: Duval (32xxx), Alachua (32xxx, 326xx), Leon (32xxx, 323xx)

  with zip_sales as (
    select
      c.dealer_billing_address_postal_code as zip_code,
      c.dealer_billing_address_city as city,
      sum(s.invoice_amount::numeric) as revenue,
      count(distinct s.customer_id) as dealer_count,
      count(*) as order_count
    from sales_demo s
    join customers_demo c on c.customer_id = s.customer_id
    where s.invoice_date >= from_date
      and s.invoice_date < to_date
      and c.dealer_billing_address_state = 'FL'
      and c.dealer_billing_address_postal_code is not null
    group by c.dealer_billing_address_postal_code, c.dealer_billing_address_city
  )
  select
    zs.zip_code,
    coalesce(zs.city, 'Unknown') as city,
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
