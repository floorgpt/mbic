## MBIC Dashboard (CPF Floors)

Marketing & BI Center (MBIC) for CPF Floors built with Next.js 15, TypeScript, shadcn/ui, Tailwind CSS, Recharts, and Supabase.

> **📋 Latest Changes**: See [CHANGELOG-2025-01.md](CHANGELOG-2025-01.md) for recent updates (January 2025)

## Requirements

- Node.js 18+
- npm 9+
- Supabase project with `sales_demo`, `sales_reps_demo`, and `customers_demo` tables
- Environment variables (see below)

## Environment Variables

Copy `.env.local.example` to `.env.local` and populate the values:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for browser access |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key used server-side (profile page) |
| `RETELL_AI_SECRET` | Secret token used to authorise Retell AI webhook calls |
| `OPENAI_API_KEY` | OpenAI key for MBIC agent summaries |
| `FORMS_STRICT_CATALOGS` | Controls POST validation for public forms (`false` = Trust-the-UI, recommended) |

> **Note:** `SUPABASE_SERVICE_ROLE_KEY`, `RETELL_AI_SECRET`, and `OPENAI_API_KEY` are server-only secrets and must never be prefixed with `NEXT_PUBLIC_`.

## Scripts

```bash
npm run dev         # Start local dev server
npm run lint        # Run ESLint with auto-fix
npm run type-check  # Run TypeScript compiler with --noEmit
npm run build       # Production build used by Netlify
npm run start       # Run the compiled production build
```

Before pushing, ensure both lint and type-check succeed so Netlify builds remain healthy:

```bash
npm run lint
npm run type-check
npm run build
```

## Documentation

### Quick Links
- **[CHANGELOG-2025-01.md](CHANGELOG-2025-01.md)** - Recent updates and bug fixes (January 2025)
- **[DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)** - Step-by-step deployment instructions
- **[FEATURES-GUIDE.md](FEATURES-GUIDE.md)** - User guide for new features
- **[SALES-OPS-MIGRATION-README.md](SALES-OPS-MIGRATION-README.md)** - Sales Ops setup guide

### Technical Documentation
- **[docs/mbic-supabase-integration.md](docs/mbic-supabase-integration.md)** - Data integration details
- **[docs/sales-ops-migration-guide.md](docs/sales-ops-migration-guide.md)** - Detailed migration steps
- **[docs/supabase-postgrest-limit-issue.md](docs/supabase-postgrest-limit-issue.md)** - PostgREST limitations

## Development Notes

- UI tokens are centralised via Tailwind CSS and shadcn/ui. Prefer updating custom tokens through `tailwind.config` or component-level classes instead of mutating third-party theme types.
- Supabase service-role access is created once per request via `lib/supabase/admin.ts` (`createClient` with `SUPABASE_SERVICE_ROLE_KEY`). All server-side helpers call this factory—never instantiate a Supabase client directly in components.
- `middleware.ts` protects the Retell AI webhook by enforcing `RETELL_AI_SECRET`.

## Data Sources & Page Wiring (Dashboard & Sales)

The CPF MBIC stack pulls all production data from Supabase. Two sets of helpers exist:

1. **Dashboard-safe helpers** (`lib/mbic-supabase.ts`) used by the App Router dashboard route and `/api/diag`.
2. **Sales detail helpers** (`lib/mbic-sales.ts` + `lib/supabase/queries.ts`) used by the Sales drill-down experience.

Both rely on the same Supabase service-role client and share numeric coercion utilities.

### Shared RPC Endpoints

The following RPCs are executed for every dashboard render (and the `/api/diag` route):

