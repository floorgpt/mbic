# Operations Hub - Technical Documentation

## Overview

The Operations Hub (`/ops` page) provides a centralized interface for managing future sale opportunities and tracking logistics KPIs. This document explains the data architecture, API endpoints, components, and instructions for transitioning from test/seed data to production data.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Tables](#database-tables)
3. [API Endpoints](#api-endpoints)
4. [Supabase RPC Functions](#supabase-rpc-functions)
5. [React Components](#react-components)
6. [Data Flow](#data-flow)
7. [Switching from Test to Production Data](#switching-from-test-to-production-data)
8. [Download/Export Functionality](#downloadexport-functionality)
9. [Deployment Checklist](#deployment-checklist)

---

## Architecture Overview

The Operations Hub consists of two main sections:

### 1. Future Sale Opportunities
- **Purpose**: Track potential sales projects pending stock confirmation
- **Data Source**: `future_sale_opportunities` table
- **Features**:
  - Totalization cards (Total SqFt, Revenue at Risk)
  - Interactive table with filtering and sorting
  - Detailed modal for viewing/editing opportunities
  - Stock confirmation workflow with webhook notifications

### 2. Logistics Dashboard
- **Purpose**: Monitor key logistics metrics, order status, and delivery performance
- **Data Source**: `logistics_kpis` table (currently using dummy/seed data)
- **Features**:
  - 5 KPI cards (Sales, Costs, Gross Margin, Inventory Turnover, Avg. Delivery Time)
  - Orders by Delivery Status donut chart
  - Order Accuracy trend bar chart
  - CSV/JSON export functionality

---

## Database Tables

### `future_sale_opportunities`

**Location**: Existing production table
**Purpose**: Stores future sales projects submitted by sales reps

**Key Columns**:
- `id` (bigint, PK): Unique identifier
- `project_name` (text): Name of the project
- `dealer_id` (integer): Foreign key to `customers_demo`
- `rep_id` (integer): Foreign key to `sales_reps_demo`
- `expected_qty` (numeric): Expected quantity in square feet
- `expected_unit_price` (numeric): Unit price per square foot
- `expected_sku` (text): Format: `"collection:color"` (e.g., `"quick48+:Rustic Pine"`)
- `probability_pct` (integer): Probability of closing (0-100)
- `expected_close_date` (date): Anticipated close date
- `needed_by_date` (date): When stock is needed
- `status` (text): `"open"`, `"in_process"`, or `"closed"`
- `ops_stock_confirmed` (boolean): Whether ops confirmed stock availability
- `ops_confirmed_at` (timestamptz): When stock was confirmed
- `notes` (text): Additional notes

**Indexes**:
- Primary key on `id`
- Index on `created_at` for sorting

### `logistics_kpis`

**Location**: `supabase/migrations/20250110_logistics_kpis.sql`
**Purpose**: Stores monthly logistics performance metrics

**Key Columns**:
- `id` (bigserial, PK): Unique identifier
- `month` (integer): Month number (1-12)
- `year` (integer): Year (e.g., 2025)
- `sales` (numeric): Total sales amount for the month
- `costs` (numeric): Total costs for the month
- `gross_margin_pct` (numeric): Gross margin percentage
- `inventory_turnover` (numeric): Inventory turnover ratio
- `avg_delivery_days` (integer): Average delivery time in days
- `delivered_orders` (integer): Count of delivered orders
- `in_progress_orders` (integer): Count of orders in progress
- `not_delivered_orders` (integer): Count of not delivered orders
- `order_accuracy_pct` (numeric): Order accuracy percentage
- `created_at`, `updated_at` (timestamptz): Audit timestamps

**Unique Constraint**: `(month, year)` - One row per month

**Sample Seed Data** (Jan-Sept 2025):
```sql
-- September 2025 (most recent)
INSERT INTO logistics_kpis (month, year, sales, costs, gross_margin_pct, inventory_turnover, avg_delivery_days, delivered_orders, in_progress_orders, not_delivered_orders, order_accuracy_pct)
VALUES (9, 2025, 733284.00, 439367.00, 33.1, 3.5, 65, 198, 19, 5, 96.2);
```

---

## API Endpoints

### Future Sales Opportunities

#### `GET /api/ops/future-sales`
**File**: `app/api/ops/future-sales/route.ts`
**Purpose**: Fetch all future sale opportunities with dealer/rep names joined

**Response**:
```typescript
{
  ok: boolean;
  data: FutureSaleOpportunityDetail[];
  count: number;
  err?: string;
}
```

**Key Implementation Details**:
- Fetches opportunities, dealers, and reps in parallel
- Uses in-memory Map joins for performance
- Parses `expected_sku` into `collection` and `color` fields
- Limits to 100 most recent opportunities

#### `GET /api/ops/future-sales/[id]`
**File**: `app/api/ops/future-sales/[id]/route.ts`
**Purpose**: Fetch a single opportunity by ID

#### `PATCH /api/ops/future-sales/[id]`
**File**: `app/api/ops/future-sales/[id]/route.ts`
**Purpose**: Update opportunity fields (status, notes, qty, price, etc.)

**Request Body**:
```typescript
{
  status?: "open" | "in_process" | "closed";
  notes?: string;
  expected_qty?: number;
  expected_unit_price?: number;
  probability_pct?: number;
  expected_close_date?: string | null;
  needed_by_date?: string | null;
}
```

#### `DELETE /api/ops/future-sales/[id]`
**File**: `app/api/ops/future-sales/[id]/route.ts`
**Purpose**: Delete an opportunity

#### `POST /api/ops/future-sales/[id]/confirm-stock`
**File**: `app/api/ops/future-sales/[id]/confirm-stock/route.ts`
**Purpose**: Confirm stock availability and trigger webhook

**What it does**:
1. Updates `ops_stock_confirmed = true`
2. Sets `ops_confirmed_at = now()`
3. Changes `status = "closed"`
4. Triggers webhook notification (non-blocking)

### Logistics Data

#### `GET /api/ops/logistics`
**File**: `app/api/ops/logistics/route.ts`
**Purpose**: Fetch current month logistics KPIs with year-over-year changes

**Response**:
```typescript
{
  ok: boolean;
  data: LogisticsKPIWithChanges | null;
  orders_by_status: OrdersByStatus | null;
  order_accuracy_trend: OrderAccuracyData[];
  err?: string;
}
```

**Data Sources**:
- Attempts to fetch from `logistics_kpis` table
- Falls back to hardcoded dummy data if table doesn't exist or is empty
- Calculates percentage changes by comparing with previous year same month (or previous month)

**Response Example**:
```json
{
  "ok": true,
  "data": {
    "month": 9,
    "year": 2025,
    "sales": 733284,
    "costs": 439367,
    "gross_margin_pct": 33.1,
    "inventory_turnover": 3.5,
    "avg_delivery_days": 65,
    "sales_change_pct": 20.4,
    "costs_change_pct": 14.2,
    "margin_change_pct": 2.3,
    "turnover_change_pct": 29.5,
    "delivery_change_pct": 1.1
  },
  "orders_by_status": {
    "delivered": 198,
    "in_progress": 19,
    "not_delivered": 5
  },
  "order_accuracy_trend": [
    { "month": "Apr", "year": 2025, "accuracy_pct": 96.3 },
    { "month": "May", "year": 2025, "accuracy_pct": 96.7 },
    { "month": "Jun", "year": 2025, "accuracy_pct": 96.1 },
    { "month": "Jul", "year": 2025, "accuracy_pct": 95.6 },
    { "month": "Aug", "year": 2025, "accuracy_pct": 95.9 },
    { "month": "Sep", "year": 2025, "accuracy_pct": 96.2 }
  ]
}
```

#### `GET /api/ops/logistics/export?format=csv`
**File**: `app/api/ops/logistics/export/route.ts`
**Purpose**: Export all logistics data as CSV or JSON

**Query Parameters**:
- `format`: `"csv"` or `"json"` (defaults to `"json"`)

**CSV Response**: Returns downloadable CSV file with headers
**JSON Response**: Returns all rows as JSON array

---

## Supabase RPC Functions

### `get_current_logistics_kpis()`

**File**: `supabase/migrations/20250110_logistics_kpis.sql`
**Purpose**: Get current month KPIs with year-over-year percentage changes
**Returns**: Single row with current metrics and calculated change percentages

**Usage**:
```sql
SELECT * FROM get_current_logistics_kpis();
```

**Note**: Currently not used by the API (API calculates changes in JavaScript), but available for direct database queries.

### `get_all_logistics_kpis()`

**File**: `supabase/migrations/20250110_logistics_kpis.sql`
**Purpose**: Get all logistics KPIs sorted by date (newest first)
**Returns**: All rows from `logistics_kpis` table

**Usage**:
```sql
SELECT * FROM get_all_logistics_kpis();
```

---

## React Components

### Core Components

#### `app/(dashboard)/ops/page.tsx`
**Type**: Server Component (Next.js Page)
**Purpose**: Main Operations Hub page layout

**Structure**:
```tsx
<PageHeader />

{/* Future Sale Opportunities Section */}
<section>
  <FutureSalesTotals />      {/* Totalization cards */}
  <FutureSalesTable />       {/* Main table with opportunities */}
</section>

{/* Logistics Dashboard Section */}
<section>
  <LogisticsDownloadMenu />  {/* 3-dots menu in header */}
  <LogisticsDashboard />     {/* KPI cards and charts */}
</section>
```

### Future Sales Components

#### `components/ops/future-sales-totals.tsx`
**Type**: Client Component
**Purpose**: Display Total SqFt and Revenue at Risk cards

**Data Fetching**: Calls `/api/ops/future-sales` and calculates totals client-side

**Calculations**:
```javascript
total_sqft = sum(opportunities.expected_qty)
revenue_at_risk = sum(opportunities.potential_amount)
  where potential_amount = expected_qty * expected_unit_price
```

#### `components/ops/future-sales-table.tsx`
**Type**: Client Component
**Purpose**: Interactive table displaying all opportunities

**Features**:
- Click row to open detail modal
- Shows initials for Rep names (full name on hover)
- Color-coded status badges
- Confirmed stock indicator badge
- Real-time updates after edits/deletes

**Columns**:
1. Project Name
2. Rep (initials with tooltip)
3. Dealer
4. Color (parsed from `expected_sku`)
5. Qty (SqFt)
6. Unit Price
7. Revenue (calculated)
8. Needed By Date
9. Status
10. Actions (View button + Confirmed badge)

#### `components/ops/opportunity-detail-modal.tsx`
**Type**: Client Component
**Purpose**: Modal for viewing/editing opportunity details

**Modes**:
- **View Mode**: Display all fields, "Edit Details" and "Confirm Stock" buttons
- **Edit Mode**: Inline editing with Save/Cancel/Delete buttons

**Key Functions**:
- `onUpdate(id, data)`: Updates opportunity via PATCH
- `onConfirmStock(id, projectName)`: Confirms stock via POST
- `onDelete(id)`: Deletes opportunity via DELETE

### Logistics Components

#### `components/ops/logistics-dashboard.tsx`
**Type**: Client Component
**Purpose**: Main container for logistics KPIs and charts

**Data Fetching**: Calls `/api/ops/logistics` on mount

**Layout**:
```tsx
<div>
  {/* 5 KPI Cards in grid */}
  <div className="grid grid-cols-5">
    <LogisticsKPICard title="Sales" ... />
    <LogisticsKPICard title="Costs" ... />
    <LogisticsKPICard title="Gross Margin" ... />
    <LogisticsKPICard title="Inventory Turnover" ... />
    <LogisticsKPICard title="Avg. Delivery Time" ... />
  </div>

  {/* Charts in 2-column grid */}
  <div className="grid grid-cols-2">
    <OrdersByStatusChart data={orders_by_status} />
    <OrderAccuracyChart data={order_accuracy_trend} />
  </div>
</div>
```

#### `components/ops/logistics-kpi-card.tsx`
**Type**: Client Component (Presentational)
**Purpose**: Reusable KPI card with value, change indicator, and trend icon

**Props**:
```typescript
{
  title: string;                    // "Sales", "Costs", etc.
  value: string | number;           // Main metric value
  changePct: number;                // Percentage change (-100 to +100)
  changeLabel?: string;             // "From Previous Year" (default)
  suffix?: string;                  // Additional text after value
  variant?: "currency" | "percentage" | "decimal" | "days";
}
```

**Variants**:
- `currency`: Formats as `$733,284`
- `percentage`: Formats as `33.1%`
- `decimal`: Formats as `3.5` (1 decimal)
- `days`: Formats as `65 Days`

**Change Indicator Colors**:
- Green (positive, trending up): `bg-emerald-100 text-emerald-700`
- Red (negative, trending down): `bg-red-100 text-red-700`
- Gray (neutral): `bg-muted/50 text-muted-foreground`

#### `components/ops/orders-by-status-chart.tsx`
**Type**: Client Component
**Purpose**: Donut chart showing order distribution by delivery status

**Data Structure**:
```typescript
{
  delivered: number;      // Count of delivered orders
  in_progress: number;    // Count of in-progress orders
  not_delivered: number;  // Count of not delivered orders
}
```

**Chart Library**: Recharts (`PieChart`, `Pie`, `Cell`)

**Colors**:
- Delivered: `#10b981` (emerald-500)
- In Progress: `#f59e0b` (amber-500)
- Not Delivered: `#ef4444` (red-500)

**Features**:
- Custom tooltip with order count and percentage
- Custom legend with counts
- Total orders summary card
- Delivery rate calculation

#### `components/ops/order-accuracy-chart.tsx`
**Type**: Client Component
**Purpose**: Bar chart showing order accuracy trend over last 6 months

**Data Structure**:
```typescript
{
  month: string;        // "Jan", "Feb", etc.
  year: number;         // 2025
  accuracy_pct: number; // 94.2, 95.8, etc.
}[]
```

**Chart Library**: Recharts (`BarChart`, `Bar`, `CartesianGrid`, `XAxis`, `YAxis`)

**Features**:
- Custom tooltip with month/year and accuracy
- Y-axis domain: 90-100% for better visual scale
- Summary cards showing current accuracy and 6-month average

#### `components/ops/logistics-download-menu.tsx`
**Type**: Client Component
**Purpose**: Dropdown menu with CSV/JSON export options

**Features**:
- 3-dots (MoreVertical) icon button
- Dropdown with "Download CSV" and "Download JSON" options
- Loading spinner during download
- Client-side file download (creates blob, triggers download)

**Export Flow**:
1. User clicks "Download CSV" or "Download JSON"
2. Component calls `/api/ops/logistics/export?format=csv` or `?format=json`
3. Response blob is created as downloadable file
4. File name: `logistics_kpis_YYYY-MM-DD.csv` (or `.json`)

---

## Data Flow

### Future Sales Opportunities Flow

```
User Submits Form (/forms page)
  ↓
API: POST /api/forms/future-sale
  ↓
Insert into future_sale_opportunities table
  ↓
Webhook notification to configured endpoint
  ↓
Operations Hub (/ops page) displays new opportunity
  ↓
Ops user clicks "Confirm Stock"
  ↓
API: POST /api/ops/future-sales/[id]/confirm-stock
  ↓
Update: ops_stock_confirmed = true, status = "closed"
  ↓
Webhook notification (stock confirmed)
```

### Logistics Dashboard Flow

```
Page Load: /ops
  ↓
Client Component: LogisticsDashboard
  ↓
API: GET /api/ops/logistics
  ↓
Try: SELECT FROM logistics_kpis (table)
  ↓
If table exists: Return real data
If no table or empty: Return dummy/seed data
  ↓
Calculate YoY percentage changes
  ↓
Return: { data, orders_by_status, order_accuracy_trend }
  ↓
Components render KPI cards and charts
```

### Export Flow

```
User clicks 3-dots menu → "Download CSV"
  ↓
API: GET /api/ops/logistics/export?format=csv
  ↓
Try: SELECT FROM logistics_kpis
  ↓
If table exists: Use real data
If not: Use dummy/seed data
  ↓
Format as CSV with headers
  ↓
Return CSV file with Content-Disposition header
  ↓
Browser downloads: logistics_kpis_2025-11-10.csv
```

---

## Switching from Test to Production Data

### Current State (Test/Seed Data)

Currently, the Logistics Dashboard uses **dummy/seed data** hardcoded in the API route ([app/api/ops/logistics/route.ts:18-27](app/api/ops/logistics/route.ts#L18-L27)).

The API attempts to query the `logistics_kpis` table, but if the table doesn't exist or is empty, it falls back to the dummy data.

### Steps to Switch to Production Data

#### Step 1: Create the `logistics_kpis` Table

Run the migration to create the table and RPC functions:

```bash
# Option A: Using Supabase CLI (if connected to remote)
npx supabase db push

# Option B: Using SQL Editor in Supabase Dashboard
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Copy contents of supabase/migrations/20250110_logistics_kpis.sql
# 3. Run the SQL script
```

#### Step 2: Populate with Production Data

You have two options for populating production data:

##### Option A: Import CSV Template

1. Download the seed data as CSV:
   ```
   Navigate to: http://localhost:3000/ops
   Click 3-dots menu → Download CSV
   ```

2. Replace dummy data with real production values in Excel/Sheets

3. Import via Supabase Dashboard:
   ```
   Supabase Dashboard → Table Editor → logistics_kpis → Import
   Upload your modified CSV file
   ```

##### Option B: Insert via SQL

```sql
-- Insert real production data
INSERT INTO logistics_kpis (
  month, year, sales, costs, gross_margin_pct,
  inventory_turnover, avg_delivery_days,
  delivered_orders, in_progress_orders, not_delivered_orders,
  order_accuracy_pct
)
VALUES
  (1, 2025, 950000.00, 570000.00, 34.2, 4.1, 58, 210, 15, 3, 97.5),
  (2, 2025, 980000.00, 588000.00, 34.5, 4.2, 56, 225, 12, 2, 97.8),
  -- ... more rows for each month
ON CONFLICT (month, year) DO UPDATE
SET
  sales = EXCLUDED.sales,
  costs = EXCLUDED.costs,
  gross_margin_pct = EXCLUDED.gross_margin_pct,
  inventory_turnover = EXCLUDED.inventory_turnover,
  avg_delivery_days = EXCLUDED.avg_delivery_days,
  delivered_orders = EXCLUDED.delivered_orders,
  in_progress_orders = EXCLUDED.in_progress_orders,
  not_delivered_orders = EXCLUDED.not_delivered_orders,
  order_accuracy_pct = EXCLUDED.order_accuracy_pct,
  updated_at = NOW();
```

#### Step 3: Set Up Automated Data Pipeline (Recommended)

Create a scheduled job to update `logistics_kpis` monthly from your production data sources:

```sql
-- Example: Create a materialized view that aggregates from production tables
CREATE MATERIALIZED VIEW logistics_kpis_monthly AS
SELECT
  EXTRACT(MONTH FROM order_date) AS month,
  EXTRACT(YEAR FROM order_date) AS year,
  SUM(order_total) AS sales,
  SUM(order_cost) AS costs,
  AVG(gross_margin_pct) AS gross_margin_pct,
  -- ... calculate other metrics from your production tables
FROM production_orders
GROUP BY EXTRACT(YEAR FROM order_date), EXTRACT(MONTH FROM order_date);

-- Refresh monthly via cron job or Supabase Edge Function
REFRESH MATERIALIZED VIEW logistics_kpis_monthly;

-- Then insert/update into logistics_kpis table
INSERT INTO logistics_kpis (...)
SELECT ... FROM logistics_kpis_monthly
ON CONFLICT (month, year) DO UPDATE SET ...;
```

#### Step 4: Verify Production Data

After populating the table:

1. Navigate to `/ops` page
2. Logistics Dashboard should now display real data
3. Check browser console for log messages:
   - `[ops] logistics:db-error ... - using dummy data` = Still using fallback
   - No error message = Successfully using production data

4. Download CSV to verify data values

#### Step 5: Remove Dummy Data Fallback (Optional)

Once confident in production data, you can remove the dummy data fallback:

**File**: `app/api/ops/logistics/route.ts`

```typescript
// Remove or comment out DUMMY_DATA constant (lines 18-27)
// Modify error handling to return error instead of fallback:

if (dbError) {
  console.error("[ops] logistics:db-error", dbError.message);
  return NextResponse.json(
    {
      ok: false,
      data: null,
      orders_by_status: null,
      order_accuracy_trend: [],
      err: `Database error: ${dbError.message}`,
    } satisfies LogisticsResponse,
    { status: 500 },
  );
}

if (!dbData || dbData.length === 0) {
  return NextResponse.json(
    {
      ok: false,
      data: null,
      orders_by_status: null,
      order_accuracy_trend: [],
      err: "No logistics data available. Please populate the logistics_kpis table.",
    } satisfies LogisticsResponse,
    { status: 404 },
  );
}
```

### Monthly Update Process (Production)

For ongoing production use, establish a monthly process:

1. **Automated** (Recommended):
   - Set up Supabase Edge Function or cron job to run on 1st of each month
   - Aggregate previous month's data from production tables
   - Insert new row into `logistics_kpis`

2. **Manual** (Alternative):
   - Export data from BI/analytics tools
   - Format as CSV with correct columns
   - Import via Supabase Dashboard or SQL INSERT

3. **Verification**:
   - Check `/ops` page displays new month's data
   - Verify percentage changes are calculated correctly
   - Export CSV to audit data

---

## Download/Export Functionality

### CSV Export Format

**Columns**:
```
Month, Year, Sales, Costs, Gross Margin %, Inventory Turnover, Avg Delivery Days, Delivered Orders, In Progress Orders, Not Delivered Orders, Order Accuracy %
```

**Example**:
```csv
Month,Year,Sales,Costs,Gross Margin %,Inventory Turnover,Avg Delivery Days,Delivered Orders,In Progress Orders,Not Delivered Orders,Order Accuracy %
1,2025,608900,365340,30.5,2.8,72,145,23,8,94.2
2,2025,652100,391260,31.2,3.1,68,158,19,6,95.1
...
```

### JSON Export Format

```json
[
  {
    "id": 1,
    "month": 1,
    "year": 2025,
    "sales": 608900,
    "costs": 365340,
    "gross_margin_pct": 30.5,
    "inventory_turnover": 2.8,
    "avg_delivery_days": 72,
    "delivered_orders": 145,
    "in_progress_orders": 23,
    "not_delivered_orders": 8,
    "order_accuracy_pct": 94.2,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  },
  ...
]
```

### Using Exports as Templates

1. Download current data (dummy or production)
2. Open in Excel/Google Sheets
3. Modify values for new months or corrections
4. Save as CSV (keep exact same column headers)
5. Import back into Supabase:
   - Dashboard → Table Editor → logistics_kpis → Import
   - Map CSV columns to table columns
   - Handle conflicts: "Update existing rows" or "Skip duplicates"

---

## Deployment Checklist

### Pre-Deployment (Development)

- [x] All components render without errors
- [x] API routes return expected data structures
- [x] TypeScript types are accurate
- [x] Dummy data fallback works if table doesn't exist
- [x] CSV/JSON export functionality works
- [x] Future Sales table shows dealer/rep names (not "Unknown")
- [x] Stock confirmation workflow completes successfully

### Deployment to Production

- [ ] Run migration to create `logistics_kpis` table:
  ```bash
  npx supabase db push
  ```

- [ ] Verify table exists in Supabase Dashboard:
  - Go to Table Editor → logistics_kpis
  - Check schema matches migration file

- [ ] Enable Row Level Security (RLS) policies:
  - Policy already created in migration
  - Verify authenticated users can read/write

- [ ] Populate initial data:
  - Use CSV import OR
  - Run SQL INSERT statements

- [ ] Test `/ops` page in production:
  - Future Sales Opportunities section loads
  - Logistics Dashboard displays data (real or dummy)
  - Download CSV/JSON works

- [ ] Configure webhook endpoints (if not already done):
  - Forms webhook: For new opportunity submissions
  - Stock confirmation webhook: For ops confirmations

- [ ] Set up monitoring:
  - Error tracking for API routes
  - Database query performance
  - Monthly data updates

### Post-Deployment

- [ ] Document data source mappings (where production metrics come from)
- [ ] Schedule monthly data refresh process
- [ ] Train operations team on new features:
  - How to confirm stock
  - How to edit opportunities
  - How to download logistics data
  - How to update monthly KPIs

---

## Troubleshooting

### Issue: Logistics Dashboard shows "No data available"

**Causes**:
1. `logistics_kpis` table doesn't exist
2. Table exists but is empty
3. Database connection error

**Solutions**:
1. Check if migration ran successfully:
   ```sql
   SELECT * FROM logistics_kpis LIMIT 1;
   ```
2. Check browser console for error messages
3. Verify API route returns dummy data as fallback
4. Check Supabase project is connected correctly

### Issue: Dealer/Rep names show as "Unknown"

**Cause**: Map lookup type mismatch (numeric vs string keys)

**Solution**: Already fixed in latest code. Verify you have latest version of:
- `app/api/ops/future-sales/route.ts`
- `app/api/ops/future-sales/[id]/route.ts`
- `app/api/ops/future-sales/[id]/confirm-stock/route.ts`

### Issue: CSV download fails

**Causes**:
1. Popup blocker preventing download
2. API route error
3. CORS issue

**Solutions**:
1. Check browser console for errors
2. Test API directly: `GET /api/ops/logistics/export?format=csv`
3. Verify Content-Disposition header is set correctly

### Issue: KPI percentage changes are incorrect

**Cause**: Not enough historical data for comparison

**Solution**:
- Ensure at least 2 months of data exist
- Algorithm compares current month with same month previous year, or falls back to previous month
- If only 1 month exists, changes will show fallback values from wireframe

---

## Future Enhancements

Potential improvements for future iterations:

1. **Real-time Updates**: Use Supabase Realtime subscriptions for live dashboard updates
2. **Date Range Filters**: Allow users to select custom date ranges for KPIs
3. **Drill-down Reports**: Click KPI card to see detailed breakdown
4. **Alerts/Notifications**: Email/Slack alerts when KPIs cross thresholds
5. **Forecast Trends**: Machine learning predictions for future metrics
6. **Inventory Integration**: Link logistics KPIs with inventory levels
7. **Multi-warehouse Support**: Track metrics per warehouse/location
8. **Excel Export**: Support `.xlsx` format with multiple sheets
9. **Scheduled Exports**: Email reports automatically each month
10. **Advanced Filters**: Filter future sales by rep, dealer, status, date range

---

## Support & Maintenance

For questions or issues:

1. Check this README first
2. Review API route code for data flow logic
3. Check Supabase Dashboard for table schema and data
4. Review browser console and server logs for errors
5. Verify environment variables are set correctly

**Key Files to Review**:
- Migration: `supabase/migrations/20250110_logistics_kpis.sql`
- API Routes: `app/api/ops/logistics/route.ts`, `app/api/ops/future-sales/route.ts`
- Main Page: `app/(dashboard)/ops/page.tsx`
- Components: `components/ops/*`
- Types: `types/logistics.ts`, `types/ops.ts`

---

**Document Version**: 1.0
**Last Updated**: 2025-11-10
**Author**: MBIC Technical Team
