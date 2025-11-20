# Gap Analysis Feature - Execution Plan

**Date**: 2025-11-20
**Feature**: Florida Sales Gap Analysis (Red Circles + Competitor Intelligence)

---

## Executive Summary

**Goal**: Identify untapped market opportunities in Florida ZIP codes where competitors have presence but we have zero sales.

**Visual Pattern**:
- 🟢 **Green Circles** = We have sales (existing feature)
- 🔴 **Red Circles** = Gap opportunity (competitor presence, our sales = $0)

**User Experience**: Click red circle → Open drawer → See "Missed Opportunity" details with competitor data + AI chat assistant

---

## What We Have (Current State)

### ✅ Existing Infrastructure

1. **Map Component**: `components/dashboard/florida-zip-sales-map.tsx`
   - Leaflet-based Florida ZIP map
   - Green choropleth + blue circles showing our sales
   - Centroid calculation working perfectly
   - Toggle controls for polygons/circles
   - Drawer integration for dealer details

2. **AI Chat System** (Reusable POC)
   - `components/ui/chat-sheet.tsx` - Slide-up overlay chat
   - `components/ui/floating-nudge.tsx` - Contextual prompts
   - Seeded Q&A pattern for POC demonstrations
   - Glassmorphism design, smooth animations
   - Already proven in Regional Map drawer

3. **Database & RPC Patterns**
   - `sales_by_zip_fl` - Aggregate sales by ZIP
   - `dealers_by_zip_fl` - Detailed dealer list by ZIP
   - Supabase client utilities in `lib/mbic-supabase.ts`
   - SafeResult pattern for error handling

4. **Supabase Edge Functions**
   - Example: `supabase/functions/fetch-cpf-launchpad-marketing-data`
   - Pattern established for external API integration

### ❌ What's Missing

