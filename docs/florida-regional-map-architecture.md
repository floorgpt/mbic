# Florida Regional Sales Map - Architecture & Implementation

## Overview

The Florida Regional Sales Map is an interactive Leaflet-based visualization showing sales distribution across Florida's regions and ZIP codes. It provides two viewing modes: regional overview (North, Central, South Florida) and granular ZIP-level analysis.

## Component Architecture

### Main Component
**File**: `components/dashboard/florida-regional-sales-map.tsx`

The component follows a modular, single-responsibility pattern:

```
FloridaRegionalSalesMap
├── State Management (hooks)
├── Data Processing (pure functions)
├── Map Visualization (Leaflet)
├── Interactive Tooltips (hover)
└── Side Drawer (Sheet component)
    ├── Region Mode (county breakdown)
    └── ZIP Mode (dealer list) [pending]
```

### State Management

```typescript
// Core map state
const [geoData, setGeoData] = useState<GeoJSONData | null>(null);          // Region polygons
const [zipGeoData, setZipGeoData] = useState<GeoJSONData | null>(null);    // ZIP polygons
const [L, setL] = useState<typeof import("leaflet") | null>(null);         // Leaflet library

// UI state
const [sheetOpen, setSheetOpen] = useState(false);                         // Drawer visibility
const [selectedRegion, setSelectedRegion] = useState<RegionSummary | null>(null);
const [showRegions, setShowRegions] = useState(true);                      // Toggle regions
const [showCircles, setShowCircles] = useState(true);                      // Toggle ZIP circles

// Table controls
const [sortBy, setSortBy] = useState<"revenue" | "dealers" | "orders" | null>("revenue");
const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
const [visibleColumns, setVisibleColumns] = useState({...});               // Column visibility
```

### Data Flow

```
Input: CountySalesRow[] (from sales_by_county_fl RPC)
  │
  ├─> Regional Aggregation
  │     └─> Map<string, RegionSummary>
  │           └─> { region, revenue, dealer_count, order_count, counties[] }
  │
  └─> ZIP Aggregation
        └─> Map<string, ZipSummary>
              └─> { zip, city, county, region, revenue, dealer_count, order_count, lat, lng }
```

## Key Features

### 1. Accurate Geographic Placement

**Challenge**: ZIP circle placement was initially using `Math.random()`, causing incorrect locations (e.g., Everglades).

**Solution**:
- Load `florida-zips.geojson` containing actual ZIP polygon boundaries
- Calculate centroid from polygon coordinates using averaging algorithm
- Build lookup map for O(1) coordinate retrieval

```typescript
const calculateCentroid = (coordinates: number[][][]): [number, number] | null => {
  const points = coordinates[0]; // Get outer ring
  let sumLat = 0, sumLng = 0, count = 0;
  
  for (const point of points) {
    if (point && point.length >= 2) {
      sumLng += point[0]; // Longitude
      sumLat += point[1]; // Latitude
      count++;
    }
  }
  
  return count > 0 ? [sumLat / count, sumLng / count] : null;
};
```

### 2. Hover Tooltips with Visual CTA

**Implementation**:
- Used `Tooltip` component (not `Popup`) for hover-triggered display
- Styled with solid white background and border for readability
- Added eye icon CTA: "👁️ Click to view details"
- Dark mode support via CSS `.dark .regional-tooltip`

**CSS** (`app/globals.css`):
```css
.regional-tooltip {
  padding: 0 !important;
  background: white !important;
  border: 1px solid rgb(229 231 235) !important;
  border-radius: 0.5rem !important;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
}

.dark .regional-tooltip {
  background: rgb(39 39 42) !important;
  border-color: rgb(63 63 70) !important;
  color: rgb(250 250 250) !important;
}
```

### 3. Dynamic Drawer with Two Modes

**Region Mode** (Implemented):
- Click region polygon → opens drawer
- Shows county breakdown table with sorting and column visibility
- Narrative summary with top county analysis
- County aggregation sums all ZIPs within same county

**ZIP Mode** (In Progress):
- Click ZIP circle → opens drawer  
- Shows dealer list for that specific ZIP
- Displays dealer name, revenue, orders, sales rep
- Requires `dealers_by_zip_fl` RPC (migration pending)

### 4. Table Enhancements

- **Sorting**: Click column headers to sort by Revenue, Dealers, or Orders
- **Column Visibility**: Dropdown menu to show/hide City, ZIP, County columns
- **Responsive**: Drawer scrolls independently with sticky header

