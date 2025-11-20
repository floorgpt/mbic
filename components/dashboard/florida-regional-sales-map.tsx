"use client";

import { useEffect, useState } from "react";
import type { CountySalesRow, ZipDealerRow } from "@/lib/mbic-supabase";
import { getDealersByZipFlSafe } from "@/lib/mbic-supabase";
import { fmtUSD0 } from "@/lib/format";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Circle, ArrowUpDown, ArrowUp, ArrowDown, Eye, ArrowLeft, Filter, ChevronLeft, ChevronRight, Search, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Checkbox } from "@/components/ui/checkbox";
import { ChatSheet } from "@/components/ui/chat-sheet";
import { FloatingNudge } from "@/components/ui/floating-nudge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((mod) => mod.Tooltip),
  { ssr: false }
);

type RegionalSalesMapProps = {
  data: CountySalesRow[];
  fromDate: string;
  toDate: string;
};

type GeoJSONData = FeatureCollection<Geometry, Record<string, unknown>>;

type RegionSummary = {
  region: "South Florida" | "Central Florida" | "North Florida";
  revenue: number;
  dealer_count: number;
  order_count: number;
  counties: CountySalesRow[];
};

type ZipSummary = {
  zip: string;
  city: string;
  county: string;
  region: string;
  revenue: number;
  dealer_count: number;
  order_count: number;
  lat: number;
  lng: number;
};

type DrawerMode = "region" | "zip";