| RPC | Parameters | Returns | Notes |
| --- | --- | --- | --- |
| `sales_org_kpis_v2` | `from_date`, `to_date` | Single row `{ revenue, unique_dealers, avg_invoice, top_dealer, top_dealer_revenue }` | Fallback mapping handles legacy column names (`revenue_ytd`, `active_dealers`). |
| `sales_org_monthly_v2` | `from_date`, `to_date` | `[{ month, total }]` | Coerces possible `month_total` / `sum` aliases. |
| `sales_org_top_dealers` | `from_date`, `to_date`, `limit`, `offset` | Dealer leaderboard with revenue + share. | Share is recalculated client-side if not supplied. |
| `sales_org_top_reps` | `from_date`, `to_date`, `limit`, `offset` | Rep leaderboard with revenue and activity stats. | Numeric guardrails ensure missing values print as `—`. |
| `sales_category_totals` | `from_date`, `to_date` | Category totals with Cloudinary icon URLs. | UI filters out `__UNMAPPED__` and replaces missing icons via `getIcon`. |
| `sales_org_dealer_engagement_trailing_v3` | `from_date`, `to_date` | Monthly assigned vs. active dealers. | Sorted chronologically in the component before rendering. |
| `sales_by_zip_fl` | `from_date`, `to_date`, `p_category`, `p_collection` | ZIP code aggregations for Florida. | Returns `[{ zip_code, revenue, dealer_count, order_count }]` with optional category/collection filters. |
| `dealers_by_zip` | `p_zip_code`, `from_date`, `to_date` | Dealer drill-down for specific ZIP. | Returns dealers in ZIP with sales metrics, rep assignments, and city names for map drawer. |

All helpers return a `SafeResult<T>` object:

```ts
type PanelMeta = { ok: boolean; count: number; err?: string };
type SafeResult<T> = { data: T; _meta: PanelMeta };
```

- `_meta.ok` is `false` only when the RPC throws; the dashboard shows a “Panel failed” chip but still renders empty states.
- `tryServerSafe` logs every failure as `Server fetch failed (rpc_name): …` and returns fallback data shaped exactly like the RPC output.

### Dashboard (`app/(dashboard)/page.tsx`)

1. The route is explicitly dynamic (`export const dynamic = 'force-dynamic'`) and forces `runtime = 'nodejs'` to guarantee access to server-only environment variables on Netlify.
2. Query params (`from`, `to`, `topProductsPage`) are read as strings and default to the PRD timeframe (`2025-01-01` → `2025-10-01`).
3. When both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present:
   - `Promise.allSettled` fetches every helper simultaneously.
   - Results are normalised via `resolvePanelResult`, ensuring `PanelState<T>` always contains `{ data, meta }`.
   - A single `[dash-panels]` log emits `{ ok, count, err? }` for every panel per SSR render (used for Netlify observability).
4. When env vars are missing, the helper layer is skipped entirely. A banner renders and `_meta.ok` is forced to `false` so every panel stays in sync.
5. The UI reads `state.meta.ok` to decide whether to show the "Panel failed" badge while still displaying placeholders so the page stays responsive even when some RPCs fail.

#### Florida Regional Sales Map

The dashboard includes an interactive Leaflet-based map showing sales distribution across Florida regions and ZIP codes:

- **Regional View** (3 regions: North, Central, South Florida):
  - Green color gradient (light → dark) indicates revenue intensity
  - Hover tooltips show revenue, dealer count, and order count
  - Click region polygon to open drawer with county breakdown
  - Narrative summary highlights top-performing county with revenue percentage

- **ZIP Code View**:
  - Blue circles sized by revenue at accurate geographic coordinates (calculated from GeoJSON polygon centroids)
  - Hover tooltips display city, ZIP, county, and sales metrics with visual CTA
  - Click ZIP circle to open drawer with dealer-level details
  - Toggle controls to show/hide regions and ZIP circles independently

- **Interactive Features**:
  - Sortable table columns (Revenue, Dealers, Orders) with ascending/descending indicators
  - Column visibility dropdown to show/hide City, ZIP, County columns
  - Responsive drawer with proper z-index layering and navigation (back button resets filters when navigating from ZIP to region mode)
  - Dark mode support for tooltips
  - AI-powered Chat POC with seeded Q&A, expand/collapse controls, and conversation reset

- **Layout & Responsiveness**:
  - Map uses flexbox layout (`flex-1 min-h-0`) to fill available vertical space in parent card
  - Card container uses `flex flex-col` to ensure header and map stack correctly
  - Matches height of adjacent "Team vs Targets" card with no empty white space
  - Leaflet MapContainer inherits height via `h-full w-full` classes

- **Data Sources**:
  - Regional aggregation: `sales_by_county_fl` RPC (includes city names)
  - ZIP dealer details: `dealers_by_zip_fl` RPC
  - GeoJSON data: `florida-regions.geojson` (3 regions), `florida-zips.geojson` (ZIP polygons, 678KB)

