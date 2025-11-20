import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Overpass API endpoint for OpenStreetMap queries
const OVERPASS_API = "https://overpass-api.de/api/interpreter";

// Revenue estimates by store brand (annual)
const STORE_REVENUE: Record<string, number> = {
  "Home Depot": 45_000_000,
  "Lowe's": 35_000_000,
  "Floor & Decor": 20_000_000,
};

// High-volume cities for tier multiplier (1.25x)
const HIGH_VOLUME_CITIES = [
  "Miami",
  "Doral",
  "Fort Lauderdale",
  "Hollywood",
  "Pembroke Pines",
  "Hialeah",
  "Orlando",
  "Tampa",
  "St. Petersburg",
  "Clearwater",
  "Jacksonville",
  "West Palm Beach",
  "Boca Raton",
  "Delray Beach",
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

/**
 * Normalize store name from OSM tags to match our brand names
 */
function normalizeStoreName(osmName: string): string | null {
  const name = osmName.toLowerCase();

  if (name.includes("home depot")) return "Home Depot";
  if (name.includes("lowe") || name.includes("lowes")) return "Lowe's";
  if (name.includes("floor") && name.includes("decor")) return "Floor & Decor";
  if (name.includes("floor and decor")) return "Floor & Decor";

  return null; // Not a target brand
}

/**
 * Check if city is high-volume for tier multiplier
 */
function isHighVolumeCity(city: string): boolean {
  return HIGH_VOLUME_CITIES.some((hvc) =>
    city.toLowerCase().includes(hvc.toLowerCase())
  );
}

/**
 * Main Edge Function handler
 */
serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[sync-market-data] Starting Florida competitor data sync");

    // Overpass QL query for Florida flooring/hardware stores
    // We use multiple search strategies to catch all variations
    const overpassQuery = `
      [out:json][timeout:120];
      area["name"="Florida"]["admin_level"="4"]->.florida;
      (
        // Search by shop=hardware (catches Home Depot, Lowe's)
        node["shop"="hardware"](area.florida);
        way["shop"="hardware"](area.florida);

        // Search by shop=doityourself (alternative tag)
        node["shop"="doityourself"](area.florida);
        way["shop"="doityourself"](area.florida);

        // Search by shop=flooring (catches Floor & Decor)
        node["shop"="flooring"](area.florida);
        way["shop"="flooring"](area.florida);

        // Search by name directly (backup strategy)
        node["name"~"Home Depot",i](area.florida);
        way["name"~"Home Depot",i](area.florida);
        node["name"~"Lowe",i](area.florida);
        way["name"~"Lowe",i](area.florida);
        node["name"~"Floor.*Decor",i](area.florida);
        way["name"~"Floor.*Decor",i](area.florida);
      );
      out center;
    `;

    console.log("[sync-market-data] Querying OpenStreetMap Overpass API...");

    // Fetch from Overpass API with retry logic
    let response: Response;
    let retries = 3;

    while (retries > 0) {
      try {
        response = await fetch(OVERPASS_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ data: overpassQuery }),
        });

        if (response.ok) break;

        console.log(`[sync-market-data] Overpass API returned ${response.status}, retrying...`);
        retries--;

        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s before retry
        }
      } catch (err) {
        console.error(`[sync-market-data] Fetch error:`, err);
        retries--;

        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          throw err;
        }
      }
    }

    if (!response!.ok) {
      throw new Error(`Overpass API error: ${response!.statusText}`);
    }

    const data = await response!.json();
    const elements = data.elements || [];

    console.log(`[sync-market-data] Found ${elements.length} potential stores from OSM`);

    const competitors: CompetitorStore[] = [];
    const seenStores = new Set<string>(); // Prevent duplicates

    // Process each OSM element
    for (const element of elements) {
      const tags = element.tags || {};
      const rawName = tags.name || "";

      // Normalize to our brand names
      const storeName = normalizeStoreName(rawName);
      if (!storeName) {
        continue; // Skip non-target brands
      }

      // Get coordinates (use center for ways/relations)
      const lat = element.lat || element.center?.lat;
      const lon = element.lon || element.center?.lon;
      if (!lat || !lon) {
        console.log(`[sync-market-data] Skipping ${rawName}: missing coordinates`);
        continue;
      }

      // Get address details
      const zipCode = tags["addr:postcode"]?.replace(/\D/g, "").slice(0, 5);
      const city = tags["addr:city"] || tags["addr:town"] || "";

      // Validate required fields
      if (!zipCode || zipCode.length !== 5) {
        console.log(`[sync-market-data] Skipping ${rawName} in ${city}: invalid ZIP`);
        continue;
      }

      if (!city) {
        console.log(`[sync-market-data] Skipping ${rawName} in ZIP ${zipCode}: missing city`);
        continue;
      }

      // Create unique key to prevent duplicates
      const storeKey = `${zipCode}-${storeName}-${lat.toFixed(4)}-${lon.toFixed(4)}`;
      if (seenStores.has(storeKey)) {
        continue; // Skip duplicate
      }
      seenStores.add(storeKey);

      // Calculate revenue with tier multiplier
      const baseRevenue = STORE_REVENUE[storeName];
      const isHighVolume = isHighVolumeCity(city);
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

      // Rate limiting: small delay every 50 stores
      if (competitors.length % 50 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`[sync-market-data] Processed ${competitors.length} target brand stores`);
    console.log(`[sync-market-data] Breakdown by brand:`);

    const brandCounts = competitors.reduce((acc, c) => {
      acc[c.store_name] = (acc[c.store_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(brandCounts).forEach(([brand, count]) => {
      console.log(`  - ${brand}: ${count} stores`);
    });

    // Upsert to database (with conflict resolution)
    if (competitors.length > 0) {
      const { error } = await supabase
        .from("competitors_market_data")
        .upsert(competitors, {
          onConflict: "zip_code,store_name",
          ignoreDuplicates: false, // Update existing records
        });

      if (error) {
        throw new Error(`Database upsert error: ${error.message}`);
      }

      console.log(`[sync-market-data] ✅ Successfully synced ${competitors.length} stores to database`);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        stores_synced: competitors.length,
        breakdown: brandCounts,
        timestamp: new Date().toISOString(),
        message: `Synced ${competitors.length} competitor stores from OpenStreetMap`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[sync-market-data] ❌ Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