export function FloridaRegionalSalesMap({ data, fromDate, toDate }: RegionalSalesMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [geoData, setGeoData] = useState<GeoJSONData | null>(null);
  const [zipGeoData, setZipGeoData] = useState<GeoJSONData | null>(null);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("region");
  const [selectedRegion, setSelectedRegion] = useState<RegionSummary | null>(null);
  const [selectedZip, setSelectedZip] = useState<ZipSummary | null>(null);
  const [zipDealers, setZipDealers] = useState<ZipDealerRow[]>([]);
  const [loadingZipData, setLoadingZipData] = useState(false);
  const [showRegions, setShowRegions] = useState(true);
  const [showCircles, setShowCircles] = useState(true);
  const [sortBy, setSortBy] = useState<"revenue" | "dealers" | "orders" | null>("revenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [visibleColumns, setVisibleColumns] = useState({
    city: true,
    zip: true,
    county: true,
    revenue: true,
    dealers: true,
    orders: true,
  });
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [countyFilter, setCountyFilter] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>(undefined);

  useEffect(() => {
    setIsMounted(true);

    // Load Leaflet CSS and library
    import("leaflet/dist/leaflet.css");
    import("leaflet").then((leaflet) => {
      setL(leaflet);
    });

    // Load GeoJSON for regions
    fetch("/geo/florida-regions.geojson")
      .then((res) => res.json())
      .then((geojson: GeoJSONData) => {
        console.log("[FloridaRegionalSalesMap] Region GeoJSON loaded:", {
          featureCount: geojson.features.length,
        });
        setGeoData(geojson);
      })
      .catch((err) => {
        console.error("[FloridaRegionalSalesMap] Failed to load region GeoJSON:", err);
      });

    // Load GeoJSON for ZIP codes
    fetch("/geo/florida-zips.geojson")
      .then((res) => res.json())
      .then((geojson: GeoJSONData) => {
        console.log("[FloridaRegionalSalesMap] ZIP GeoJSON loaded:", {
          featureCount: geojson.features.length,
        });
        setZipGeoData(geojson);
      })
      .catch((err) => {
        console.error("[FloridaRegionalSalesMap] Failed to load ZIP GeoJSON:", err);
      });
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [cityFilter, countyFilter]);

  // Debug: Log sheet state changes
  useEffect(() => {
    console.log("[FloridaRegionalSalesMap] Sheet state changed:", {
      sheetOpen,
      drawerMode,
      hasSelectedRegion: !!selectedRegion,
      hasSelectedZip: !!selectedZip,
    });
  }, [sheetOpen, drawerMode, selectedRegion, selectedZip]);

  // Calculate centroid from polygon coordinates
  const calculateCentroid = (coordinates: number[][][]): [number, number] | null => {
    try {
      if (!coordinates || !coordinates[0] || coordinates[0].length === 0) {
        return null;
      }

      const points = coordinates[0]; // Get outer ring
      let sumLat = 0;
      let sumLng = 0;
      let count = 0;

      for (const point of points) {
        if (point && point.length >= 2) {
          sumLng += point[0]; // Longitude
          sumLat += point[1]; // Latitude
          count++;
        }
      }

      if (count === 0) return null;

      return [sumLat / count, sumLng / count]; // [lat, lng]
    } catch (error) {
      console.error("[calculateCentroid] Error:", error);
      return null;
    }
  };

  // Build ZIP code to centroid mapping
  const zipCentroids = new Map<string, [number, number]>();
  if (zipGeoData) {
    zipGeoData.features.forEach((feature) => {
      const zipCodeFromId = feature.id?.toString();
      const zipCodeFromProps = typeof feature.properties?.ZCTA5CE10 === "string"
        ? feature.properties.ZCTA5CE10
        : undefined;
      const zipCode = zipCodeFromId || zipCodeFromProps;

      if (zipCode && typeof zipCode === "string" && feature.geometry && feature.geometry.type === "Polygon") {
        const centroid = calculateCentroid(feature.geometry.coordinates as number[][][]);
        if (centroid) {
          zipCentroids.set(zipCode, centroid);
        }
      }
    });
    console.log("[FloridaRegionalSalesMap] Calculated centroids for", zipCentroids.size, "ZIP codes");
  }

  // Prevent SSR hydration mismatch
  if (!isMounted || !geoData || !L) {
    return (
      <div className="h-full animate-pulse rounded-lg bg-muted/40">
        <div className="flex h-full items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary" />
            Loading map...
          </div>
        </div>
      </div>
    );
  }

  // Aggregate data by region
  const regionSummaries = new Map<string, RegionSummary>();

  // Initialize regions
  const regions: Array<"South Florida" | "Central Florida" | "North Florida"> = [
    "South Florida",
    "Central Florida",
    "North Florida",
  ];

  regions.forEach((region) => {
    regionSummaries.set(region, {
      region,
      revenue: 0,
      dealer_count: 0,
      order_count: 0,
      counties: [],
    });
  });

  // Aggregate county data by region
  data.forEach((countyRow) => {
    if (countyRow.region !== "Other Florida") {
      const summary = regionSummaries.get(countyRow.region);
      if (summary) {
        summary.revenue += countyRow.revenue;
        summary.dealer_count += countyRow.dealer_count;
        summary.order_count += countyRow.order_count;
        summary.counties.push(countyRow);
      }
    }
  });

  // Calculate min/max for color scale (regions)
  const revenues = Array.from(regionSummaries.values()).map((r) => r.revenue);
  const maxRevenue = Math.max(...revenues, 1);
  const minRevenue = Math.min(...revenues.filter((r) => r > 0), 0);

  // Aggregate data by ZIP code for circle markers
  const zipSummaries = new Map<string, { zip: string; city: string; county: string; region: string; revenue: number; dealer_count: number; order_count: number; lat: number; lng: number }>();

  data.forEach((row) => {
    if (row.region !== "Other Florida" && row.zip_code) {
      const existing = zipSummaries.get(row.zip_code);
      if (existing) {
        existing.revenue += row.revenue;
        existing.dealer_count += row.dealer_count;
        existing.order_count += row.order_count;
      } else {
        // Get accurate coordinates from ZIP centroid
        const centroid = zipCentroids.get(row.zip_code);

        if (centroid) {
          zipSummaries.set(row.zip_code, {
            zip: row.zip_code,
            city: row.city,
            county: row.county,
            region: row.region,
            revenue: row.revenue,
            dealer_count: row.dealer_count,
            order_count: row.order_count,
            lat: centroid[0],
            lng: centroid[1],
          });
        } else {
          console.warn(`[FloridaRegionalSalesMap] No centroid found for ZIP ${row.zip_code}`);
        }
      }
    }
  });

  // Calculate circle size based on revenue
  const zipRevenues = Array.from(zipSummaries.values()).map((z) => z.revenue);
  const maxZipRevenue = Math.max(...zipRevenues, 1);
  const minZipRevenue = Math.min(...zipRevenues, 0);

  const getCircleRadius = (revenue: number): number => {
    const ratio = (revenue - minZipRevenue) / (maxZipRevenue - minZipRevenue);
    return 5 + ratio * 15; // 5-20 pixel radius
  };

  // Color scale function (green gradient)
  const getColor = (revenue: number): string => {
    if (revenue === 0) return "#e5e7eb"; // grey for no data

    const ratio = (revenue - minRevenue) / (maxRevenue - minRevenue);

    // Green gradient from light to dark
    if (ratio > 0.75) return "#15803d"; // green-800
    if (ratio > 0.5) return "#16a34a"; // green-700
    if (ratio > 0.25) return "#22c55e"; // green-600
    return "#4ade80"; // green-500
  };

  // Style function for each region
  const style = (feature?: Feature<Geometry>) => {
    if (!feature || !feature.properties) {
      return {
        fillColor: "#e5e7eb",
        weight: 2,
        opacity: 1,
        color: "#ffffff",
        fillOpacity: 0.7,
      };
    }

    const regionName = feature.properties.region as string;
    const summary = regionSummaries.get(regionName);
    const revenue = summary?.revenue ?? 0;

    return {
      fillColor: getColor(revenue),
      weight: 2,
      opacity: 1,
      color: "#ffffff",
      fillOpacity: 0.7,
    };
  };

  // Interaction handlers
  const onEachFeature = (feature: Feature<Geometry>, layer: L.Layer) => {
    const regionName = feature.properties?.region as string;
    const summary = regionSummaries.get(regionName);

    if (summary) {
      // Tooltip on hover
      const popupContent = L.DomUtil.create("div");
      popupContent.style.fontFamily = "sans-serif";
      popupContent.innerHTML = `
        <div style="padding: 4px;">
          <p style="font-weight: 600; margin: 0 0 8px 0; font-size: 14px;">${summary.region}</p>
          <div style="space-y: 4px;">
            <p style="margin: 4px 0; font-size: 12px;"><span style="color: #6b7280;">Revenue:</span> <strong>${fmtUSD0(summary.revenue)}</strong></p>
            <p style="margin: 4px 0; font-size: 12px;"><span style="color: #6b7280;">Dealers:</span> ${summary.dealer_count}</p>
            <p style="margin: 4px 0; font-size: 12px;"><span style="color: #6b7280;">Orders:</span> ${summary.order_count}</p>
          </div>
          <p style="margin-top: 8px; font-size: 11px; color: #6b7280; font-style: italic;">Click to view counties</p>
        </div>
      `;

      layer.bindTooltip(popupContent, {
        sticky: true,
        className: "regional-tooltip",
      });

      // Click to open sheet with county breakdown
      layer.on("click", () => {
        console.log("[FloridaRegionalSalesMap] Region clicked:", summary.region);
        setSelectedRegion(summary);
        setDrawerMode("region");
        setSheetOpen(true);
      });

      // Hover effects
      layer.on("mouseover", function (this: L.Path) {
        this.setStyle({
          weight: 3,
          fillOpacity: 0.9,
        });
      });

      layer.on("mouseout", function (this: L.Path) {
        this.setStyle({
          weight: 2,
          fillOpacity: 0.7,
        });
      });
    }
  };

  // Florida center coordinates
  const floridaCenter: [number, number] = [27.9944024, -81.7602544];

  // Aggregate counties (sum up multiple ZIP codes in same county)
  const aggregatedCounties = selectedRegion
    ? Array.from(
        selectedRegion.counties.reduce((acc, row) => {
          const existing = acc.get(row.county);
          if (existing) {
            existing.revenue += row.revenue;
            existing.dealer_count += row.dealer_count;
            existing.order_count += row.order_count;
          } else {
            acc.set(row.county, {
              county: row.county,
              revenue: row.revenue,
              dealer_count: row.dealer_count,
              order_count: row.order_count,
            });
          }
          return acc;
        }, new Map<string, { county: string; revenue: number; dealer_count: number; order_count: number }>())
      ).map(([_, county]) => county)
    : [];

  // Filter and sort counties based on current settings
  const sortedCounties = selectedRegion
    ? [...selectedRegion.counties]
        .filter((county) => {
          // Apply city filter
          if (cityFilter.length > 0 && !cityFilter.includes(county.city)) {
            return false;
          }
          // Apply county filter
          if (countyFilter.length > 0 && !countyFilter.includes(county.county)) {
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          let comparison = 0;

          if (sortBy === "revenue") {
            comparison = a.revenue - b.revenue;
          } else if (sortBy === "dealers") {
            comparison = a.dealer_count - b.dealer_count;
          } else if (sortBy === "orders") {
            comparison = a.order_count - b.order_count;
          } else {
            // Default to revenue
            comparison = a.revenue - b.revenue;
          }

          // If primary sort is equal, chain secondary sorts
          if (comparison === 0) {
            // Secondary: Always sort by revenue if not already primary
            if (sortBy !== "revenue") {
              comparison = a.revenue - b.revenue;
            }
            // Tertiary: Sort by dealer count
            if (comparison === 0 && sortBy !== "dealers") {
              comparison = a.dealer_count - b.dealer_count;
            }
            // Quaternary: Sort by city name alphabetically
            if (comparison === 0) {
              comparison = a.city.localeCompare(b.city);
            }
          }

          return sortOrder === "asc" ? comparison : -comparison;
        })
    : [];

  const handleSort = (column: "revenue" | "dealers" | "orders") => {
    if (sortBy === column) {
      // Toggle sort order
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New column, default to descending
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // Get unique cities and counties for filter dropdowns
  const uniqueCities = selectedRegion
    ? Array.from(new Set(selectedRegion.counties.map((c) => c.city))).sort()
    : [];
  const uniqueCounties = selectedRegion
    ? Array.from(new Set(selectedRegion.counties.map((c) => c.county))).sort()
    : [];

  // Debug logging for filters
  if (selectedRegion && sheetOpen) {
    console.log(`[Filter Debug] Region: ${selectedRegion.region}`);
    console.log(`[Filter Debug] Total ZIP rows in region:`, selectedRegion.counties.length);
    console.log(`[Filter Debug] Unique cities (${uniqueCities.length}):`, uniqueCities);
    console.log(`[Filter Debug] Unique counties (${uniqueCounties.length}):`, uniqueCounties);
  }

  // Calculate filtered totals and narrative
  const isFiltered = cityFilter.length > 0 || countyFilter.length > 0;
  const filteredTotals = isFiltered
    ? sortedCounties.reduce(
        (acc, county) => ({
          revenue: acc.revenue + county.revenue,
          dealer_count: acc.dealer_count + county.dealer_count,
          order_count: acc.order_count + county.order_count,
        }),
        { revenue: 0, dealer_count: 0, order_count: 0 }
      )
    : null;

  // Pagination
  const totalPages = Math.ceil(sortedCounties.length / rowsPerPage);
  const paginatedCounties = sortedCounties.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <>
      <div className="relative z-0 h-full w-full min-h-[250px] flex flex-col pb-2">
        {/* Toggle Controls */}
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <Button
            size="sm"
            variant={showRegions ? "default" : "outline"}
            onClick={() => setShowRegions(!showRegions)}
            className="h-8 shadow-md"
          >
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            Regions
          </Button>
          <Button
            size="sm"
            variant={showCircles ? "default" : "outline"}
            onClick={() => setShowCircles(!showCircles)}
            className="h-8 shadow-md"
          >
            <Circle className="h-3.5 w-3.5 mr-1.5" />
            ZIPs
          </Button>
        </div>

        <div className="flex-1 min-h-0">
          <MapContainer
            center={floridaCenter}
            zoom={6.5}
            style={{ height: "100%", width: "100%", minHeight: "250px" }}
            className="rounded-lg"
            zoomControl={false}
            attributionControl={false}
          >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {showRegions && (
            <GeoJSON
              data={geoData}
              style={style}
              onEachFeature={onEachFeature}
            />
          )}
          {showCircles && Array.from(zipSummaries.values()).map((zipData) => (
            <CircleMarker
              key={zipData.zip}
              center={[zipData.lat, zipData.lng]}
              radius={getCircleRadius(zipData.revenue)}
              pathOptions={{
                fillColor: "#3b82f6", // blue-500
                fillOpacity: 0.6,
                color: "#1e40af", // blue-800
                weight: 2,
              }}
              eventHandlers={{
                click: async () => {
                  console.log("[FloridaRegionalSalesMap] ZIP clicked:", zipData.zip, zipData.city);
                  // Fetch dealer data for this ZIP and switch to ZIP mode
                  setLoadingZipData(true);
                  setSelectedZip(zipData);

                  // Also set the region so back button works correctly
                  const region = regionSummaries.get(zipData.region);
                  if (region) {
                    setSelectedRegion(region);
                  }

                  setDrawerMode("zip");
                  setSheetOpen(true);

                  const result = await getDealersByZipFlSafe(zipData.zip, fromDate, toDate);
                  setZipDealers(result.data || []);
                  setLoadingZipData(false);
                },
                mouseover: (e) => {
                  e.target.setStyle({
                    fillOpacity: 0.8,
                    weight: 3,
                  });
                },
                mouseout: (e) => {
                  e.target.setStyle({
                    fillOpacity: 0.6,
                    weight: 2,
                  });
                },
              }}
            >
              <Tooltip
                sticky
                className="regional-tooltip"
              >
                <div style={{ fontFamily: "sans-serif", minWidth: "180px", padding: "8px" }}>
                  <p style={{ fontWeight: 600, marginBottom: "8px", fontSize: "14px" }}>
                    {zipData.city}, FL {zipData.zip}
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "12px" }}>
                    <span style={{ color: "#6b7280" }}>County:</span> <strong>{zipData.county}</strong>
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "12px" }}>
                    <span style={{ color: "#6b7280" }}>Revenue:</span> <strong>{fmtUSD0(zipData.revenue)}</strong>
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "12px" }}>
                    <span style={{ color: "#6b7280" }}>Dealers:</span> {zipData.dealer_count}
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "12px" }}>
                    <span style={{ color: "#6b7280" }}>Orders:</span> {zipData.order_count}
                  </p>
                  <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#3b82f6", fontWeight: 500 }}>
                    <span>👁️</span>
                    <span>Click to view details</span>
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
        </div>

        {/* Legend */}
        <div className="flex-shrink-0 mt-1 flex items-center justify-center gap-3 text-[10px]">
          <span className="text-muted-foreground">Lower</span>
          <div className="flex gap-0.5">
            <div className="h-3 w-6 bg-green-500" />
            <div className="h-3 w-6 bg-green-600" />
            <div className="h-3 w-6 bg-green-700" />
            <div className="h-3 w-6 bg-green-800" />
          </div>
          <span className="text-muted-foreground">Higher Revenue</span>
        </div>
      </div>

      {/* County Breakdown Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl md:max-w-3xl flex flex-col z-50 px-6 relative">
          <SheetHeader className="space-y-3 flex-shrink-0 pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {drawerMode === "zip" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDrawerMode("region");
                      setCityFilter([]);
                      setCountyFilter([]);
                    }}
                    className="h-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <SheetTitle className="text-lg font-semibold">
                  {drawerMode === "region"
                    ? selectedRegion?.region
                    : `${selectedZip?.city}, FL ${selectedZip?.zip}`}
                </SheetTitle>
              </div>
              {drawerMode === "region" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 group"
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  title="Chat with AI"
                >
                  <Sparkles className={cn(
                    "h-4 w-4 transition-colors",
                    isChatOpen ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )} />
                </Button>
              )}
            </div>
            <SheetDescription asChild>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {drawerMode === "region" ? "Revenue" : "Total Revenue"}
                    </p>
                    <p className="font-semibold text-foreground">
                      {drawerMode === "region"
                        ? selectedRegion ? fmtUSD0(selectedRegion.revenue) : "$0"
                        : selectedZip ? fmtUSD0(selectedZip.revenue) : "$0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {drawerMode === "region" ? "Dealers" : "Dealers"}
                    </p>
                    <p className="font-semibold text-foreground">
                      {drawerMode === "region"
                        ? selectedRegion?.dealer_count ?? 0
                        : selectedZip?.dealer_count ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Orders</p>
                    <p className="font-semibold text-foreground">
                      {drawerMode === "region"
                        ? selectedRegion?.order_count ?? 0
                        : selectedZip?.order_count ?? 0}
                    </p>
                  </div>
                </div>
                {drawerMode === "zip" && selectedZip && (
                  <div className="text-xs text-muted-foreground">
                    <p>County: <span className="font-medium text-foreground">{selectedZip.county}</span></p>
                    <p>Region: <span className="font-medium text-foreground">{selectedZip.region}</span></p>
                  </div>
                )}
              </div>
            </SheetDescription>
          </SheetHeader>

          {/* Filtered Summary Card - Shows when filters are active */}
          {drawerMode === "region" && isFiltered && filteredTotals && sortedCounties.length > 0 && (
            <div className="mt-4 flex-shrink-0 rounded-lg border border-primary bg-primary/5 p-4">
              <h4 className="text-sm font-semibold mb-3">Filtered Selection</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                  <p className="font-semibold text-foreground">{fmtUSD0(filteredTotals.revenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Dealers</p>
                  <p className="font-semibold text-foreground">{filteredTotals.dealer_count}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Orders</p>
                  <p className="font-semibold text-foreground">{filteredTotals.order_count}</p>
                </div>
              </div>
            </div>
          )}

          {/* Narrative Story Section - Region Mode Only */}
          {drawerMode === "region" && selectedRegion && aggregatedCounties.length > 0 && (
            <div className="mt-4 flex-shrink-0 rounded-lg border bg-muted/30 p-4">
              <p className="text-sm leading-relaxed text-foreground">
                {(() => {
                  // Sort aggregated counties by revenue
                  const sortedAggregated = [...aggregatedCounties].sort((a, b) => b.revenue - a.revenue);
                  const topCounty = sortedAggregated[0];
                  const totalRevenue = selectedRegion.revenue;
                  const topCountyRevenue = topCounty.revenue;
                  const topCountyPercentage = ((topCountyRevenue / totalRevenue) * 100).toFixed(1);

                  return (
                    <>
                      In <strong>{selectedRegion.region}</strong>, the highest revenue came from{" "}
                      <strong>{topCounty.county}</strong> with{" "}
                      <strong>{fmtUSD0(topCountyRevenue)}</strong> ({topCountyPercentage}% of regional revenue).{" "}
                      This region had a total of <strong>{selectedRegion.dealer_count}</strong> active dealers{" "}
                      generating <strong>{selectedRegion.order_count}</strong> orders.
                      {sortedAggregated.length > 1 && (
                        <>
                          {" "}Other significant counties include <strong>{sortedAggregated.slice(1, 3).map(c => c.county).join(" and ")}</strong>.
                        </>
                      )}
                    </>
                  );
                })()}
              </p>
            </div>
          )}

          {/* Filtered Narrative - Shows when filters are active */}
          {drawerMode === "region" && isFiltered && filteredTotals && sortedCounties.length > 0 && (
            <div className="mt-4 flex-shrink-0 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-4">
              <p className="text-sm leading-relaxed text-foreground">
                {(() => {
                  // Aggregate by city to get total revenue per city across all ZIPs
                  const cityAggregates = sortedCounties.reduce((acc, row) => {
                    const existing = acc.get(row.city);
                    if (existing) {
                      existing.revenue += row.revenue;
                      existing.dealer_count += row.dealer_count;
                      existing.order_count += row.order_count;
                      existing.zip_count += 1;
                      existing.counties.add(row.county);
                    } else {
                      acc.set(row.city, {
                        city: row.city,
                        revenue: row.revenue,
                        dealer_count: row.dealer_count,
                        order_count: row.order_count,
                        zip_count: 1,
                        counties: new Set([row.county]),
                      });
                    }
                    return acc;
                  }, new Map<string, { city: string; revenue: number; dealer_count: number; order_count: number; zip_count: number; counties: Set<string> }>());

                  console.log("[Filtered Narrative] City Aggregates:", Array.from(cityAggregates.entries()).map(([city, data]) => ({
                    city,
                    zip_count: data.zip_count,
                    revenue: data.revenue,
                    dealer_count: data.dealer_count,
                  })));

                  const topCity = Array.from(cityAggregates.values()).sort((a, b) => b.revenue - a.revenue)[0];
                  const topCityPercentage = ((topCity.revenue / filteredTotals.revenue) * 100).toFixed(1);

                  const filterDescription = [];
                  if (cityFilter.length > 0) {
                    filterDescription.push(cityFilter.length === 1 ? cityFilter[0] : `${cityFilter.length} cities`);
                  }
                  if (countyFilter.length > 0) {
                    filterDescription.push(countyFilter.length === 1 ? `${countyFilter[0]} County` : `${countyFilter.length} counties`);
                  }

                  const uniqueZipCount = sortedCounties.length;
                  const uniqueCityCount = cityAggregates.size;

                  return (
                    <>
                      Filtering by <strong>{filterDescription.join(" in ")}</strong> ({uniqueCityCount} {uniqueCityCount === 1 ? "city" : "cities"} across {uniqueZipCount} ZIP{uniqueZipCount === 1 ? "" : "s"}), total sales resulted in{" "}
                      <strong>{fmtUSD0(filteredTotals.revenue)}</strong>, driven by{" "}
                      <strong>{topCity.city}</strong> ({topCity.zip_count} ZIP{topCity.zip_count === 1 ? "" : "s"}) with{" "}
                      <strong>{fmtUSD0(topCity.revenue)}</strong> representing{" "}
                      <strong>{topCityPercentage}%</strong> of the filtered total.{" "}
                      This selection includes <strong>{filteredTotals.dealer_count}</strong> active dealers{" "}
                      generating <strong>{filteredTotals.order_count}</strong> orders.
                    </>
                  );
                })()}
              </p>
            </div>
          )}

          {/* Region Mode: County Breakdown Table */}
          {drawerMode === "region" && (
            <div className="mt-6 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="text-sm font-semibold">
                  County Breakdown ({sortedCounties.length})
                </h3>
                <div className="flex items-center gap-2">
                  {/* City Filter */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={cityFilter.length > 0 ? "default" : "outline"}
                        size="sm"
                        className="h-8"
                      >
                        <Filter className="h-3.5 w-3.5 mr-1.5" />
                        City {cityFilter.length > 0 && `(${cityFilter.length})`}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="end">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">Filter by City</h4>
                          {cityFilter.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCityFilter([])}
                              className="h-6 px-2 text-xs"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {cityFilter.length === 0 ? "Select cities to filter" : `${cityFilter.length} selected`}
                        </div>
                        {/* Search Input */}
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder="Search cities..."
                            value={citySearchQuery}
                            onChange={(e) => setCitySearchQuery(e.target.value)}
                            className="h-9 pl-9 text-sm"
                          />
                        </div>
                        <div className="max-h-72 overflow-y-auto space-y-2 border rounded-md p-2">
                          {uniqueCities
                            .filter((city) =>
                              city.toLowerCase().includes(citySearchQuery.toLowerCase())
                            )
                            .map((city) => (
                            <div key={city} className="flex items-center space-x-2 py-1 px-1 hover:bg-muted/50 rounded">
                              <Checkbox
                                id={`city-${city}`}
                                checked={cityFilter.includes(city)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setCityFilter([...cityFilter, city]);
                                  } else {
                                    setCityFilter(cityFilter.filter((c) => c !== city));
                                  }
                                }}
                              />
                              <label
                                htmlFor={`city-${city}`}
                                className="text-sm cursor-pointer flex-1 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {city}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* County Filter */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={countyFilter.length > 0 ? "default" : "outline"}
                        size="sm"
                        className="h-8"
                      >
                        <Filter className="h-3.5 w-3.5 mr-1.5" />
                        County {countyFilter.length > 0 && `(${countyFilter.length})`}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="end">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">Filter by County</h4>
                          {countyFilter.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCountyFilter([])}
                              className="h-6 px-2 text-xs"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {countyFilter.length === 0 ? "Select counties to filter" : `${countyFilter.length} selected`}
                        </div>
                        <div className="max-h-72 overflow-y-auto space-y-2 border rounded-md p-2">
                          {uniqueCounties.map((county) => (
                            <div key={county} className="flex items-center space-x-2 py-1 px-1 hover:bg-muted/50 rounded">
                              <Checkbox
                                id={`county-${county}`}
                                checked={countyFilter.includes(county)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setCountyFilter([...countyFilter, county]);
                                  } else {
                                    setCountyFilter(countyFilter.filter((c) => c !== county));
                                  }
                                }}
                              />
                              <label
                                htmlFor={`county-${county}`}
                                className="text-sm cursor-pointer flex-1 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {county}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.city}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, city: checked })
                    }
                  >
                    City
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.zip}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, zip: checked })
                    }
                  >
                    ZIP Code
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.county}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, county: checked })
                    }
                  >
                    County
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.revenue}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, revenue: checked })
                    }
                  >
                    Revenue
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.dealers}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, dealers: checked })
                    }
                  >
                    Dealers
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.orders}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, orders: checked })
                    }
                  >
                    Orders
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
                </div>
              </div>
            {sortedCounties.length === 0 ? (
              <p className="text-sm text-muted-foreground">No county data available</p>
            ) : (
              <div className="flex-1 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      {visibleColumns.city && (
                        <TableHead className="w-[140px]">City</TableHead>
                      )}
                      {visibleColumns.zip && (
                        <TableHead className="w-[100px]">ZIP Code</TableHead>
                      )}
                      {visibleColumns.county && (
                        <TableHead>County</TableHead>
                      )}
                      {visibleColumns.revenue && (
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("revenue")}
                            className="h-8 w-full justify-end"
                          >
                            Revenue
                            {sortBy === "revenue" && (
                              sortOrder === "asc" ? (
                                <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
                              ) : (
                                <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
                              )
                            )}
                            {sortBy !== "revenue" && (
                              <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />
                            )}
                          </Button>
                        </TableHead>
                      )}
                      {visibleColumns.dealers && (
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("dealers")}
                            className="h-8 w-full justify-end"
                          >
                            Dealers
                            {sortBy === "dealers" && (
                              sortOrder === "asc" ? (
                                <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
                              ) : (
                                <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
                              )
                            )}
                            {sortBy !== "dealers" && (
                              <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />
                            )}
                          </Button>
                        </TableHead>
                      )}
                      {visibleColumns.orders && (
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("orders")}
                            className="h-8 w-full justify-end"
                          >
                            Orders
                            {sortBy === "orders" && (
                              sortOrder === "asc" ? (
                                <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
                              ) : (
                                <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
                              )
                            )}
                            {sortBy !== "orders" && (
                              <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />
                            )}
                          </Button>
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCounties.map((county) => (
                      <TableRow key={`${county.county}-${county.zip_code}`}>
                        {visibleColumns.city && (
                          <TableCell className="text-sm">{county.city}</TableCell>
                        )}
                        {visibleColumns.zip && (
                          <TableCell className="font-mono text-xs">{county.zip_code}</TableCell>
                        )}
                        {visibleColumns.county && (
                          <TableCell className="font-medium">{county.county}</TableCell>
                        )}
                        {visibleColumns.revenue && (
                          <TableCell className="text-right tabular-nums">
                            {fmtUSD0(county.revenue)}
                          </TableCell>
                        )}
                        {visibleColumns.dealers && (
                          <TableCell className="text-right tabular-nums">
                            {county.dealer_count}
                          </TableCell>
                        )}
                        {visibleColumns.orders && (
                          <TableCell className="text-right tabular-nums">
                            {county.order_count}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls - Show when more than rowsPerPage */}
            {sortedCounties.length > rowsPerPage && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t flex-shrink-0">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, sortedCounties.length)} of {sortedCounties.length} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            </div>
          )}

          {/* ZIP Mode: Dealer List Table */}
          {drawerMode === "zip" && (
            <div className="mt-6 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="text-sm font-semibold">
                  Dealers in ZIP {selectedZip?.zip} ({zipDealers.length})
                </h3>
              </div>
              {loadingZipData ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading dealers...</span>
                </div>
              ) : zipDealers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">
                  No dealer data available for this ZIP code
                </p>
              ) : (
                <div className="flex-1 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[200px]">Dealer Name</TableHead>
                        <TableHead className="w-[140px]">City</TableHead>
                        <TableHead className="w-[140px]">Sales Rep</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zipDealers.map((dealer) => (
                        <TableRow key={dealer.customer_id}>
                          <TableCell className="font-medium">{dealer.dealer_name}</TableCell>
                          <TableCell className="text-sm">{dealer.dealer_city}</TableCell>
                          <TableCell className="text-sm">{dealer.sales_rep}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmtUSD0(dealer.revenue)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {dealer.order_count}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* Floating Nudge - Shows when chat is closed and high-value insight detected */}
          {drawerMode === "region" && selectedRegion && !isChatOpen && (
            <FloatingNudge
              isVisible={sortedCounties.length > 0 && sortedCounties[0].revenue > 50000}
              text={`✨ Analyze ${sortedCounties[0]?.city}'s performance?`}
              onClick={() => {
                setChatInitialQuery(`Why is ${sortedCounties[0]?.city} performing so well in ${selectedRegion.region}?`);
                setIsChatOpen(true);
              }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2"
            />
          )}

          {/* ChatSheet Overlay - Slides up from bottom */}
          {drawerMode === "region" && selectedRegion && (
            <ChatSheet
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              seededQuestions={[
                {
                  question: `What are the top cities in ${selectedRegion.region}?`,
                  answer: `In ${selectedRegion.region}, the top performing cities are ${selectedRegion.counties
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 3)
                    .map(c => c.city)
                    .join(", ")}. The region generated ${fmtUSD0(selectedRegion.revenue)} in total revenue.`
                },
                {
                  question: "How many dealers are active?",
                  answer: `There are ${selectedRegion.dealer_count} active dealers in ${selectedRegion.region}, generating ${selectedRegion.order_count} orders with total revenue of ${fmtUSD0(selectedRegion.revenue)}.`
                },
                {
                  question: "Show me county performance",
                  answer: `${selectedRegion.region} has ${Array.from(new Set(selectedRegion.counties.map(c => c.county))).length} counties. The top performing county is ${selectedRegion.counties.sort((a, b) => b.revenue - a.revenue)[0].county}.`
                },
                {
                  question: `Why is ${sortedCounties[0]?.city} performing so well in ${selectedRegion.region}?`,
                  answer: `${sortedCounties[0]?.city} is the top performer with ${fmtUSD0(sortedCounties[0]?.revenue)} in revenue. This represents a strong market presence with ${sortedCounties[0]?.dealer_count} active dealers and ${sortedCounties[0]?.order_count} orders.`
                },
              ]}
              placeholder={`Ask about ${selectedRegion.region} data...`}
              title={`Chat about ${selectedRegion.region}`}
              initialQuery={chatInitialQuery}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
