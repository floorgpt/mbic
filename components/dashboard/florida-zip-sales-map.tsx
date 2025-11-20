"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ZipSalesRow, DealerByZipRow, ZipGapRow } from "@/lib/mbic-supabase";
import { getZipGapAnalysisSafe } from "@/lib/mbic-supabase";
import { fmtUSD0 } from "@/lib/format";
import { ArrowRight, ChevronLeft, ChevronRight, Layers, Circle, AlertTriangle } from "lucide-react";
import dynamic from "next/dynamic";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ZipGapDrawer } from "@/components/dashboard/zip-gap-drawer";

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
const Tooltip = dynamic(
  () => import("react-leaflet").then((mod) => mod.Tooltip),
  { ssr: false }
);

type FloridaZipSalesMapProps = {
  data: ZipSalesRow[];
  dateRange: { from: string; to: string };
};

type GeoJSONData = FeatureCollection<Geometry, Record<string, unknown>>;

export function FloridaZipSalesMap({ data, dateRange }: FloridaZipSalesMapProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [geoData, setGeoData] = useState<GeoJSONData | null>(null);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [dealers, setDealers] = useState<DealerByZipRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;

  // Blue circles state
  const [zipCentroids, setZipCentroids] = useState<Map<string, { lat: number; lng: number }>>(new Map());
  const [showPolygons, setShowPolygons] = useState(true);
  const [showCircles, setShowCircles] = useState(true);

  // Gap Analysis state
  const [gapData, setGapData] = useState<ZipGapRow[]>([]);
  const [showGapCircles, setShowGapCircles] = useState(true);
  const [gapDrawerOpen, setGapDrawerOpen] = useState(false);
  const [selectedGapZip, setSelectedGapZip] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);

    // Load Leaflet CSS and library
    import("leaflet/dist/leaflet.css");
    import("leaflet").then((leaflet) => {
      setL(leaflet);
    });

    // Load GeoJSON
    fetch("/geo/florida-zips.geojson")
      .then((res) => res.json())
      .then((geojson: GeoJSONData) => {
        console.log("[FloridaZipSalesMap] GeoJSON loaded:", {
          featureCount: geojson.features.length,
        });
        setGeoData(geojson);
      })
      .catch((err) => {
        console.error("[FloridaZipSalesMap] Failed to load GeoJSON:", err);
      });

    // Load Gap Analysis data
    const loadGapData = async () => {
      try {
        const result = await getZipGapAnalysisSafe(dateRange.from, dateRange.to);
        if (!result._meta.err) {
          setGapData(result.data);
          console.log("[FloridaZipSalesMap] Gap data loaded:", {
            gapCount: result.data.length,
          });
        } else {
          console.error("[FloridaZipSalesMap] Gap data error:", result._meta.err);
        }
      } catch (err) {
        console.error("[FloridaZipSalesMap] Failed to load gap data:", err);
      }
    };

    loadGapData();
  }, [dateRange.from, dateRange.to]);

  const handleViewDetails = async (zipCode: string) => {
    setSelectedZip(zipCode);
    setSheetOpen(true);
    setLoading(true);
    setPage(0); // Reset pagination when opening new ZIP

    try {
      const response = await fetch(
        `/api/dealers-by-zip?zipCode=${zipCode}&from=${dateRange.from}&to=${dateRange.to}`
      );
      const dealersData = await response.json();
      setDealers(dealersData);
    } catch (error) {
      console.error("[FloridaZipSalesMap] Failed to fetch dealers:", error);
      setDealers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGapClick = (zipCode: string) => {
    setSelectedGapZip(zipCode);
    setGapDrawerOpen(true);
  };

  const handleDealerNavigation = (dealerId: number, repName: string) => {
    // Navigate to Sales page with dealer and rep preselected
    const params = new URLSearchParams();
    if (repName && repName !== "Unassigned") {
      params.set("rep", repName);
    }
    params.set("dealer", dealerId.toString());
    router.push(`/sales?${params.toString()}`);
  };

  const getRepInitials = (repName: string): string => {
    if (repName === "Unassigned") return "N/A";
    return repName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Prevent SSR hydration mismatch
  if (!isMounted || !geoData || !L) {
    return (
      <div className="h-[600px] animate-pulse rounded-xl bg-muted/40">
        <div className="flex h-full items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
            Loading map...
          </div>
        </div>
      </div>
    );
  }

  // Create a map of ZIP codes to revenue
  const revenueByZip = new Map(data.map((row) => [row.zip_code, row]));

  // Calculate min/max for color scale
  const revenues = data.map((row) => row.revenue);
  const maxRevenue = Math.max(...revenues, 1);
  const minRevenue = Math.min(...revenues, 0);

  // Color scale function (green gradient)
  const getColor = (revenue: number): string => {
    if (revenue === 0) return "#e5e7eb"; // grey for no data

    const ratio = (revenue - minRevenue) / (maxRevenue - minRevenue);

    // Green gradient from light to dark
    if (ratio > 0.9) return "#14532d"; // green-900
    if (ratio > 0.75) return "#15803d"; // green-800
    if (ratio > 0.6) return "#16a34a"; // green-700
    if (ratio > 0.45) return "#22c55e"; // green-600
    if (ratio > 0.3) return "#4ade80"; // green-500
    if (ratio > 0.15) return "#86efac"; // green-400
    if (ratio > 0.05) return "#bbf7d0"; // green-300
    return "#dcfce7"; // green-200
  };

  // Style function for each ZIP feature
  const style = (feature?: Feature<Geometry>) => {
    if (!feature || !feature.id) {
      return {
        fillColor: "#e5e7eb",
        weight: 0.5,
        opacity: 1,
        color: "#333333",
        fillOpacity: 0.7,
      };
    }

    const zipCode = String(feature.id);
    const zipData = revenueByZip.get(zipCode);
    const revenue = zipData?.revenue ?? 0;

    return {
      fillColor: getColor(revenue),
      weight: 0.5,
      opacity: 1,
      color: "#333333",
      fillOpacity: 0.7,
    };
  };

  // Tooltip on hover with eye icon AND calculate centroids
  const onEachFeature = (feature: Feature<Geometry>, layer: L.Layer) => {
    const zipCode = String(feature.id ?? "");
    const zipData = revenueByZip.get(zipCode);

    // Calculate centroid from polygon bounds (for blue circles)
    // Note: MultiPolygon extends Polygon, so this check covers both
    if (layer instanceof L.Polygon) {
      const bounds = layer.getBounds();
      const center = bounds.getCenter();
      setZipCentroids(prev => new Map(prev).set(zipCode, { lat: center.lat, lng: center.lng }));
    }

    if (zipData) {
      const popupContent = L.DomUtil.create("div");
      popupContent.style.fontFamily = "sans-serif";
      popupContent.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <p style="font-weight: 600; margin: 0;">ZIP: ${zipCode}</p>
          <button
            id="view-details-${zipCode}"
            style="
              display: flex;
              align-items: center;
              gap: 4px;
              background: #22c55e;
              color: white;
              border: none;
              border-radius: 4px;
              padding: 4px 8px;
              cursor: pointer;
              font-size: 12px;
            "
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            View
          </button>
        </div>
        <p style="margin: 4px 0;"><span style="color: #6b7280;">Revenue:</span> <strong>${fmtUSD0(zipData.revenue)}</strong></p>
        <p style="margin: 4px 0;"><span style="color: #6b7280;">Dealers:</span> ${zipData.dealer_count}</p>
        <p style="margin: 4px 0;"><span style="color: #6b7280;">Orders:</span> ${zipData.order_count}</p>
      `;

      layer.bindPopup(popupContent);

      // Add click handler for the button
      layer.on("popupopen", () => {
        const button = document.getElementById(`view-details-${zipCode}`);
        if (button) {
          button.addEventListener("click", () => {
            handleViewDetails(zipCode);
            layer.closePopup();
          });
        }
      });
    } else {
      layer.bindPopup(`
        <div style="font-family: sans-serif;">
          <p style="font-weight: 600; margin-bottom: 4px;">ZIP: ${zipCode}</p>
          <p style="color: #6b7280; font-size: 12px;">No sales data</p>
        </div>
      `);
    }
  };

  // Florida center coordinates
  const floridaCenter: [number, number] = [27.9944024, -81.7602544];

  const zipSalesData = selectedZip ? revenueByZip.get(selectedZip) : null;

  // Circle radius calculation (based on revenue)
  const getCircleRadius = (revenue: number): number => {
    if (revenue === 0) return 0;
    const minRadius = 4;
    const maxRadius = 18;
    const ratio = (revenue - minRevenue) / (maxRevenue - minRevenue);
    return minRadius + ratio * (maxRadius - minRadius);
  };

  // Gap circle radius calculation (based on estimated revenue)
  const getGapCircleRadius = (estRevenue: number): number => {
    if (estRevenue === 0) return 0;
    const gapRevenues = gapData.map((g) => g.total_est_revenue);
    const maxGapRevenue = Math.max(...gapRevenues, 1);
    const minGapRevenue = Math.min(...gapRevenues, 0);
    const minRadius = 5;
    const maxRadius = 20;
    const ratio = (estRevenue - minGapRevenue) / (maxGapRevenue - minGapRevenue);
    return minRadius + ratio * (maxRadius - minRadius);
  };

  return (
    <>
      <div className="h-[600px] w-full relative">
        {/* Toggle Controls */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <Button
            variant={showPolygons ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPolygons(!showPolygons)}
            className="shadow-lg"
          >
            <Layers className="h-4 w-4 mr-2" />
            Polygons
          </Button>
          <Button
            variant={showCircles ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCircles(!showCircles)}
            className="shadow-lg"
          >
            <Circle className="h-4 w-4 mr-2" />
            Sales
          </Button>
          <Button
            variant={showGapCircles ? "destructive" : "outline"}
            size="sm"
            onClick={() => setShowGapCircles(!showGapCircles)}
            className="shadow-lg"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Gaps
          </Button>
        </div>

        <MapContainer
          center={floridaCenter}
          zoom={7}
          style={{ height: "100%", width: "100%" }}
          className="rounded-xl"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* ZIP Polygons (Choropleth) */}
          {showPolygons && (
            <GeoJSON
              data={geoData}
              style={style}
              onEachFeature={onEachFeature}
            />
          )}

          {/* Blue Circles at Centroids */}
          {showCircles && data.map((zipData) => {
            const centroid = zipCentroids.get(zipData.zip_code);
            if (!centroid || zipData.revenue === 0) return null;

            return (
              <CircleMarker
                key={zipData.zip_code}
                center={[centroid.lat, centroid.lng]}
                radius={getCircleRadius(zipData.revenue)}
                pathOptions={{
                  fillColor: "#3b82f6", // blue-500
                  fillOpacity: 0.6,
                  color: "#1e40af", // blue-800
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => handleViewDetails(zipData.zip_code),
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
                  interactive={false}
                >
                  <div style={{ fontFamily: "sans-serif", minWidth: "180px", padding: "8px" }}>
                    <p style={{ fontWeight: 600, marginBottom: "8px", fontSize: "14px" }}>
                      ZIP: {zipData.zip_code}
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "12px" }}>
                      <span style={{ color: "#6b7280" }}>Revenue:</span> <strong>{fmtUSD0(zipData.revenue)}</strong>
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "12px" }}>
                      <span style={{ color: "#6b7280" }}>Dealers:</span> <strong>{zipData.dealer_count}</strong>
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "12px" }}>
                      <span style={{ color: "#6b7280" }}>Orders:</span> <strong>{zipData.order_count}</strong>
                    </p>
                    <div style={{
                      marginTop: "8px",
                      paddingTop: "8px",
                      borderTop: "1px solid #e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "#22c55e",
                      fontSize: "11px",
                      fontWeight: 600
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      Click to view dealers
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

          {/* Red Gap Circles (ZIPs with competitors but no sales) */}
          {showGapCircles && gapData.map((gapZip) => {
            const centroid = zipCentroids.get(gapZip.zip_code);
            if (!centroid) return null;

            return (
              <CircleMarker
                key={`gap-${gapZip.zip_code}`}
                center={[centroid.lat, centroid.lng]}
                radius={getGapCircleRadius(gapZip.total_est_revenue)}
                pathOptions={{
                  fillColor: "#ef4444", // red-500
                  fillOpacity: 0.6,
                  color: "#b91c1c", // red-700
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => handleGapClick(gapZip.zip_code),
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
                  interactive={false}
                >
                  <div style={{ fontFamily: "sans-serif", minWidth: "200px", padding: "8px" }}>
                    <p style={{ fontWeight: 600, marginBottom: "8px", fontSize: "14px", color: "#dc2626" }}>
                      ⚠️ Gap ZIP: {gapZip.zip_code}
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "12px" }}>
                      <span style={{ color: "#6b7280" }}>Est. Market:</span>{" "}
                      <strong style={{ color: "#dc2626" }}>{fmtUSD0(gapZip.total_est_revenue)}</strong>
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "12px" }}>
                      <span style={{ color: "#6b7280" }}>Competitors:</span>{" "}
                      <strong>{gapZip.competitor_count}</strong>
                    </p>
                    <p style={{ margin: "4px 0", fontSize: "12px", color: "#dc2626" }}>
                      <span style={{ fontWeight: 600 }}>Our Sales: $0</span>
                    </p>
                    <div style={{
                      marginTop: "8px",
                      paddingTop: "8px",
                      borderTop: "1px solid #fee2e2",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "#dc2626",
                      fontSize: "11px",
                      fontWeight: 600
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      Click to view gap details
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs">
          <span className="text-muted-foreground">Lower Revenue</span>
          <div className="flex gap-0.5">
            <div className="h-4 w-8 bg-green-200" />
            <div className="h-4 w-8 bg-green-300" />
            <div className="h-4 w-8 bg-green-400" />
            <div className="h-4 w-8 bg-green-500" />
            <div className="h-4 w-8 bg-green-600" />
            <div className="h-4 w-8 bg-green-700" />
            <div className="h-4 w-8 bg-green-800" />
            <div className="h-4 w-8 bg-green-900" />
          </div>
          <span className="text-muted-foreground">Higher Revenue</span>
        </div>
      </div>

      {/* Dealer Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader className="space-y-3 flex-shrink-0">
            <SheetTitle className="text-lg font-semibold">ZIP Code: {selectedZip}</SheetTitle>
            <SheetDescription asChild>
              <div>
                {dealers.length > 0 && dealers[0].cities && (
                  <p className="mb-3 text-sm font-medium text-foreground">
                    Cities: {dealers[0].cities}
                  </p>
                )}
                {zipSalesData && (
                  <div className="space-y-1.5 rounded-lg bg-muted/50 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Revenue:</span>
                      <span className="font-semibold">{fmtUSD0(zipSalesData.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Dealers:</span>
                      <span className="font-semibold">{zipSalesData.dealer_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Orders:</span>
                      <span className="font-semibold">{zipSalesData.order_count}</span>
                    </div>
                  </div>
                )}
              </div>
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex-1 flex flex-col min-h-0">
            <h3 className="mb-4 text-sm font-semibold flex-shrink-0">Dealers in this ZIP</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : dealers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dealers found</p>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
                  {dealers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((dealer) => (
                    <div
                      key={dealer.customer_id}
                      className="rounded-lg border bg-card p-3.5 shadow-sm transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm leading-tight mb-2 truncate">{dealer.dealer_name}</p>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Revenue:</span>
                              <span className="font-medium text-foreground">{fmtUSD0(dealer.total_sales)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Orders:</span>
                              <span className="font-medium text-foreground">{dealer.order_count}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Rep:</span>
                              <span className="flex items-center gap-1.5">
                                <span className="text-foreground truncate">{dealer.rep_name}</span>
                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] flex-shrink-0">
                                  {getRepInitials(dealer.rep_name)}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 flex-shrink-0"
                          onClick={() =>
                            handleDealerNavigation(dealer.customer_id, dealer.rep_name)
                          }
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination - only show if more than PAGE_SIZE dealers */}
                {dealers.length > PAGE_SIZE && (
                  <div className="flex-shrink-0 border-t pt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, dealers.length)} of {dealers.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="h-7 w-7"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span>
                        Page {page + 1} / {Math.ceil(dealers.length / PAGE_SIZE)}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setPage((p) => Math.min(Math.ceil(dealers.length / PAGE_SIZE) - 1, p + 1))}
                        disabled={page >= Math.ceil(dealers.length / PAGE_SIZE) - 1}
                        className="h-7 w-7"
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Gap Analysis Drawer */}
      <ZipGapDrawer
        isOpen={gapDrawerOpen}
        onClose={() => {
          setGapDrawerOpen(false);
          setSelectedGapZip(null);
        }}
        zipCode={selectedGapZip}
        dateRange={dateRange}
      />
    </>
  );
}