- **Component**: `components/dashboard/florida-regional-sales-map.tsx`
- **Technical Details**: See `docs/florida-regional-map-architecture.md`

You can reproduce the data snapshot locally with:

```bash
npm run dev
open http://localhost:3000/api/diag?from=2025-01-01&to=2025-10-01
open http://localhost:3000/
```

### `/api/diag`

This route (`app/api/diag/route.ts`) exists for QA and external integrations. It calls the **non-safe** helpers (`getOrgKpis`, `getOrgMonthly`, etc.) which throw on error instead of returning fallbacks. The route mirrors the same input defaults and is the quickest way to confirm Supabase data availability.

### `/api/diag-salesops`

The Sales Ops equivalent lives at `app/api/diag-salesops/route.ts`. It reuses the Safe helpers listed above (`getCategoryKpis`, `getFillRate`, `getInventoryTurnover`, etc.) and returns both the raw payload (`data`, `_meta`) and a concise `summary` array:

```json
{
  "ok": true,
  "from": "2025-01-01",
  "to": "2025-10-01",
  "results": [
    {
      "label": "sales_ops_category_kpis",
      "ok": true,
      "count": 9,
      "meta": { "ok": true, "count": 9 },
      "sample": [{ "...": "trimmed" }]
    },
    {
      "label": "sales_ops_fill_rate",
      "ok": true,
      "count": 1,
      "meta": { "ok": true, "count": 1 },
      "sample": [{ "...": "trimmed" }]
    }
  ]
}
```

Hit the route with optional `from`/`to` query params, e.g. `GET /api/diag-salesops?from=2025-04-01&to=2025-06-30`, to validate Supabase connectivity for every Sales Ops panel in one request. Each entry includes the SafeResult meta plus a single-row sample payload to speed up QA.

### Sales Performance (`app/(dashboard)/sales/page.tsx`)

The Sales page uses enriched helper functions because it needs per-rep drill downs:

- `fetchSalesReps()` retrieves the selectable rep list.
- `fetchRepSalesData(repId)` aggregates:
  - Total revenue, invoice counts, unique dealers.
  - Monthly revenue per selected rep (`RepSalesTrend` chart).
  - Dealer-level revenue for the breakdown table (`DealerBreakdownTable`).
- `getDealerMonthly(repId, dealerId)` powers the dealer comparison view and is reused for data consistency validations (Linda Flooring guardrail).

All Sales helpers sit in `lib/mbic-sales.ts` / `lib/db/sales.ts` because they touch additional SQL views. They continue to share the same `getSupabaseAdminClient` factory and numeric coercion utilities to avoid drift.

### Sales Hub Settings (`app/(dashboard)/settings/page.tsx`)

The Settings page provides comprehensive management for sales representatives, monthly targets, and customer assignments:

- **Sales Representatives**: Add/edit sales reps with profile pictures, email, and phone. Profile pictures are stored as base64-encoded images in `sales_reps_demo.rep_profile_picture`.
- **Monthly Sales Targets**: Set individual targets per rep per month with CSV import/export. Targets default to $200K per month. UI excludes "Dismissed" and "Intercompany" reps from the targets view.
- **Customer Management**: Comprehensive customer assignment system with:
  - Search autocomplete for quick customer lookup
  - Customer editing (dealer name, rep assignment, city, state, zip, country, email)
  - Transfer history tracking in `customer_rep_transfers` table (logs every rep_id change with timestamp)
  - CSV bulk import with professional 3-step dialog (download template → edit → upload)
  - Summary statistics: Total Customers, Assigned (excluding Dismissed/Intercompany), Dismissed, Unassigned
  - Matches the same dealer counting logic as the Dashboard's Dealer Activity chart (`rep_id not in (14, 15)`)

All Settings components are client-side React with API routes:
- `/api/sales-hub/reps` - CRUD for sales reps
- `/api/sales-hub/targets` - CRUD for monthly targets
- `/api/sales-hub/customers` - CRUD for customers with transfer tracking
- `/api/sales-hub/customers/[id]/history` - Fetch transfer history with rep details

Database tables:
- `sales_reps_demo` - Rep profiles with optional profile_picture, email, phone
- `sales_targets` - Monthly targets (rep_id, target_month YYYY-MM, target_amount, fiscal_year)
- `customers_demo` - Dealer accounts with rep assignments and billing address fields
- `customer_rep_transfers` - Audit log for rep reassignments (customer_id, from_rep_id, to_rep_id, transferred_at, notes)