## Database Schema

### Current RPC: `sales_by_county_fl`

```sql
create function public.sales_by_county_fl(
  from_date date,
  to_date date
)
returns table (
  zip_code text,
  city text,
  county text,
  region text,
  revenue numeric,
  dealer_count int,
  order_count int
)
```

### Pending RPC: `dealers_by_zip_fl`

```sql
create function public.dealers_by_zip_fl(
  p_zip_code text,
  from_date date,
  to_date date
)
returns table (
  customer_id text,
  dealer_name text,
  dealer_city text,
  dealer_zip text,
  revenue numeric,
  order_count int,
  sales_rep text
)
```

**Status**: Migration file created at `supabase/migrations/20250119_add_dealers_by_zip_rpc.sql`  
**Action Required**: Apply migration via Supabase SQL Editor

## Type Definitions

**File**: `lib/mbic-supabase.ts`

```typescript
export type CountySalesRow = {
  zip_code: string;
  city: string;
  county: string;
  region: "South Florida" | "Central Florida" | "North Florida" | "Other Florida";
  revenue: number;
  dealer_count: number;
  order_count: number;
};

export type ZipDealerRow = {
  customer_id: string;
  dealer_name: string;
  dealer_city: string;
  dealer_zip: string;
  revenue: number;
  order_count: number;
  sales_rep: string;
};

// Helper functions
export async function getSalesByCountyFlSafe(from: DateISO, to: DateISO): Promise<SafeResult<CountySalesRow[]>>
export async function getDealersByZipFlSafe(zipCode: string, from: DateISO, to: DateISO): Promise<SafeResult<ZipDealerRow[]>>
```

## Performance Considerations

1. **GeoJSON Loading**: 678KB ZIP polygon file loaded once on mount
2. **Centroid Calculation**: Memoized via `useMemo` (when implemented)
3. **Conditional Rendering**: Toggle visibility without re-fetching data
4. **Dynamic Imports**: Leaflet components lazy-loaded for SSR compatibility

## Future Enhancements

### ZIP-Specific Drawer Implementation

**Remaining Tasks**:
1. Add drawer mode state: `type DrawerMode = "region" | "zip"`
2. Add selected ZIP state to store clicked ZIP data
3. Update circle click handler to set ZIP mode
4. Create modular dealer table component
5. Apply `dealers_by_zip_fl` migration

**Proposed Structure**:
```typescript
// Add to state
const [drawerMode, setDrawerMode] = useState<"region" | "zip">("region");
const [selectedZip, setSelectedZip] = useState<ZipSummary | null>(null);

// Update circle click handler
eventHandlers={{
  click: async () => {
    setDrawerMode("zip");
    setSelectedZip(zipData);
    setSheetOpen(true);
  }
}}

// Conditional drawer rendering
{drawerMode === "region" && <RegionDrawerContent />}
{drawerMode === "zip" && <ZipDrawerContent />}
```

## Maintenance

### Component Modularity

To maintain code quality, consider extracting:

1. **`useZipCentroids` hook**: Encapsulate GeoJSON loading and centroid calculation
2. **`RegionDrawerContent` component**: Extract region drawer UI
3. **`ZipDrawerContent` component**: New component for ZIP dealer list
4. **`MapLegend` component**: Extract legend UI
5. **`MapControls` component**: Extract toggle buttons

### Testing Checklist

- [ ] Verify ZIP circles appear in correct geographic locations
- [ ] Confirm hover tooltips show on all circles
- [ ] Test region polygon clicks open drawer with county data
- [ ] Validate county aggregation (no duplicate Miami-Dade entries)
- [ ] Check table sorting (asc/desc for all columns)
- [ ] Test column visibility toggles
- [ ] Verify drawer z-index stays above map
- [ ] Test dark mode tooltip styling
- [ ] Confirm responsive behavior on mobile

### Known Issues

1. **ZIP drawer mode incomplete**: Requires RPC migration + UI implementation
2. **Large GeoJSON file**: 678KB ZIP polygons (acceptable for broadband, consider CDN caching)
3. **Centroid accuracy**: Simple averaging may not be perfect for irregular shapes (acceptable trade-off vs. complex algorithms)

## References

- Leaflet Documentation: https://leafletjs.com/
- React Leaflet: https://react-leaflet.js.org/
- GeoJSON Spec: https://geojson.org/
- US Census TIGER/Line: https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html
