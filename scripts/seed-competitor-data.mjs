import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, "../.env.local");
const envFile = readFileSync(envPath, "utf-8");
const envVars = {};
envFile.split("\n").forEach(line => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join("=").trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Revenue estimates by store brand (annual)
const STORE_REVENUE = {
  "Home Depot": 45_000_000,
  "Lowe's": 35_000_000,
  "Floor & Decor": 20_000_000,
};

// High-volume cities for tier multiplier (1.25x)
const HIGH_VOLUME_CITIES = [
  "Miami", "Doral", "Fort Lauderdale", "Hollywood", "Pembroke Pines",
  "Hialeah", "Orlando", "Tampa", "St. Petersburg", "Clearwater",
  "Jacksonville", "West Palm Beach", "Boca Raton", "Delray Beach",
];

function isHighVolumeCity(city) {
  return HIGH_VOLUME_CITIES.some(hvc =>
    city.toLowerCase().includes(hvc.toLowerCase())
  );
}

// Manually seed competitor data with real stores from OSM test results
// This is a POC - in production, would use full Overpass API sync
const seedStores = [
  // Home Depot - Miami
  {
    zip_code: "33133",
    store_name: "Home Depot",
    city: "Miami",
    latitude: 25.7360991,
    longitude: -80.2443239,
  },
  {
    zip_code: "33135",
    store_name: "Home Depot",
    city: "Miami",
    latitude: 25.7632678,
    longitude: -80.2437738,
  },
  // Home Depot - Spring Hill
  {
    zip_code: "34606",
    store_name: "Home Depot",
    city: "Spring Hill",
    latitude: 28.4998576,
    longitude: -82.5944676,
  },
  // Home Depot - Tampa area
  {
    zip_code: "33635",
    store_name: "Home Depot",
    city: "Tampa",
    latitude: 27.9962289,
    longitude: -82.5660766,
  },
  {
    zip_code: "33619",
    store_name: "Home Depot",
    city: "Tampa",
    latitude: 27.89351,
    longitude: -82.332964,
  },
  // Lowe's - Major cities (estimated locations for POC)
  {
    zip_code: "33156",
    store_name: "Lowe's",
    city: "Miami",
    latitude: 25.6718,
    longitude: -80.3152,
  },
  {
    zip_code: "33166",
    store_name: "Lowe's",
    city: "Miami",
    latitude: 25.8209,
    longitude: -80.3177,
  },
  {
    zip_code: "33176",
    store_name: "Lowe's",
    city: "Miami",
    latitude: 25.6415,
    longitude: -80.3496,
  },
  {
    zip_code: "32801",
    store_name: "Lowe's",
    city: "Orlando",
    latitude: 28.5383,
    longitude: -81.3792,
  },
  {
    zip_code: "33611",
    store_name: "Lowe's",
    city: "Tampa",
    latitude: 27.9306,
    longitude: -82.5112,
  },
  // Floor & Decor - Major cities
  {
    zip_code: "33122",
    store_name: "Floor & Decor",
    city: "Doral",
    latitude: 25.8140,
    longitude: -80.3659,
  },
  {
    zip_code: "33312",
    store_name: "Floor & Decor",
    city: "Fort Lauderdale",
    latitude: 26.1224,
    longitude: -80.1373,
  },
  {
    zip_code: "32819",
    store_name: "Floor & Decor",
    city: "Orlando",
    latitude: 28.4813,
    longitude: -81.4505,
  },
  {
    zip_code: "33607",
    store_name: "Floor & Decor",
    city: "Tampa",
    latitude: 27.9478,
    longitude: -82.5128,
  },
];

async function seedData() {
  console.log("🌱 Seeding Competitor Data");
  console.log("==========================");
  console.log("");
  console.log(`📊 Preparing to seed ${seedStores.length} stores`);
  console.log("");

  // Calculate revenue for each store
  const competitorsWithRevenue = seedStores.map(store => {
    const baseRevenue = STORE_REVENUE[store.store_name];
    const isHighVolume = isHighVolumeCity(store.city);
    const tierMultiplier = isHighVolume ? 1.25 : 0.9;
    const estRevenue = baseRevenue * tierMultiplier;

    return {
      ...store,
      store_type: "Big Box",
      est_annual_revenue: estRevenue,
      tier_multiplier: tierMultiplier,
    };
  });

  // Group by brand for display
  const brandCounts = competitorsWithRevenue.reduce((acc, c) => {
    acc[c.store_name] = (acc[c.store_name] || 0) + 1;
    return acc;
  }, {});

  console.log("📈 Breakdown by brand:");
  Object.entries(brandCounts).forEach(([brand, count]) => {
    console.log(`  - ${brand}: ${count} stores`);
  });
  console.log("");

  // Insert to database (simple insert since table is empty)
  console.log("💾 Inserting data into competitors_market_data table...");

  const { data, error } = await supabase
    .from("competitors_market_data")
    .insert(competitorsWithRevenue)
    .select();

  if (error) {
    console.error("❌ Error inserting data:", error);
    return;
  }

  console.log(`✅ Successfully seeded ${competitorsWithRevenue.length} stores`);
  console.log("");

  // Verify data
  const { data: verifyData, error: verifyError } = await supabase
    .from("competitors_market_data")
    .select("*", { count: "exact", head: true });

  if (!verifyError) {
    console.log("🔍 Verification:");
    console.log(`  Total stores in database: ${verifyData?.length || 0}`);
  }

  console.log("");
  console.log("💡 Next steps:");
  console.log("  1. Refresh your Florida Sales by ZIP Code map");
  console.log("  2. Toggle the 'Gaps' button to see red circles");
  console.log("  3. Click a red circle to view gap details");
  console.log("  4. Test the AI chat assistant");
  console.log("");
}

seedData();