### Sales Operations (`app/(dashboard)/sales-ops/page.tsx`)

The Sales Ops overview mirrors the guardrails used by the main dashboard: `dynamic = 'force-dynamic'`, Node runtime, and `Promise.allSettled` with a `[salesops-panels]` log that emits `{ ok, count, err? }` for every panel render. Data access lives in `lib/mbic-supabase-salesops.ts`, which exposes typed safe helpers that wrap `tryServerSafe` and normalise Supabase RPC output.

| Helper | Supabase RPC | Parameters (all emit both `from`/`to` and `from_date`/`to_date`) | Description |
| --- | --- | --- | --- |
| `getCategoryKpis` | `sales_ops_category_kpis` | `from`, `to` | Category-level revenue, price, COGS, gross margin/profit. |
| `getCategoryKpisMonthly` | `sales_ops_category_kpis_monthly` | `from`, `to` | Monthly time-series of the same economics, later bucketed client-side. |
| `getFillRate` | `sales_ops_fill_rate` | `from`, `to` | Returns `%` fill rate; UI presents as KPI card. |
| `getImportLeadTime` | `sales_ops_import_lead_time` | `from`, `to` | Average lead-time in days. |
| `getForecastAccuracy` | `sales_ops_forecast_accuracy` | `from`, `to` | Forecast accuracy percentage. |
| `getInventoryTurnover` | `sales_ops_inventory_turnover` | `from`, `to` | Inventory turnover ratio (ITR). |
| `getDealerBounce` | `sales_ops_dealer_bounce_rate` | `from`, `to` | Dealer bounce percentage. |
| `getReportsByMonth` | `ops_reports_made_by_month` | `from`, `to` | Monthly Ops report count. |
| `getCommConsistency` | `ops_comm_consistency_index` | `from`, `to` | Comms consistency metric (percentage). |
| `getCollectionsLeaderboard` | `sales_ops_kpis_by_collection` | `from`, `to` | Top collections by revenue/profit for pills + drawer. |
| `getCollectionsMonthly` | `sales_ops_kpis_monthly_by_collection` | `from`, `to` | Collection economics timeseries (used for margin delta badge). |
| `getCollectionByDealer` | `sales_ops_collections_by_dealer` | `p_collection`, `from`, `to` | Dealer drill-down for the drawer API (`/api/collection-by-dealer`). |
| `getFutureOppsOpen` | `list_future_sale_opps_open` | `from`, `to` | Actionable future opportunities table. |
| `getIncomingStockByCollection` | `list_incoming_stock_by_collection` | `from`, `to` | Incoming stock schedule table. |

UI components live in `components/sales-ops/`:

- `range-picker.tsx` — compact YTD/QTD/MTD/custom selector that syncs query parameters.
- `economics-chart.tsx` — Recharts dual-axis area/line chart for revenue vs. gross margin.
- `top-collections.tsx` — Pill list + drawer with CSV export backed by `/api/collection-by-dealer`.
- `reports-timeline.tsx` — Monthly Ops report bar chart with typed tooltip formatter.

Loading states are handled via `app/(dashboard)/sales-ops/loading.tsx`, which mirrors the shimmer styling used elsewhere. When either Supabase environment variable is missing, a banner displays and every panel meta is forced to `{ ok: false }`, keeping the UI in a consistent “Thinking…” state without firing RPCs.

### Sales Ops Forms (`app/forms/page.tsx`)

The Sales Ops form is a public-facing capture flow that lands inside `public.loss_opportunities` and immediately notifies n8n. It mirrors the same Supabase guardrails used by the dashboard:

