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
- Supabase queries live in `lib/supabase/queries.ts` and are shared by page components and API handlers.
- `middleware.ts` protects the Retell AI webhook by enforcing `RETELL_AI_SECRET`.

## Data Architecture & Supabase Integration

The MBIC dashboard relies on Supabase Postgres as the single source of truth. Below is a map of the current tables and where they surface in the UI.

### Sales & Revenue (Dashboard + Sales pages)

| Table | Purpose | Screen usage | Helper functions |
| --- | --- | --- | --- |
| `sales_demo` | Raw invoice data (amount, date, rep, customer). Columns include `sale_id`, `customer_id`, `rep_id`, `invoice_date`, `invoice_amount`, `collection`, etc. | Dashboard KPI cards, revenue trend, “Top Dealers” table, Sales Performance metrics | `lib/supabase/queries.ts` → `fetchRevenueSummary`, `fetchRevenueTrend`, `fetchTopDealers`, `fetchDealerBreakdownByRep`, `fetchRepSalesTrend`, `fetchDealerSalesTrend` |
| `customers_demo` | Dealer records linked to reps (`rep_id`). Columns: `customer_id`, `dealer_name`, `rep_id`. | Resolves dealer names when aggregating revenue | Same helpers as above |
| `sales_reps_demo` | Sales rep directory containing `rep_id`, `rep_name` (and additional profile columns). | Populates the Sales rep dropdown and the “Top Sales Reps by Revenue” ranking | `fetchSalesReps`, `fetchTopRepsByRevenue`, `fetchActiveCustomersByRep` |

The helper util `fetchDataset` (in `lib/supabase/queries.ts`) batches all three tables per request. Numeric values coming from Supabase (`numeric` columns) are coerced to Numbers before aggregation so the UI can format them reliably.

### Customer Sentiment

| Table | Purpose | Screen usage | Helper functions |
| --- | --- | --- | --- |
| `sentiment_stories` | Stores qualitative feedback (`brand`, `summary`, `quote`, `sentiment`, `keywords`, `channel`, timestamps). | Customer Sentiment page cards (`/sentiment`) | `lib/supabase/sentiment.ts` → `fetchSentimentStories` |

### Marketing (CPF Launchpad)

| Table | Purpose | Screen usage | Helper / Sync |
| --- | --- | --- | --- |
| `marketing_cpf_launchpad_summary` | Daily KPI snapshot (`unique_visitors`, `sessions`, `bounce_rate`, `leads`, `cpl`, `daily_budget`). | Marketing KPI cards | Filled by Supabase Edge Function `fetch-cpf-launchpad-marketing-data` (nightly GitHub Action + manual sync button) |
| `marketing_cpf_launchpad_daily` | Per-channel Google/Meta timeseries (`stat_date`, `channel`, `spend`, `leads`, `clicks`). | Leads by Platform & Daily Spend charts | Same Edge Function + manual sync |

The frontend still ships with fallback seed data in `lib/data/marketing.ts`, but once the GA integration is fully wired, the Marketing screen will read directly from the Supabase tables above.

## Deployment (Netlify)

1. Connect the GitHub repository to Netlify.
2. Set the environment variables listed above in Netlify → Site settings → Environment variables.
3. Build command: `npm run build`
4. Publish directory: `.next`

Every push to `main` will trigger a Netlify deploy.
