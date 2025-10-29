## MBIC Dashboard (CPF Floors)

Marketing & BI Center (MBIC) for CPF Floors built with Next.js 15, TypeScript, shadcn/ui, Tailwind CSS, Recharts, and Supabase.

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
5. The UI reads `state.meta.ok` to decide whether to show the “Panel failed” badge while still displaying placeholders so the page stays responsive even when some RPCs fail.

You can reproduce the data snapshot locally with:

```bash
npm run dev
open http://localhost:3000/api/diag?from=2025-01-01&to=2025-10-01
open http://localhost:3000/
```

### `/api/diag`

This route (`app/api/diag/route.ts`) exists for QA and external integrations. It calls the **non-safe** helpers (`getOrgKpis`, `getOrgMonthly`, etc.) which throw on error instead of returning fallbacks. The route mirrors the same input defaults and is the quickest way to confirm Supabase data availability.

### Sales Performance (`app/(dashboard)/sales/page.tsx`)

The Sales page uses enriched helper functions because it needs per-rep drill downs:

- `fetchSalesReps()` retrieves the selectable rep list.
- `fetchRepSalesData(repId)` aggregates:
  - Total revenue, invoice counts, unique dealers.
  - Monthly revenue per selected rep (`RepSalesTrend` chart).
  - Dealer-level revenue for the breakdown table (`DealerBreakdownTable`).
- `getDealerMonthly(repId, dealerId)` powers the dealer comparison view and is reused for data consistency validations (Linda Flooring guardrail).

All Sales helpers sit in `lib/mbic-sales.ts` / `lib/db/sales.ts` because they touch additional SQL views. They continue to share the same `getSupabaseAdminClient` factory and numeric coercion utilities to avoid drift.

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