- **Catalog helpers** live in `lib/forms/catalog.ts` (`getSalesReps`, `getDealersByRep`, `getCategories`, `getCollectionsByCategory`, `getColorsByCollection`). Every helper uses `getSupabaseAdminClient()` and enforces case-insensitive keys so `category=vinyl` and `collection=SpiritXL` resolve correctly.
- **Submission guardrails** are implemented in `app/api/forms/loss-opportunity/route.ts`. The route validates payload shape, re-checks every catalog before inserting, and returns `{ ok: true, id, webhook: { mode, url } }` on success. Failures include `"Catálogos incompletos"` with the missing pieces or `"Catálogos fuera de línea"` if Supabase reports an error. Webhooks respect the stored mode under Settings → Webhooks.
- **Diagnostics** are exposed via `GET /api/diag-forms`. Each check returns `{ label, ok, status, count, err, sample }`, making it easy to confirm catalog reachability (e.g. `collections-vinyl`, `colors-SpiritXL`, `loss-opportunity-insert`). Pass `?dryRun=false` to perform an insert + clean-up round trip.
- **Settings → Forms tab** surfaces the public URL and both n8n webhook URLs (Test / Prod) with copy buttons. The active mode is read from `mbic_settings`.
- **UI telemetry**: `/forms` renders a banner with the latest diagnostic counts (red badges flag failing checks) and logs `[forms] catalog:<action>` plus `[forms] api/<route>` events for server observability.
- Production runs with `FORMS_STRICT_CATALOGS=false` (modo Trust-the-UI) to skip redundant catalog revalidation on submit; set to `true` only if you need to hard-enforce backend lookups.

Quick sanity commands (all return JSON):

```bash
curl -s https://cpf-mbic2.netlify.app/api/diag-forms | jq
curl -s "https://cpf-mbic2.netlify.app/api/forms/catalog/categories" | jq '.data | length'
curl -s "https://cpf-mbic2.netlify.app/api/forms/catalog/collections?category=vinyl" | jq
curl -s "https://cpf-mbic2.netlify.app/api/forms/catalog/colors?collection=SpiritXL" | jq
curl -s https://cpf-mbic2.netlify.app/api/settings/webhooks | jq
# Optional: skip color check in diag with `skipColors=true`
curl -s 'https://cpf-mbic2.netlify.app/api/diag-forms?skipColors=true' | jq
```

### Failure Handling & Logging

| Layer | Behaviour | Output |
| --- | --- | --- |
| `tryServerSafe` | Catches Supabase SDK errors, logs once, returns typed fallback. | `Server fetch failed (rpc_name): …` |
| Dashboard route | Aggregates meta info, logs once per render. | `[dash-panels] { from, to, kpis: { ok, count, err? }, … }` |
| API route | Throws on first failure with HTTP 500. | `{ ok: false, error }` payload |

When debugging regressions, compare the `/api/diag` output with the `[dash-panels]` log for the same timeframe. If `/api/diag` succeeds while `kpis.meta.ok` is `false`, inspect the App Router runtime (should be `nodejs`) or new conditions in `resolvePanelResult`.

## Additional Data Tables

While the Dashboard and Sales flows cover the bulk of Supabase access, other screens rely on additional tables:

### Customer Sentiment

| Table | Purpose | Screen usage | Helper |
| --- | --- | --- | --- |
| `sentiment_stories` | Stores qualitative feedback (`brand`, `summary`, `quote`, `sentiment`, `keywords`, `channel`, timestamps). | Customer Sentiment page cards (`/sentiment`) | `lib/supabase/sentiment.ts` → `fetchSentimentStories` |

### Marketing (CPF Launchpad)

| Table | Purpose | Screen usage | Sync mechanism |
| --- | --- | --- | --- |
| `marketing_cpf_launchpad_summary` | Daily KPI snapshot (`unique_visitors`, `sessions`, `bounce_rate`, `leads`, `cpl`, `daily_budget`). | Marketing KPI cards | Supabase Edge Function `fetch-cpf-launchpad-marketing-data` (nightly + manual sync CTA). |
| `marketing_cpf_launchpad_daily` | Per-channel Google/Meta timeseries (`stat_date`, `channel`, `spend`, `leads`, `clicks`). | Leads by Platform & Daily Spend charts | Same Edge Function. |

The marketing page ships with lightweight fallback data (`lib/data/marketing.ts`) purely for local development. Production always pulls from Supabase.

## Deployment (Netlify)

1. Connect the GitHub repository to Netlify.
2. Set the environment variables listed above in Netlify → Site settings → Environment variables.
3. Build command: `npm run build`
4. Publish directory: `.next`

Every push to `main` will trigger a Netlify deploy.

### Supabase RPCs & Database Access

