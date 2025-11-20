# Edge Function: sync-market-data

**Purpose**: Fetches competitor store locations from OpenStreetMap and populates the `competitors_market_data` table with estimated revenue data.

**Status**: ✅ Ready to deploy
**Execution Time**: ~60-120 seconds
**Data Source**: OpenStreetMap Overpass API

---

## Overview

This Edge Function queries OpenStreetMap for big box hardware/flooring stores across Florida, applies revenue weighting logic, and syncs the data to Supabase.

### Target Brands
- **Home Depot**: $45M base revenue
- **Lowe's**: $35M base revenue
- **Floor & Decor**: $20M base revenue

### Tier Multipliers
- **High-volume cities** (Miami, Orlando, Tampa, etc.): **1.25×**
- **Other cities**: **0.9×**

---

## Files

1. **`supabase/functions/sync-market-data/index.ts`**
   - Main Edge Function code
   - Queries OpenStreetMap Overpass API
   - Applies revenue weighting logic
   - Upserts data to Supabase

2. **`supabase/functions/sync-market-data/deno.json`**
   - Deno configuration
   - Import map for Supabase client

3. **`scripts/deploy-sync-market-data.sh`**
   - Deployment helper script
   - Uses Supabase CLI

4. **`scripts/test-sync-market-data.mjs`**
   - Test script to invoke function
   - Displays results and timing

---

## How It Works

### 1. OpenStreetMap Query

The function uses the **Overpass API** to query OpenStreetMap for stores in Florida:

```overpass
[out:json][timeout:120];
area["name"="Florida"]["admin_level"="4"]->.florida;
(
  // Search by shop=hardware (Home Depot, Lowe's)
  node["shop"="hardware"](area.florida);
  way["shop"="hardware"](area.florida);

  // Search by shop=doityourself
  node["shop"="doityourself"](area.florida);
  way["shop"="doityourself"](area.florida);

  // Search by shop=flooring (Floor & Decor)
  node["shop"="flooring"](area.florida);
  way["shop"="flooring"](area.florida);

  // Search by name (backup strategy)
  node["name"~"Home Depot",i](area.florida);
  way["name"~"Home Depot",i](area.florida);
  node["name"~"Lowe",i](area.florida);
  way["name"~"Lowe",i](area.florida);
  node["name"~"Floor.*Decor",i](area.florida);
  way["name"~"Floor.*Decor",i](area.florida);
);
out center;
```

**Search Strategies**:
- `shop=hardware` - Standard OSM tag for hardware stores
- `shop=doityourself` - Alternative tag for DIY stores
- `shop=flooring` - Tag for flooring specialty stores
- Name matching with regex - Backup to catch missed stores

### 2. Data Extraction

