# MBIC Dashboard Data Integration Summary

## Current Status
- Netlify dashboard still reports `Revenue YTD ≈ $234,465` despite Supabase showing `$6,136,413.93` for 2025.
- Sales drilldowns only show complete totals for reps whose invoices fall inside Supabase’s default 1,000-row window (e.g., Angela Milazzo). Other reps are truncated, so their combined revenue never reaches the authoritative YTD total.
- Local `npm run build` fails unless Supabase environment variables are present during prerendering, which blocks automated verification ahead of deploy.

## Root Causes Identified
1. **Date Window Drift**  
   - `fetchOrganizationSalesOverview` previously defaulted to `new Date()` for start/end bounds, meaning any server still in 2024 would fetch `2024-01-01` → `2025-01-01`.  
   - Result: Revenue YTD and the trend chart only reflected early 2024 invoices (~$234k).
2. **Request-Level Caching**  
   - `fetchSalesRange` was wrapped in React’s `cache(fetchSalesRange)`. The first Netlify render (when only Jan–Feb data existed) populated the cache; every subsequent request re-used that stale snapshot, so new invoices never appeared.
3. **Supabase Row Limits & Auth Context**  
   - Client-side helper `lib/supabase/queries.ts` used the anon browser client without an explicit `.limit()`, so Supabase returned its default maximum of 1,000 rows.  
   - Reps with more than 1,000 invoices (or later invoices beyond that window) were truncated. Angela’s totals looked correct because her invoices all fell inside the first 1,000 rows.

## Fixes in Place
1. **Data-Year Resolution** (`lib/db/sales.ts`)  
   - Added `resolveReportingWindow()` to query Supabase for the latest `invoice_date` and derive the reporting year, ensuring all YTD calculations align with the dataset instead of server clock drift.
   - Sales KPIs now rely on RPC-backed helpers (`lib/mbic-sales.ts`) instead of raw invoice loops, so every request rehydrates totals directly from Postgres.
2. **Admin Client Everywhere** (`lib/supabase/queries.ts`, `lib/mbic-sales.ts`)  
   - Replaced the anon browser client with the service-role admin client and bumped `.limit(1000000)` for `sales_demo`, `customers_demo`, and `sales_reps_demo`.  
   - Guarantees that per-rep, per-collection, and dealer breakdowns load the entire transactional history the UI expects while the new RPC helpers provide pre-aggregated datasets for dashboards.

These changes bring the backend queries in line with Supabase’s authoritative totals when run locally with valid credentials.

## Data Flow Overview
1. **Source of Truth**: Supabase schema
   - `sales_demo` provides invoice-level facts (amount, customer, rep, date, collection).
   - `customers_demo` and `sales_reps_demo` enrich the fact table with names and assignments.
2. **Backend Aggregation** (`lib/db/sales.ts`)
   - `fetchSalesRange` issues server-side admin queries with optional filters (rep, dealer, date range).
   - Helpers derive monthly totals, dealer aggregates, rep aggregates, and active-dealer counts before returning a structured `OrganizationSalesOverview`.
3. **Frontend Consumption**
   - Dashboard (`app/(dashboard)/page.tsx`) calls `fetchOrganizationSalesOverview()` during server rendering, surfaces `grandTotal`, `monthlyTotals`, dealer/collection/rep aggregates, and KPIs.
   - Sales page (`app/(dashboard)/sales/page.tsx`) invokes `fetchRepSalesData(repId)` for the selected rep, rendering trends and dealer breakdown tables.
   - Shared marketing/sales widgets rely on `lib/supabase/queries.ts`, which now streams complete tables via the admin client.
4. **Geographic Sales Analysis**
   - **Florida ZIP Code Map** (`components/dashboard/florida-zip-sales-map.tsx`) renders an interactive Leaflet choropleth showing sales distribution across 983 Florida ZIP codes.
   - **RPC Functions**:
     - `sales_by_zip_fl(from_date, to_date, p_category, p_collection)` aggregates revenue, dealer count, and order count by ZIP code with optional category/collection filters.
     - `dealers_by_zip(p_zip_code, from_date, to_date)` returns dealer-level drill-down with sales metrics, rep assignments, and city names for drawer display.
   - **GeoJSON**: US Census TIGER/Line 2010 ZCTA5 boundaries (678KB, optimized via mapshaper) provide ZIP code polygons.
   - **API Route**: `/api/dealers-by-zip` fetches dealer details when user clicks a ZIP code on the map.

## Remaining Risks & Next Steps
1. **Deployment Environment**
   - Ensure Netlify has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` available at build time; without them, server prerendering returns `TypeError: fetch failed`.
2. **Cache Busting**
   - With React's cache removed, add explicit ISR/`revalidate` policies if you want to control frequency of Supabase round trips while keeping the data current.
3. **Verification**
   - After the next deploy, validate the live dashboard against the Supabase SQL snippet to confirm Revenue YTD and per-rep totals align with `$6,136,413.93`.
4. **PostgREST 1000-Row Hard Limit** ⚠️ **CRITICAL**
   - Supabase project has a **hard-coded 1,000-row limit** that cannot be bypassed with `.limit()` or `.range()`, even with service role key.
   - Raw queries in `lib/db/sales.ts` return incomplete data for reps with >1,000 invoices (affects 7 of 13 reps).
   - Example: Juan Pedro Boscan shows $389k in raw queries but actually has $1.6M (RPC confirms).
   - **Solution**: Use RPC functions exclusively (already implemented in `lib/mbic-sales.ts` and `lib/mbic-supabase.ts`).
   - **Action**: Deprecate or add pagination to `lib/db/sales.ts` and `lib/supabase/queries.ts`.
   - See [supabase-postgrest-limit-issue.md](./supabase-postgrest-limit-issue.md) for full details and validation results.

This memo consolidates the investigation to date and documents how the application now bridges Supabase data to the front-end. Share it with the expert for additional review or architectural changes.
