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

  // Calculate min/max for color scale
  const revenues = Array.from(regionSummaries.values()).map((r) => r.revenue);
  const maxRevenue = Math.max(...revenues, 1);
  const minRevenue = Math.min(...revenues.filter((r) => r > 0), 0);

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
      layer.on("mouseover", function () {
        this.setStyle({
          weight: 3,
          fillOpacity: 0.9,
        });
      });

      layer.on("mouseout", function () {
        this.setStyle({
          weight: 2,
          fillOpacity: 0.7,
        });
      });
    }
  };

  // Florida center coordinates
  const floridaCenter: [number, number] = [27.9944024, -81.7602544];

  // Sort counties by revenue
  const sortedCounties = selectedRegion
    ? [...selectedRegion.counties].sort((a, b) => b.revenue - a.revenue)
    : [];

  return (
    <>
      <div className="h-full w-full min-h-[250px]">
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
          <GeoJSON
            data={geoData}
            style={style}
            onEachFeature={onEachFeature}
          />
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
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader className="space-y-3 flex-shrink-0">
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

          <div className="mt-6 flex-1 flex flex-col min-h-0">
            <h3 className="mb-3 text-sm font-semibold flex-shrink-0">
              County Breakdown ({sortedCounties.length})
            </h3>
            {sortedCounties.length === 0 ? (
              <p className="text-sm text-muted-foreground">No county data available</p>
            ) : (
              <div className="flex-1 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[40%]">County</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Dealers</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCounties.map((county) => (
                      <TableRow key={`${county.county}-${county.zip_code}`}>
                        <TableCell className="font-medium">{county.county}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtUSD0(county.revenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {county.dealer_count}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {county.order_count}
                        </TableCell>
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
