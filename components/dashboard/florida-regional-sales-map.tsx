"use client";

import { useEffect, useState } from "react";
import type { CountySalesRow } from "@/lib/mbic-supabase";
import { fmtUSD0 } from "@/lib/format";
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
import { Layers, Circle, ArrowUpDown, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

type RegionalSalesMapProps = {
  data: CountySalesRow[];
};

type GeoJSONData = FeatureCollection<Geometry, Record<string, unknown>>;

type RegionSummary = {
  region: "South Florida" | "Central Florida" | "North Florida";
  revenue: number;
  dealer_count: number;
  order_count: number;
  counties: CountySalesRow[];
};

export function FloridaRegionalSalesMap({ data }: RegionalSalesMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [geoData, setGeoData] = useState<GeoJSONData | null>(null);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<RegionSummary | null>(null);
  const [showRegions, setShowRegions] = useState(true);
  const [showCircles, setShowCircles] = useState(true);
  const [sortBy, setSortBy] = useState<"revenue" | "dealers" | "orders" | null>("revenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [visibleColumns, setVisibleColumns] = useState({
    zip: true,
    county: true,
    revenue: true,
    dealers: true,
    orders: true,
  });

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
        console.log("[FloridaRegionalSalesMap] GeoJSON loaded:", {
          featureCount: geojson.features.length,
        });
        setGeoData(geojson);
      })
      .catch((err) => {
        console.error("[FloridaRegionalSalesMap] Failed to load GeoJSON:", err);
      });
  }, []);

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
  const zipSummaries = new Map<string, { zip: string; county: string; region: string; revenue: number; dealer_count: number; order_count: number; lat: number; lng: number }>();

  data.forEach((row) => {
    if (row.region !== "Other Florida" && row.zip_code) {
      const existing = zipSummaries.get(row.zip_code);
      if (existing) {
        existing.revenue += row.revenue;
        existing.dealer_count += row.dealer_count;
        existing.order_count += row.order_count;
      } else {
        // Approximate coordinates based on region and county
        let lat = 27.9944024;
        let lng = -81.7602544;

        // Simple coordinate approximation based on region
        if (row.region === "South Florida") {
          lat = 26.0 + Math.random() * 1.5;
          lng = -80.3 - Math.random() * 1.5;
        } else if (row.region === "Central Florida") {
          lat = 27.5 + Math.random() * 1.3;
          lng = -81.5 - Math.random() * 1.3;
        } else if (row.region === "North Florida") {
          lat = 29.5 + Math.random() * 1.5;
          lng = -82.0 - Math.random() * 2.5;
        }

        zipSummaries.set(row.zip_code, {
          zip: row.zip_code,
          county: row.county,
          region: row.region,
          revenue: row.revenue,
          dealer_count: row.dealer_count,
          order_count: row.order_count,
          lat,
          lng,
        });
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
        setSelectedRegion(summary);
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

  // Sort counties based on current sort settings
  const sortedCounties = selectedRegion
    ? [...selectedRegion.counties].sort((a, b) => {
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

  return (
    <>
      <div className="relative z-0 h-full w-full min-h-[250px]">
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
                click: () => {
                  // When circle is clicked, find the region and open drawer
                  const region = regionSummaries.get(zipData.region);
                  if (region) {
                    setSelectedRegion(region);
                    setSheetOpen(true);
                  }
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
              <Popup>
                <div style={{ fontFamily: "sans-serif", minWidth: "150px" }}>
                  <p style={{ fontWeight: 600, marginBottom: "8px", fontSize: "14px" }}>
                    ZIP: {zipData.zip}
                  </p>
                  <p style={{ margin: "4px 0", fontSize: "12px" }}>
                    <span style={{ color: "#6b7280" }}>County:</span> {zipData.county}
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
                  <p style={{ marginTop: "8px", fontSize: "11px", color: "#6b7280", fontStyle: "italic" }}>
                    Click to view region details
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="mt-2 flex items-center justify-center gap-3 text-[10px]">
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
        <SheetContent className="w-full sm:max-w-2xl md:max-w-3xl flex flex-col z-50 px-6">
          <SheetHeader className="space-y-3 flex-shrink-0 pb-4">
            <SheetTitle className="text-lg font-semibold">
              {selectedRegion?.region}
            </SheetTitle>
            <SheetDescription asChild>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                    <p className="font-semibold text-foreground">
                      {selectedRegion ? fmtUSD0(selectedRegion.revenue) : "$0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Dealers</p>
                    <p className="font-semibold text-foreground">
                      {selectedRegion?.dealer_count ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Orders</p>
                    <p className="font-semibold text-foreground">
                      {selectedRegion?.order_count ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </SheetDescription>
          </SheetHeader>

          {/* Narrative Story Section */}
          {selectedRegion && sortedCounties.length > 0 && (
            <div className="mt-4 flex-shrink-0 rounded-lg border bg-muted/30 p-4">
              <p className="text-sm leading-relaxed text-foreground">
                {(() => {
                  const topCounty = sortedCounties[0];
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
                      {sortedCounties.length > 1 && (
                        <>
                          {" "}Other significant counties include <strong>{sortedCounties.slice(1, 3).map(c => c.county).join(" and ")}</strong>.
                        </>
                      )}
                    </>
                  );
                })()}
              </p>
            </div>
          )}

          <div className="mt-6 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-sm font-semibold">
                County Breakdown ({sortedCounties.length})
              </h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
            {sortedCounties.length === 0 ? (
              <p className="text-sm text-muted-foreground">No county data available</p>
            ) : (
              <div className="flex-1 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
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
                    {sortedCounties.map((county) => (
                      <TableRow key={`${county.county}-${county.zip_code}`}>
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
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
