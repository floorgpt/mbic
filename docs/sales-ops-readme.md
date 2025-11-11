# Sales Operations Dashboard – Implementation Notes

This document explains how the `/sales-ops` page is wired, with emphasis on the latest **Future Sale Opportunities (Unconfirmed)** enhancements.

## Page Overview
- **Route**: `app/(dashboard)/sales-ops/page.tsx`
- **Purpose**: Executive dashboard that blends sales KPIs with Ops signals (incoming stock, future opportunities, comms reports, etc.).
- **Data Source**: Supabase RPC layer defined in the `supabase/migrations/20250107_sales_ops_rpcs_v3.sql` (core KPIs) plus the `20250111_update_future_opps_rpc_v2.sql` fix for future opportunities.
- **Environment prerequisites**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

When either env var is missing the page stays readable but shows warning banners and replaces charts with placeholders.

## Key Components
| Area | Component | Notes |
|------|-----------|-------|
| KPI header tiles | `KpiCard` | Compact formatting via `fmtUSDCompact`, `fmtPct0`. |
| Collections leaderboard | `TopCollections` | Uses `getCollectionsLeaderboard` RPC. |
| Economics trend | `EconomicsChart` | Monthly revenue vs. margin. |
| Ops timeline | `ReportsTimeline` | Bar chart with shadcn chart primitives. |
| Incoming stock | `IncomingStockCard` | Client component that renders Recharts pie of inbound SKU mix. |
| **Future opps** | `FutureOppsCard` (new) | Client component with KPI tiles + charts (details below). |

## Future Opportunities Card (New)
File: `components/sales-ops/future-opps-card.tsx`

### Features
1. **KPI Tiles** – Totals for SqFt quantity (`Total SqFt Quantity`), potential revenue, and open opportunity count. Values use `fmtCompact` / `fmtUSDCompact` for quick scanning.
2. **Pipeline by Close Month** – Bar chart (Recharts) that aggregates `potential_amount` by expected close month. Entries with invalid/missing dates roll into a “TBD” bucket so nothing is lost.
3. **Product Mix (Dual Ring)** – Inner ring rolls up SqFt + blended unit price per collection (grayscale palette). Outer ring shows collection·color demand with a distinct palette and legends/tooltip copy following the framework: `collection • color: <SqFt> @ <unit price> • <total amount>`.
4. **CTA** – Existing “View All in Operations Hub” button retained under the charts to jump to `/ops`.

### Data contract
The component accepts `FutureOpportunityRow[]` (see `types/salesops.ts`). Each row should include:
- `expected_qty`, `expected_unit_price` and/or `potential_amount`
- `expected_close_date` (nullable)
- `expected_sku` (used to split collection vs color)
- `status`

`safePotential()` ensures charts still render when a row only has qty × price (or vice versa).

### Why a client component?
Recharts depends on browser APIs. To avoid “Super expression must either be null or a function” errors we isolate all chart logic behind `"use client"` components (`IncomingStockCard`, `FutureOppsCard`) and import them inside the server page.

## API + RPC Notes
- `getFutureOppsOpen(from, to)` hits the `list_future_sale_opps_open` RPC created by the `20250111_update_future_opps_rpc_v2.sql` migration. The RPC deliberately ignores close-date filters so the dashboard always shows all unconfirmed opportunities.
- Other panels (inventory, reports, comm consistency, etc.) rely on the suite defined in `supabase/migrations/20250107_sales_ops_rpcs_v3.sql`. See `SALES-OPS-MIGRATION-README.md` for deployment instructions.

## Local Development Checklist
1. `npm install` (first run)  
2. `npm run lint` – Uses Next/ESLint. If `.next/cache` doesn’t exist make sure you have write access to the repo root.  
3. `npm run dev` → open `http://localhost:3000/sales-ops`
4. Verify:
   - KPI tiles show non-zero values (requires RPCs + seeded data).
   - Future opps card shows both charts with hover tooltips.
   - CTA navigates to `/ops` and the modal/table there reflects the same opportunities.

## Troubleshooting
- **Empty Future Opps card**: confirm the RPC migration was applied and the Supabase table `future_sale_opportunities` has rows where `ops_stock_confirmed = false`.
- **Chart errors**: ensure the component remains client-side and avoid importing Recharts from the server page.
- **Missing env vars**: set them in `.env.local` or your deployment provider; otherwise `createPanelErrorMeta` marks each panel as failed and renders `ThinkingPlaceholder`.

## Recent Enhancements (Jan 2025)
- Replaced the legacy status donut with a **dual-ring Product Mix** chart (collections inside, colors outside) and legend cards that reuse the “SqFt @ unit price • total amount” story.
- Expanded tooltip formatter to show the same narrative without duplicate metric columns.
- Introduced high-contrast palettes (grayscale inner ring + vibrant outer ring) for better differentiation.
- Renamed the KPI tile to **“Total SqFt Quantity”** and removed the redundant `SqFt` suffix from the number so 77.5K reads cleaner.
- Added guards + helper utilities (`safeQuantity`, `safePotential`) to keep charts stable even when RPC rows omit price or SKU data.

## Next Steps / Ideas
1. Add probability weighting to the pipeline bar chart (`amount * probability_pct` toggle).
2. Surface top dealers/collections inside the card to prioritize outreach.
3. Allow preset filters (e.g., reps, regions) that feed both `/sales-ops` and `/ops`.

Keep this README updated whenever you extend the dashboard so every Agent has an authoritative reference.
