# Sales Hub Settings - User Guide

## Overview
The Sales Hub Settings panel provides comprehensive management tools for sales leadership to manage sales representatives and their monthly targets.

## Features

### 1. Sales Representatives Management

#### Add New Rep
1. Navigate to **Settings → Sales Hub**
2. Click the **"Add Rep"** button
3. Enter the rep's full name (e.g., "Juan Pedro Boscan")
4. Click **"Save"**
5. Default targets of $200k/month will be automatically created for the current year

#### Edit Existing Rep
1. Click the **Edit** icon (pencil) next to any rep
2. Update the rep name
3. Click **"Save"**

**Note**: When a new rep is added, the system automatically creates 12 monthly targets (Jan-Dec) for the current year with a default target of $200,000.

### 2. Monthly Sales Targets Management

#### Individual Target Editing
1. Select the desired year from the dropdown (2024, 2025, 2026)
2. Click on any target cell in the table
3. Enter the new target amount
4. Press **Enter** to save or **Escape** to cancel
5. Amounts are displayed in thousands (e.g., "$200k" = $200,000)

**Features:**
- Inline editing for quick updates
- Year selector to view/edit different fiscal years
- Visual representation in thousands for better readability
- Click to edit, Enter to save, Escape to cancel

#### Bulk Upload via CSV

**Step 1: Download Template**
1. Click **"CSV Template"** button
2. A CSV file will be downloaded with all reps and months pre-filled with $200k defaults

**Step 2: Edit CSV**
Open the CSV in Excel or Google Sheets and modify target amounts:

```csv
rep_id,target_month,target_amount
1,2025-01,250000
1,2025-02,250000
1,2025-03,300000
2,2025-01,180000
2,2025-02,180000
```

**CSV Format Requirements:**
- **Columns**: `rep_id`, `target_month`, `target_amount`
- **target_month format**: `YYYY-MM` (e.g., "2025-01")
- **target_amount**: Numeric value (e.g., 250000 for $250k)

**Step 3: Upload CSV**
1. Click **"Upload CSV"** button
2. Select your edited CSV file
3. System will validate and update all targets
4. Success message will show number of targets updated

**Benefits:**
- Update hundreds of targets in seconds
- Use spreadsheet formulas for calculations
- Bulk apply increases/decreases across teams
- Easy quarterly or annual planning

### 3. Data Validation

The system validates all inputs:
- **Rep Name**: Cannot be empty
- **Target Amount**: Must be a valid number ≥ 0
- **CSV Format**: Must include required columns
- **Month Format**: Must be YYYY-MM

## API Endpoints

### Sales Reps
- `GET /api/sales-hub/reps` - Fetch all reps
- `POST /api/sales-hub/reps` - Create new rep
  ```json
  { "rep_name": "John Doe" }
  ```
- `PATCH /api/sales-hub/reps` - Update rep
  ```json
  { "rep_id": 1, "rep_name": "Jane Doe" }
  ```

### Sales Targets
- `GET /api/sales-hub/targets?year=2025` - Fetch targets for a year
- `PATCH /api/sales-hub/targets` - Update single target
  ```json
  {
    "rep_id": 1,
    "target_month": "2025-01",
    "target_amount": 250000
  }
  ```
- `POST /api/sales-hub/targets` - Bulk upload targets
  ```json
  {
    "targets": [
      { "rep_id": 1, "target_month": "2025-01", "target_amount": 250000 },
      { "rep_id": 1, "target_month": "2025-02", "target_amount": 250000 }
    ]
  }
  ```

## Database Schema

### sales_reps_demo Table
```sql
CREATE TABLE sales_reps_demo (
  rep_id BIGSERIAL PRIMARY KEY,
  rep_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### sales_targets Table
```sql
CREATE TABLE sales_targets (
  id BIGSERIAL PRIMARY KEY,
  rep_id BIGINT NOT NULL,
  target_month TEXT NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL DEFAULT 200000.00,
  fiscal_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(rep_id, target_month)
);
```

**Key Constraints:**
- `UNIQUE(rep_id, target_month)` - One target per rep per month
- Foreign key relationship with `sales_reps_demo`

## Use Cases

### Scenario 1: New Rep Onboarding
1. Click "Add Rep"
2. Enter name: "Maria Garcia"
3. System creates rep_id and 12 monthly targets
4. Edit specific months if needed

### Scenario 2: Quarterly Target Adjustment
1. Download CSV template
2. Open in Excel
3. Filter for Q2 months (04, 05, 06)
4. Apply 10% increase formula
5. Upload CSV
6. All Q2 targets updated instantly

### Scenario 3: Individual Performance Plan
1. Navigate to Sales Hub
2. Find rep "Juan Pedro Boscan"
3. Click on March 2025 target
4. Change from $200k to $250k (stretch goal)
5. Press Enter to save

### Scenario 4: Annual Planning
1. Select "2026" from year dropdown
2. Download CSV template for 2026
3. Work with sales leadership to set targets
4. Upload finalized targets CSV
5. All 2026 targets set for entire team

## Security & Permissions

**Current Implementation:**
- Server-side API routes use Supabase admin client
- No client-side RLS enforcement (admin operations)

**Recommended for Production:**
- Add role-based access control
- Restrict to "Sales Director" or "Sales Manager" roles
- Add audit logging for target changes
- Implement approval workflow for large changes

## Troubleshooting

### CSV Upload Fails
- Check column headers match exactly: `rep_id`, `target_month`, `target_amount`
- Ensure no extra spaces or special characters
- Verify date format is YYYY-MM
- Confirm rep_id exists in sales_reps_demo table

### Target Not Saving
- Verify amount is a valid number
- Check network tab for API errors
- Ensure you pressed Enter (not just clicking away)
- Check browser console for error messages

### Rep Not Appearing
- Refresh the page
- Check if rep was created in sales_reps_demo table
- Verify no duplicate names causing issues

## Future Enhancements

- [ ] Bulk delete/archive reps
- [ ] Copy targets from previous year
- [ ] Target approval workflow
- [ ] Quarterly target views
- [ ] Achievement progress indicators
- [ ] Target vs actual comparison
- [ ] Team-level target aggregation
- [ ] Export targets to PDF/Excel
- [ ] Historical target changes audit log
- [ ] Role-based access control

## Related Features

- **Team vs Targets Chart** ([Dashboard](../components/dashboard/dealer-sales-pulse.tsx)) - Visualizes actual performance against these targets
- **Dealer Pulse** - Uses targets for achievement percentage calculations
- **Sales Analytics** - All reports reference these target values

## Files Modified

### Components
- `components/settings/sales-hub.tsx` - Main Sales Hub UI component

### API Routes
- `app/api/sales-hub/reps/route.ts` - CRUD for sales reps
- `app/api/sales-hub/targets/route.ts` - CRUD for monthly targets

### Pages
- `app/(dashboard)/settings/page.tsx` - Added Sales Hub tab

### Database
- `sales_reps_demo` - Sales reps table
- `sales_targets` - Monthly targets table (created in migration `20250113_create_sales_targets_table.sql`)

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API endpoints in Network tab
3. Check Supabase logs for database errors
4. Review this documentation for common solutions