1. **Database Table**: `competitors_market_data`
2. **RPCs**: `get_zip_opportunity_details`, `get_zip_gap_analysis`
3. **Edge Function**: `sync-market-data` (OpenStreetMap integration)
4. **Red Circle Visualization**: Gap detection logic + rendering
5. **Gap Drawer Component**: Competitor table with red accent theme
6. **TypeScript Types**: Competitor data types + hooks

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Data Ingestion Layer                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Supabase Edge Function: sync-market-data                 │  │
│  │ • Fetch from OpenStreetMap Overpass API                  │  │
│  │ • Filter: shop=flooring OR hardware                      │  │
│  │ • Target: Home Depot, Lowe's, Floor & Decor              │  │
│  │ • Apply revenue weighting + tier multipliers             │  │
│  │ • Upsert to competitors_market_data table                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Database Layer                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Table: competitors_market_data                           │  │
│  │ • id (uuid, PK)                                          │  │
│  │ • zip_code (text, indexed)                               │  │
│  │ • store_name (text)                                      │  │
│  │ • store_type (text: 'Big Box' | 'Specialized')           │  │
│  │ • latitude (numeric)                                     │  │
│  │ • longitude (numeric)                                    │  │
│  │ • city (text)                                            │  │
│  │ • est_annual_revenue (numeric)                           │  │
│  │ • tier_multiplier (numeric)                              │  │
│  │ • created_at, updated_at                                 │  │
│  │                                                          │  │
│  │ Unique Index: (zip_code, store_name)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ RPC: get_zip_gap_analysis()                              │  │
│  │ Returns: ZIP codes with gap opportunities                │  │
│  │ Logic: WHERE our_sales = 0 AND competitor_count > 0      │  │
│  │ Fields: zip, total_est_revenue, competitor_count         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ RPC: get_zip_opportunity_details(zip_code)               │  │
│  │ Returns: Detailed competitor list for specific ZIP       │  │
│  │ Fields: store_name, type, city, est_revenue              │  │
│  │ Order: est_annual_revenue DESC                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Visualization Layer                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Component: florida-zip-sales-map.tsx                     │  │
│  │                                                          │  │
│  │ Map Layers:                                              │  │
│  │ 1. Green Choropleth (ZIP polygons with our sales)        │  │
│  │ 2. Blue Circles (ZIPs where we have sales)               │  │
│  │ 3. Red Circles (Gap ZIPs) ← NEW                          │  │
│  │                                                          │  │
│  │ Red Circle Logic:                                        │  │
│  │ • Fetch gap data: getZipGapAnalysisSafe()                │  │
│  │ • Render at ZIP centroid                                 │  │
│  │ • Radius scaled by total_est_revenue                     │  │
│  │ • Color: #ef4444 (red-500)                               │  │
│  │ • Click → handleGapClick(zipCode)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Component: ZipGapDrawer ← NEW                            │  │
│  │                                                          │  │
│  │ Structure:                                               │  │
│  │ • Sheet (from shadcn/ui)                                 │  │
│  │ • SheetHeader with AI button (reuse pattern)             │  │
│  │ • Key Stat: Total Market Opportunity (RED text)          │  │
│  │ • Table: Competitor details                              │  │
│  │ • ChatSheet: AI assistant overlay                        │  │
│  │ • FloatingNudge: Contextual prompts                      │  │
│  │                                                          │  │
│  │ Theme:                                                   │  │
│  │ • Red accents (#ef4444) for missed revenue               │  │
│  │ • Badge colors: 'Big Box' → red, 'Specialized' → orange  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Specifications

### 1. Database Schema

**File**: `supabase/migrations/20250120_create_competitors_market_data.sql`

```sql
-- Create competitors market data table
CREATE TABLE IF NOT EXISTS public.competitors_market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zip_code TEXT NOT NULL,
  store_name TEXT NOT NULL,
  store_type TEXT NOT NULL CHECK (store_type IN ('Big Box', 'Specialized')),
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  city TEXT NOT NULL,
  est_annual_revenue NUMERIC NOT NULL DEFAULT 0,
  tier_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate stores in same ZIP
  CONSTRAINT unique_zip_store UNIQUE (zip_code, store_name)
);

-- Index for fast ZIP lookups
CREATE INDEX idx_competitors_zip ON public.competitors_market_data(zip_code);
CREATE INDEX idx_competitors_revenue ON public.competitors_market_data(est_annual_revenue DESC);

-- RLS Policies (read-only for authenticated users)
ALTER TABLE public.competitors_market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access"
  ON public.competitors_market_data
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Grant permissions
GRANT SELECT ON public.competitors_market_data TO anon, authenticated, service_role;
GRANT ALL ON public.competitors_market_data TO service_role;

COMMENT ON TABLE public.competitors_market_data IS
  'Stores competitor market data for gap analysis. Updated via sync-market-data Edge Function.';
```

### 2. RPC Functions

**File**: `supabase/migrations/20250120_gap_analysis_rpcs.sql`

```sql
-- RPC 1: Get aggregate gap analysis (for red circles on map)
CREATE OR REPLACE FUNCTION public.get_zip_gap_analysis(
  from_date DATE,
  to_date DATE
)
RETURNS TABLE (
  zip_code TEXT,
  total_est_revenue NUMERIC,
  competitor_count INT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  WITH our_sales AS (
    -- Get ZIPs where we have sales
    SELECT DISTINCT
      LPAD(SUBSTRING(REGEXP_REPLACE(c.dealer_billing_address_postal_code, '\D', '', 'g') FROM 1 FOR 5), 5, '0') AS zip_code
    FROM public.sales_demo s
    INNER JOIN public.customers_demo c ON c.customer_id = s.customer_id
    WHERE s.invoice_date >= from_date
      AND s.invoice_date < to_date
      AND c.dealer_billing_address_state = 'FL'
      AND c.dealer_billing_address_postal_code IS NOT NULL
  )
  SELECT
    cmd.zip_code,
    SUM(cmd.est_annual_revenue)::NUMERIC AS total_est_revenue,
    COUNT(*)::INT AS competitor_count
  FROM public.competitors_market_data cmd
  WHERE cmd.zip_code NOT IN (SELECT zip_code FROM our_sales)
    AND cmd.zip_code IS NOT NULL
  GROUP BY cmd.zip_code
  ORDER BY total_est_revenue DESC;
$$;

-- RPC 2: Get detailed competitor data for specific ZIP (for drawer)
CREATE OR REPLACE FUNCTION public.get_zip_opportunity_details(
  p_zip_code TEXT
)
RETURNS TABLE (
  store_name TEXT,
  store_type TEXT,
  city TEXT,
  est_annual_revenue NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT
    cmd.store_name,
    cmd.store_type,
    cmd.city,
    cmd.est_annual_revenue,
    cmd.latitude,
    cmd.longitude
  FROM public.competitors_market_data cmd
  WHERE cmd.zip_code = p_zip_code
  ORDER BY cmd.est_annual_revenue DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_zip_gap_analysis(DATE, DATE)
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_zip_opportunity_details(TEXT)
  TO anon, authenticated, service_role;

-- Add comments
COMMENT ON FUNCTION public.get_zip_gap_analysis(DATE, DATE) IS
  'Returns ZIP codes with gap opportunities (competitors present, our sales = $0). Used for red circle visualization.';

COMMENT ON FUNCTION public.get_zip_opportunity_details(TEXT) IS
  'Returns detailed competitor data for a specific ZIP code. Used in Gap Drawer.';
```

### 3. Supabase Edge Function

**File**: `supabase/functions/sync-market-data/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Overpass API endpoint
const OVERPASS_API = "https://overpass-api.de/api/interpreter";

// Revenue weighting by store
const STORE_REVENUE: Record<string, number> = {
  "Home Depot": 45_000_000,
  "Lowe's": 35_000_000,
  "Floor & Decor": 20_000_000,
};

// High volume cities for tier multiplier
const HIGH_VOLUME_CITIES = [
  "Miami",
  "Doral",
  "Fort Lauderdale",
  "Orlando",
  "Tampa",
  "West Palm Beach",
  "Boca Raton"
];

type CompetitorStore = {
  zip_code: string;
  store_name: string;
  store_type: string;
  latitude: number;
  longitude: number;
  city: string;
  est_annual_revenue: number;
  tier_multiplier: number;
};

serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[sync-market-data] Starting Florida competitor data sync");

    // Overpass QL query for Florida flooring/hardware stores
    const overpassQuery = `
      [out:json][timeout:60];
      area["name"="Florida"]["admin_level"="4"]->.florida;
      (
        node["shop"~"flooring|hardware"](area.florida);
        way["shop"~"flooring|hardware"](area.florida);
      );
      out center;
    `;

    // Fetch from Overpass API
    console.log("[sync-market-data] Querying OpenStreetMap Overpass API...");
    const response = await fetch(OVERPASS_API, {
      method: "POST",
      body: new URLSearchParams({ data: overpassQuery }),
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[sync-market-data] Found ${data.elements?.length || 0} stores`);

    const competitors: CompetitorStore[] = [];

    // Process each store
    for (const element of data.elements || []) {
      const tags = element.tags || {};
      const name = tags.name || "";

      // Filter for big box stores
      const storeName = Object.keys(STORE_REVENUE).find((key) =>
        name.toLowerCase().includes(key.toLowerCase())
      );

      if (!storeName) continue;

      // Get coordinates (use center for ways)
      const lat = element.lat || element.center?.lat;
      const lon = element.lon || element.center?.lon;
      if (!lat || !lon) continue;

      // Get ZIP code
      const zipCode = tags["addr:postcode"]?.replace(/\D/g, "").slice(0, 5);
      if (!zipCode || zipCode.length !== 5) continue;

      // Get city
      const city = tags["addr:city"] || "";
      if (!city) continue;

      // Calculate revenue with tier multiplier
      const baseRevenue = STORE_REVENUE[storeName];
      const isHighVolume = HIGH_VOLUME_CITIES.some((hvc) =>
        city.toLowerCase().includes(hvc.toLowerCase())
      );
      const tierMultiplier = isHighVolume ? 1.25 : 0.9;
      const estRevenue = baseRevenue * tierMultiplier;

      competitors.push({
        zip_code: zipCode,
        store_name: storeName,
        store_type: "Big Box",
        latitude: lat,
        longitude: lon,
        city,
        est_annual_revenue: estRevenue,
        tier_multiplier: tierMultiplier,
      });

      // Rate limit: small delay between batches
      if (competitors.length % 50 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`[sync-market-data] Processed ${competitors.length} big box stores`);

    // Upsert to database
    if (competitors.length > 0) {
      const { error } = await supabase
        .from("competitors_market_data")
        .upsert(competitors, {
          onConflict: "zip_code,store_name",
          ignoreDuplicates: false,
        });

      if (error) {
        throw new Error(`Database upsert error: ${error.message}`);
      }

      console.log(`[sync-market-data] Successfully synced ${competitors.length} stores`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        stores_synced: competitors.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[sync-market-data] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
```

**File**: `supabase/functions/sync-market-data/deno.json`

```json
{
  "imports": {
    "supabase": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

### 4. TypeScript Types & Utilities

**File**: `lib/mbic-supabase.ts` (add to existing file)

```typescript
// Gap Analysis Types
export type ZipGapRow = {
  zip_code: string;
  total_est_revenue: number;
  competitor_count: number;
};

export type CompetitorRow = {
  store_name: string;
  store_type: string;
  city: string;
  est_annual_revenue: number;
  latitude: number;
  longitude: number;
};

// RPC Functions
export async function getZipGapAnalysisSafe(
  from: DateISO,
  to: DateISO,
): Promise<SafeResult<ZipGapRow[]>> {
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string>>>("get_zip_gap_analysis", {
      from_date: from,
      to_date: to,
    }),
    "get_zip_gap_analysis",
    [],
  );

  const mapped = (safe.data ?? []).map((row) => ({
    zip_code: typeof row.zip_code === "string" ? row.zip_code : "",
    total_est_revenue: asNumber(row.total_est_revenue, 0),
    competitor_count: asNumber(row.competitor_count, 0),
  }));

  return {
    data: mapped,
    _meta: { ...safe._meta, count: mapped.length },
  };
}

export async function getZipOpportunityDetailsSafe(
  zipCode: string,
): Promise<SafeResult<CompetitorRow[]>> {
  const safe = await tryServerSafe(
    callRpc<Array<Record<string, NumericLike | string>>>("get_zip_opportunity_details", {
      p_zip_code: zipCode,
    }),
    "get_zip_opportunity_details",
    [],
  );

  const mapped = (safe.data ?? []).map((row) => ({
    store_name: typeof row.store_name === "string" ? row.store_name : "Unknown",
    store_type: typeof row.store_type === "string" ? row.store_type : "Big Box",
    city: typeof row.city === "string" ? row.city : "Unknown",
    est_annual_revenue: asNumber(row.est_annual_revenue, 0),
    latitude: asNumber(row.latitude, 0),
    longitude: asNumber(row.longitude, 0),
  }));

  return {
    data: mapped,
    _meta: { ...safe._meta, count: mapped.length },
  };
}
```

### 5. Custom Hook

**File**: `hooks/use-zip-gap-data.ts` (new file)

```typescript
"use client";

import { useState, useEffect } from "react";
import { getZipOpportunityDetailsSafe } from "@/lib/mbic-supabase";
import type { CompetitorRow } from "@/lib/mbic-supabase";

export function useZipGapData(zipCode: string | null) {
  const [data, setData] = useState<CompetitorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!zipCode) {
      setData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getZipOpportunityDetailsSafe(zipCode);

        if (result._meta.error) {
          setError(result._meta.error);
          setData([]);
        } else {
          setData(result.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch gap data");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [zipCode]);

  const totalRevenue = data.reduce((sum, row) => sum + row.est_annual_revenue, 0);
  const competitorCount = data.length;

  return {
    data,
    loading,
    error,
    totalRevenue,
    competitorCount,
  };
}
```

### 6. Gap Drawer Component

**File**: `components/dashboard/zip-gap-drawer.tsx` (new file)

See detailed component code in implementation phase.

**Key Features**:
- Red accent theme (#ef4444)
- AI chat integration (ChatSheet + FloatingNudge)
- Competitor table with sorting
- Total market opportunity header
- Badge colors: Big Box (red), Specialized (orange)
- Seeded Q&A for gap analysis context

---

## Implementation Phases

### Phase 1: Database Layer (30 min)
1. Create `competitors_market_data` table migration
2. Create `get_zip_gap_analysis` RPC
3. Create `get_zip_opportunity_details` RPC
4. Run migrations, verify in Supabase dashboard

### Phase 2: Data Ingestion (45 min)
1. Create Edge Function `sync-market-data`
2. Deploy to Supabase
3. Test with manual trigger
4. Verify data in `competitors_market_data` table

### Phase 3: TypeScript Layer (20 min)
1. Add types to `lib/mbic-supabase.ts`
2. Add RPC helper functions
3. Create `useZipGapData` hook
4. Test type safety

### Phase 4: Map Visualization (40 min)
1. Fetch gap data in `florida-zip-sales-map.tsx`
2. Render red CircleMarkers for gap ZIPs
3. Add click handler `handleGapClick`
4. Scale radius by `total_est_revenue`
5. Add tooltips with gap info

### Phase 5: Gap Drawer (60 min)
1. Create `ZipGapDrawer` component
2. Integrate AI chat (ChatSheet + FloatingNudge)
3. Build competitor table with red theme
4. Add seeded Q&A for gap analysis
5. Handle loading/error states

### Phase 6: Integration & Testing (30 min)
1. Wire Gap Drawer into map component
2. Test click flow: Red circle → Drawer opens → Data loads
3. Test AI chat with gap-specific questions
4. Verify red accent theme consistency
5. Test error handling

**Total Estimated Time**: ~3.5 hours

---

## Design Specifications

### Color System

**Sales (Green)**:
- Primary: `#22c55e` (green-500)
- Usage: Revenue we earned, dealer counts, positive metrics

**Gap (Red)**:
- Primary: `#ef4444` (red-500)
- Usage: Missed revenue, competitor presence, alert states

**Badges**:
- Big Box: `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`
- Specialized: `bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400`

### Red Circle Specifications

```typescript
{
  fillColor: "#ef4444",     // red-500
  fillOpacity: 0.6,
  color: "#b91c1c",         // red-700 border
  weight: 2,
  radius: getGapCircleRadius(total_est_revenue)
}

// Hover state
{
  fillOpacity: 0.8,
  weight: 3
}
```

### Gap Drawer Header

```tsx
<div className="flex items-center gap-2">
  <TrendingDown className="h-5 w-5 text-red-500" />
  <span className="text-2xl font-bold text-red-600 dark:text-red-400">
    {fmtUSD0(totalRevenue)}
  </span>
  <span className="text-sm text-muted-foreground">Est. Market Opportunity</span>
</div>
```

### AI Chat - Seeded Q&A for Gap Analysis

```typescript
const gapSeededQuestions = [
  {
    question: "What's our biggest missed opportunity?",
    answer: `The biggest gap is in ZIP ${topZip} with ${fmtUSD0(topRevenue)} in estimated competitor revenue. There are ${topCount} big box stores in that area including ${topStores}.`
  },
  {
    question: "Why don't we have sales here?",
    answer: "This ZIP has significant competitor presence but zero sales from our dealers. This could indicate: (1) No dealer coverage, (2) Underperforming dealers, or (3) Strong competitor dominance. Consider targeted dealer outreach or sales rep assignment."
  },
  {
    question: "Which competitors are strongest?",
    answer: `In this ZIP, the top competitors are: ${competitors.slice(0,3).map(c => `${c.store_name} (~${fmtUSD0(c.est_annual_revenue)})`).join(", ")}. These are all big box stores with established flooring departments.`
  }
];
```

---

## Error Handling Strategy

### Database Layer
- Graceful RLS policy failures (fallback to empty array)
- Null ZIP code handling (filter in RPC)
- Duplicate prevention (UNIQUE constraint on zip_code + store_name)

### Edge Function
- Overpass API timeout (60s limit)
- Rate limiting (100ms delay per 50 stores)
- Network failures (retry with exponential backoff)
- Malformed data (validate before upsert)

### Frontend Layer
- SafeResult pattern for all RPC calls
- Loading states in drawer
- Empty state: "No competitor data available"
- Error toast notifications
- Fallback UI for missing data

---

## Performance Considerations

### Database
- Indexed ZIP lookups (`idx_competitors_zip`)
- Indexed revenue sorting (`idx_competitors_revenue`)
- RPC functions use `STABLE` (cacheable)

### Map Rendering
- Red circles only rendered for gap ZIPs (subset of total)
- Centroid calculation reused from existing logic
- Toggle controls to hide/show layers independently

### Data Fetching
- Gap data fetched once on map mount
- Drawer data fetched on-demand (per ZIP click)
- `useZipGapData` hook with built-in caching

---

## Testing Checklist

- [ ] Database migrations apply cleanly
- [ ] RPCs return expected data structure
- [ ] Edge Function syncs data from OpenStreetMap
- [ ] Red circles render at correct centroids
- [ ] Circle radius scales properly by revenue
- [ ] Click red circle → Drawer opens
- [ ] Drawer shows competitor data sorted by revenue
- [ ] Total market opportunity displays in red
- [ ] AI chat responds to gap-specific questions
- [ ] Badges show correct colors (Big Box = red)
- [ ] Loading states work correctly
- [ ] Error states display helpful messages
- [ ] Toggle controls hide/show red circles
- [ ] Tooltips show gap info on hover
- [ ] Component is responsive on mobile

---

## Future Enhancements (Post-MVP)

1. **Real-time Data Sync**: Scheduled Edge Function (weekly updates)
2. **Advanced Filters**: Filter by store type, revenue threshold
3. **Heatmap Overlay**: Visual density of competitor presence
4. **Export Gap Report**: Download CSV of all gap opportunities
5. **Sales Rep Assignment**: One-click assign rep to gap ZIP
6. **Historical Tracking**: Track gap closure over time
7. **AI Recommendations**: GPT-4 powered expansion strategy
8. **Multi-State Support**: Expand beyond Florida

---

## Success Metrics

**User Engagement**:
- % of users clicking red circles
- Time spent in Gap Drawer
- AI chat interaction rate

**Business Impact**:
- Gap ZIPs converted to sales within 30/60/90 days
- New dealer acquisitions in gap areas
- Revenue growth in previously untapped ZIPs

**Technical Performance**:
- Page load time < 2s
- Drawer open time < 500ms
- Edge Function sync time < 60s
- RPC query time < 200ms

---

**Status**: Ready for Implementation
**Next Step**: Begin Phase 1 - Database Layer