For each OSM element, the function extracts:
- **Name**: Store brand (Home Depot, Lowe's, Floor & Decor)
- **Coordinates**: Latitude/longitude (uses center for ways)
- **ZIP Code**: From `addr:postcode` tag
- **City**: From `addr:city` or `addr:town` tag

### 3. Revenue Calculation

```typescript
const baseRevenue = STORE_REVENUE[storeName]; // e.g., $45M for Home Depot
const isHighVolume = isHighVolumeCity(city);  // Check against list
const tierMultiplier = isHighVolume ? 1.25 : 0.9;
const estRevenue = baseRevenue * tierMultiplier;
```

**Examples**:
- Home Depot in Miami: $45M × 1.25 = **$56.25M**
- Home Depot in Ocala: $45M × 0.9 = **$40.5M**
- Lowe's in Orlando: $35M × 1.25 = **$43.75M**
- Floor & Decor in Tampa: $20M × 1.25 = **$25M**

### 4. Deduplication

The function prevents duplicates by:
1. Creating a unique key: `${zipCode}-${storeName}-${lat}-${lng}`
2. Tracking seen stores in a Set
3. Using database `UNIQUE` constraint on `(zip_code, store_name)`

### 5. Database Upsert

```typescript
await supabase
  .from("competitors_market_data")
  .upsert(competitors, {
    onConflict: "zip_code,store_name",
    ignoreDuplicates: false, // Update existing records
  });
```

This ensures:
- New stores are inserted
- Existing stores are updated (if data changes)
- No duplicate violations

---

## Deployment

### Prerequisites

1. **Supabase CLI** installed:
   ```bash
   npm install -g supabase
   ```

2. **Logged in** to Supabase:
   ```bash
   supabase login
   ```

3. **Environment variables** set in Supabase dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Deploy the Function

**Option 1: Using the helper script**
```bash
chmod +x scripts/deploy-sync-market-data.sh
./scripts/deploy-sync-market-data.sh
```

**Option 2: Using Supabase CLI directly**
```bash
supabase functions deploy sync-market-data --project-ref sqhqzrtmjspwqqhnjtss
```

---

## Testing

### Test the Function

**Option 1: Using the test script**
```bash
node scripts/test-sync-market-data.mjs
```

**Option 2: Using curl**
```bash
curl -X POST https://sqhqzrtmjspwqqhnjtss.supabase.co/functions/v1/sync-market-data \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

**Expected Output**:
```json
{
  "success": true,
  "stores_synced": 150,
  "breakdown": {
    "Home Depot": 85,
    "Lowe's": 50,
    "Floor & Decor": 15
  },
  "timestamp": "2025-11-20T06:30:00.000Z",
  "message": "Synced 150 competitor stores from OpenStreetMap"
}
```

### Verify Data in Database

```sql
-- Check total count
SELECT COUNT(*) FROM competitors_market_data;

-- Check breakdown by brand
SELECT store_name, COUNT(*) as count
FROM competitors_market_data
GROUP BY store_name
ORDER BY count DESC;

-- Check high-volume vs regular cities
SELECT
  CASE WHEN tier_multiplier = 1.25 THEN 'High Volume' ELSE 'Regular' END as tier,
  COUNT(*) as count,
  AVG(est_annual_revenue) as avg_revenue
FROM competitors_market_data
GROUP BY tier_multiplier;

-- Sample data
SELECT * FROM competitors_market_data LIMIT 10;
```

---

## Error Handling

The function includes robust error handling:

### Retry Logic
- **Overpass API failures**: Retries up to 3 times with 2-second delay
- **Network timeouts**: 120-second query timeout

### Data Validation
- **Missing coordinates**: Skipped with log message
- **Invalid ZIP codes**: Skipped (must be 5 digits)
- **Missing city**: Skipped with log message
- **Non-target brands**: Filtered out

### Rate Limiting
- **100ms delay** every 50 stores processed
- Prevents overwhelming the database

### Logging
All actions logged to Supabase function logs:
```
[sync-market-data] Starting Florida competitor data sync
[sync-market-data] Querying OpenStreetMap Overpass API...
[sync-market-data] Found 250 potential stores from OSM
[sync-market-data] Processed 150 target brand stores
[sync-market-data] Breakdown by brand:
  - Home Depot: 85 stores
  - Lowe's: 50 stores
  - Floor & Decor: 15 stores
[sync-market-data] ✅ Successfully synced 150 stores to database
```

---

## Performance

### Expected Results (Florida)

Based on OpenStreetMap data coverage:
- **Home Depot**: ~80-100 stores
- **Lowe's**: ~50-70 stores
- **Floor & Decor**: ~10-20 stores
- **Total**: ~150-200 stores

### Execution Time
- **Overpass API query**: 30-60 seconds
- **Data processing**: 10-20 seconds
- **Database upsert**: 5-10 seconds
- **Total**: ~60-120 seconds

### Data Quality

**Known Limitations**:
1. **OSM Coverage**: Not all stores may be tagged correctly
2. **Address Data**: Some stores may lack ZIP/city tags
3. **Store Closures**: OSM may have outdated data

**Mitigation**:
- Multiple search strategies (shop tags + name matching)
- Manual verification recommended for critical analysis
- Scheduled updates (weekly/monthly) to keep data fresh

---

## Scheduling (Future Enhancement)

To run this function automatically:

### Option 1: Supabase Cron (pg_cron)
```sql
-- Run weekly on Sundays at 3 AM
SELECT cron.schedule(
  'sync-market-data-weekly',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://sqhqzrtmjspwqqhnjtss.supabase.co/functions/v1/sync-market-data',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
  );
  $$
);
```

### Option 2: External Cron (GitHub Actions, Vercel Cron, etc.)
```yaml
# .github/workflows/sync-market-data.yml
name: Sync Market Data
on:
  schedule:
    - cron: '0 3 * * 0' # Weekly on Sundays at 3 AM UTC
  workflow_dispatch: # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST https://sqhqzrtmjspwqqhnjtss.supabase.co/functions/v1/sync-market-data \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

---

## Troubleshooting

### Function times out
- **Cause**: Overpass API slow or unresponsive
- **Fix**: Retry the function, Overpass API performance varies

### No stores found
- **Cause**: OSM query too restrictive or Florida area not found
- **Fix**: Check Overpass API query syntax, test on overpass-turbo.eu

### Duplicate key violations
- **Cause**: UNIQUE constraint on (zip_code, store_name)
- **Fix**: This is expected behavior - function uses upsert to update existing stores

### Missing ZIP codes
- **Cause**: OSM data incomplete (addr:postcode not tagged)
- **Fix**: Expected for some stores, function logs skipped entries

---

## Next Steps

After successful sync:

1. **Verify Gap Data**:
   ```sql
   SELECT * FROM get_zip_gap_analysis('2025-01-01', '2025-12-31')
   LIMIT 10;
   ```

2. **Refresh Map**: Navigate to Florida Sales by ZIP Code

3. **Toggle Gaps**: Click "Gaps" button to show red circles

4. **Test Click Flow**: Click a red circle → Gap Drawer opens

5. **AI Chat**: Test AI assistant with gap-specific questions

---

**Last Updated**: 2025-11-20
**Status**: ✅ Ready for deployment
**Estimated Stores**: 150-200 across Florida
