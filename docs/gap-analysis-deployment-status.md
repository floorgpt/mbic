# Gap Analysis Feature - Deployment Status

**Last Updated**: 2025-11-20
**Status**: 🟡 Pending Manual Database Fix

---

## Overview

The Gap Analysis feature has been fully implemented across all layers (database, API, UI, AI chat). However, there's a schema mismatch in the database that requires manual intervention before final testing.

---

## ✅ Completed Tasks

### 1. Database Layer
- ✅ Created table schema: `competitors_market_data`
- ✅ Created RPC function: `get_zip_gap_analysis(from_date, to_date)`
- ✅ Created RPC function: `get_zip_opportunity_details(zip_code)`
- ✅ Migration files created with proper indexes, RLS policies, and permissions
- ✅ TypeScript types added to [lib/mbic-supabase.ts:804-895](lib/mbic-supabase.ts#L804-L895)

### 2. React/TypeScript Layer
- ✅ Custom hook created: [hooks/use-zip-gap-data.ts](hooks/use-zip-gap-data.ts)
- ✅ SafeResult wrappers: `getZipGapAnalysisSafe()` and `getZipOpportunityDetailsSafe()`
- ✅ Type definitions: `ZipGapRow` and `CompetitorRow`

### 3. UI Components
- ✅ Gap Drawer component: [components/dashboard/zip-gap-drawer.tsx](components/dashboard/zip-gap-drawer.tsx)
  - Red accent theme for gap visualization
  - Competitor table with store details
  - Key metrics: Missed Revenue and Competitor Count
  - Recommended actions section
  - AI chat integration (ChatSheet + FloatingNudge)
  - Seeded Q&A for intelligent responses

- ✅ Map Integration: [components/dashboard/florida-zip-sales-map.tsx](components/dashboard/florida-zip-sales-map.tsx)
  - Red circle visualization for gap ZIPs
  - Toggle controls for showing/hiding gaps
  - Circle sizing based on estimated market revenue
  - Click handler to open Gap Drawer
  - Tooltips with gap metrics

### 4. Edge Function
- ✅ Created: [supabase/functions/sync-market-data/index.ts](supabase/functions/sync-market-data/index.ts)
  - Queries OpenStreetMap Overpass API
  - Multiple search strategies (shop tags + name matching)
  - Revenue weighting logic ($45M/$35M/$20M base)
  - Tier multipliers (1.25× high-volume, 0.9× regular)
  - Deduplication and upsert logic
  - Retry mechanism for API failures

- ✅ Deployed to Supabase:
  - Function URL: `https://sqhqzrtmjspwqqhnjtss.supabase.co/functions/v1/sync-market-data`
  - Deployment successful (confirmed via CLI)
  - Test execution completed (0 stores synced due to filtering issues)

### 5. Documentation
- ✅ [docs/edge-function-sync-market-data.md](docs/edge-function-sync-market-data.md) (400+ lines)
  - How the Overpass query works
  - Revenue calculation examples
  - Deployment and testing instructions
  - Error handling and troubleshooting
  - Performance expectations
  - Future scheduling options

- ✅ Test scripts created:
  - [scripts/test-sync-market-data.mjs](scripts/test-sync-market-data.mjs) - Test Edge Function
  - [scripts/test-overpass-api.mjs](scripts/test-overpass-api.mjs) - Debug Overpass queries
  - [scripts/seed-competitor-data.mjs](scripts/seed-competitor-data.mjs) - Manual data seeding
  - [scripts/test-competitor-data.mjs](scripts/test-competitor-data.mjs) - Verify database contents

---

## 🟡 Current Blocker: Database Schema Mismatch

### Problem

The `competitors_market_data` table in the Supabase database has a different schema than expected:

**Expected Schema** (from migrations):
- `latitude` (NUMERIC)
- `longitude` (NUMERIC)

**Actual Schema** (in database):
- `lat` (NUMERIC)
- `lng` (NUMERIC)
- Plus extra columns: `address`, `state`, `product_categories`, `data_source`, etc.

### Root Cause

The table appears to have been created with an older or different schema before our migrations ran. This is likely from a previous attempt or manual table creation in the Supabase dashboard.

### Solution

Run the recreate migration to DROP and recreate the table with the correct schema:

**Migration File**: [supabase/migrations/20250120_recreate_competitors_table.sql](supabase/migrations/20250120_recreate_competitors_table.sql)

**Steps**:
1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/sqhqzrtmjspwqqhnjtss/sql/new
2. Copy the entire SQL from the migration file (displayed above in CLI output)
3. Execute the SQL
4. Verify table created successfully

---

## 📋 Next Steps

### Step 1: Fix Database Schema

```bash
# Display the SQL to run manually
node scripts/apply-recreate-table.mjs

# Copy the SQL output and run it in Supabase SQL Editor
# URL: https://supabase.com/dashboard/project/sqhqzrtmjspwqqhnjtss/sql/new
```

### Step 2: Seed Competitor Data

After the table is recreated:

```bash
node scripts/seed-competitor-data.mjs
```

This will insert 14 sample stores:
- 5× Home Depot (Miami, Spring Hill, Tampa)
- 5× Lowe's (Miami, Orlando, Tampa)
- 4× Floor & Decor (Doral, Fort Lauderdale, Orlando, Tampa)

### Step 3: Verify End-to-End

1. **Check Database**:
   ```bash
   node scripts/test-competitor-data.mjs
   ```

   Expected output:
   - Total stores: 14
   - Breakdown by brand shown
   - Sample stores listed

2. **Test Map**:
   - Navigate to: http://localhost:3000 (or deployment URL)
   - Go to: "Florida Sales by ZIP Code" dashboard
   - Toggle "Gaps" button (red destructive variant)
   - Should see red circles on map for ZIPs with competitors but no sales

3. **Test Gap Drawer**:
   - Click a red circle
   - Gap Drawer should open showing:
     - ZIP code in header
     - Missed Revenue metric (red accent)
     - Competitor Count metric (orange accent)
     - Table of competitor stores
     - Recommended actions

4. **Test AI Chat**:
   - Click sparkles icon in Gap Drawer header
   - Chat sheet should slide in from right
   - Try suggested questions:
     - "What's our biggest missed opportunity?"
     - "Why don't we have sales here?"
     - "What should we do about this gap?"
   - Responses should be contextual and seeded

### Step 4: Production Data (Optional)

If you want real data from OpenStreetMap:

```bash
# The Edge Function is already deployed
# Call it to sync real competitor data

node scripts/test-sync-market-data.mjs
```

**Note**: The Edge Function currently returns 0 stores due to filtering logic. This needs investigation:
- Check if ZIP codes are being extracted correctly
- Verify city names are present in OSM data
- May need to adjust normalization logic for store names

---

## 🔍 Troubleshooting

### Gap circles not showing on map

**Possible causes**:
1. No gap data in database → Seed data first
2. Gap data exists but for ZIPs with sales → Normal, not a bug
3. Toggle button not enabled → Click "Gaps" button

**Debug**:
```bash
node scripts/test-competitor-data.mjs
```

### Gap Drawer shows "No competitor data"

**Possible causes**:
1. Clicked ZIP with no competitor stores
2. RPC function not working correctly
3. Table empty

**Debug**:
- Check browser console for errors
- Verify RPC functions exist in Supabase dashboard
- Test RPC directly:
  ```sql
  SELECT * FROM get_zip_opportunity_details('33166');
  ```

### Edge Function returns 0 stores

**Known issue**: Overpass API returns data, but Edge Function filters it all out.

**Investigation needed**:
- Check store name normalization logic
- Verify ZIP code extraction from `addr:postcode`
- Confirm city field requirements

**Workaround**: Use manual seed script for POC

---

## 📊 Architecture Summary

### Data Flow

```
OpenStreetMap (OSM)
  ↓ (Overpass API query)
Edge Function (sync-market-data)
  ↓ (Upsert with deduplication)
Database Table (competitors_market_data)
  ↓ (RPC: get_zip_gap_analysis)
Frontend (florida-zip-sales-map.tsx)
  ↓ (User clicks red circle)
Gap Drawer (zip-gap-drawer.tsx)
  ↓ (RPC: get_zip_opportunity_details)
Competitor Details + AI Chat
```

### Key Files

| Layer | File | Purpose |
|-------|------|---------|
| Database | `supabase/migrations/20250120_recreate_competitors_table.sql` | Table schema |
| Database | `supabase/migrations/20250120_gap_analysis_rpcs_v2.sql` | RPC functions |
| Edge Function | `supabase/functions/sync-market-data/index.ts` | OSM sync |
| TypeScript | `lib/mbic-supabase.ts` | Type-safe RPC wrappers |
| Hook | `hooks/use-zip-gap-data.ts` | React state management |
| Component | `components/dashboard/zip-gap-drawer.tsx` | Gap details UI |
| Component | `components/dashboard/florida-zip-sales-map.tsx` | Map + visualization |
| Docs | `docs/edge-function-sync-market-data.md` | Complete guide |

---

## 🎯 Feature Highlights

### Visual Design

- **Green circles** = Earned revenue (existing feature)
- **Blue circles** = Dealer coverage (existing feature)
- **Red circles** = Missed opportunities (GAP ANALYSIS - new!)

### Revenue Estimates

- **Home Depot**: $45M base
- **Lowe's**: $35M base
- **Floor & Decor**: $20M base

**Tier Multipliers**:
- High-volume cities (Miami, Orlando, Tampa, etc.): **1.25×**
- Regular cities: **0.9×**

**Examples**:
- Home Depot in Miami: $45M × 1.25 = **$56.25M**
- Lowe's in Orlando: $35M × 1.25 = **$43.75M**
- Floor & Decor in Ocala: $20M × 0.9 = **$18M**

### AI Chat Features

- **Seeded Q&A**: Pre-defined intelligent responses for common questions
- **Context-aware**: Answers reference specific ZIP code and competitor data
- **Actionable insights**: Recommends next steps (assign sales rep, expand dealer, etc.)

---

## 🚀 Deployment Checklist

- [x] Database schema designed
- [x] RPC functions created
- [x] TypeScript types added
- [x] React hooks implemented
- [x] UI components built
- [x] Map integration complete
- [x] Edge Function created and deployed
- [x] Documentation written
- [ ] **DATABASE SCHEMA FIX NEEDED** ⚠️
- [ ] Seed data loaded
- [ ] End-to-end testing complete
- [ ] Production data sync (optional)

---

## 💡 Future Enhancements

1. **Automatic Scheduling**: Schedule Edge Function to run weekly/monthly
2. **Additional Competitors**: Expand beyond Home Depot/Lowe's/Floor & Decor
3. **Historical Tracking**: Store snapshots to track market changes over time
4. **Alert System**: Notify when new gaps appear in high-value ZIPs
5. **Advanced Filters**: Filter gaps by revenue threshold, city, store type
6. **Export Functionality**: Export gap analysis to CSV/Excel

---

**Status**: Ready for database fix and final testing
**Blocker**: Manual SQL execution required in Supabase dashboard
**Estimated Time to Complete**: 10-15 minutes after database fix