| Module | RPC / Table | Parameters | Description / Usage |
| --- | --- | --- | --- |
| Dashboard & Sales (`lib/mbic-supabase.ts`, `lib/mbic-sales.ts`) | `sales_org_kpis_v2` | `from_date`, `to_date` | Company KPIs powering `/app/(dashboard)` summary cards. |
|  | `sales_org_monthly_v2` | `from_date`, `to_date` | Monthly revenue trend for dashboard sparkline. |
|  | `sales_org_top_dealers_v2` | `from_date`, `to_date`, `top_n` | Dealer leaderboard used in dashboard + `/sales` drawer. |
|  | `sales_org_top_reps_v2` | `from_date`, `to_date`, `top_n` | Rep leaderboard cards/charts. |
|  | `sales_category_totals_v2` | `from_date`, `to_date` | Category mix for pie/stacked charts. |
|  | `sales_org_top_collections` | `from_date`, `to_date`, `top_n` | Collections stack (legacy marketing view). |
|  | Tables: `sales_demo`, `customers_demo`, `sales_reps_demo`, `v_sales_norm` | various `select` calls | Base sales dataset used for drilldowns and validation helpers. |
| Sales Operations (`lib/mbic-supabase-salesops.ts`) | `sales_ops_category_kpis` | `from`, `to` | Category KPI tiles in `/sales-ops`. |
|  | `sales_ops_category_kpis_monthly` | `from`, `to` | Monthly economics chart. |
|  | `sales_ops_fill_rate` | `from`, `to` | Fill rate KPI card. |
|  | `sales_ops_import_lead_time` | `from`, `to` | Import lead time KPI. |
|  | `sales_ops_forecast_accuracy` | `from`, `to` | Forecast accuracy KPI. |
|  | `sales_ops_inventory_turnover` | `from`, `to` | Inventory turnover KPI. |
|  | `sales_ops_dealer_bounce_rate` | `from`, `to` | Dealer bounce metric. |
|  | `ops_reports_made_by_month` | `from`, `to` | Reports timeline chart. |
|  | `ops_comm_consistency_index` | `from`, `to` | Communications consistency tile. |
|  | `sales_ops_kpis_by_collection` | `from`, `to` | Top collection leaderboard + drawer. |
|  | `sales_ops_kpis_monthly_by_collection` | `from`, `to` | Margin trend per collection. |
|  | `sales_ops_collections_by_dealer` | `p_collection`, `from`, `to` | Dealer drilldown API `/api/collection-by-dealer`. |
|  | `list_future_sale_opps_open` | `from`, `to` | Future opportunity table. |
|  | `list_incoming_stock_by_collection` | `from`, `to` | Incoming stock table. |
| Geographic Sales Analysis (`lib/mbic-supabase.ts`) | `sales_by_zip_fl` | `from_date`, `to_date`, `p_category`, `p_collection` | Aggregates sales by Florida ZIP code for choropleth map. |
|  | `dealers_by_zip` | `p_zip_code`, `from_date`, `to_date` | Dealer-level drill-down for specific ZIP with city names and rep assignments. |
| Forms & Catalog (`lib/forms/catalog.ts`) | `get_colors_by_collection_v2` | `p_collection` | Color catalog for `/forms` (also exposed via `/api/forms/catalog/colors`). |
|  | Tables: `sales_reps_demo`, `customers_demo`, `product_categories`, `product_category_collection_map` | server selects | Populate dependent dropdowns (rep → dealer → category → collection) in public forms. |
|  | `loss_opportunities` | insert/select | POST `/api/forms/loss-opportunity` stores submissions then triggers n8n webhook. |
| Diagnostics & Utilities | `/api/diag`, `/api/diag-salesops` | query params `from`, `to` | Server routes hitting the same RPC suites as dashboard and sales-ops for health checks. |
|  | `/api/diag-forms` | `repId`, `category`, `collection`, `dryRun` | Calls catalog endpoints + optional insert dry-run to surface form health. |
|  | Settings (`lib/forms/settings.ts`, `/api/settings/webhooks`) | Tables: `mbic_settings` | GET/PUT used to persist n8n webhook URLs + active mode. |

> For quick verification in production:
>
> ```bash
> curl -s 'https://cpf-mbic2.netlify.app/api/diag-forms?repId=13&category=vinyl&collection=SpiritXL' | jq
> curl -s 'https://cpf-mbic2.netlify.app/api/forms/catalog/colors?collection=SpiritXL' | jq '.meta'
> ```
