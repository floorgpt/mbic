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

async function testCompetitorData() {
  console.log("🔍 Testing Competitor Data in Database");
  console.log("======================================");
  console.log("");

  // Check total count
  const { data: countData, error: countError } = await supabase
    .from("competitors_market_data")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("❌ Error querying database:", countError);
    return;
  }

  console.log("📊 Total stores in database:", countData?.length || 0);
  console.log("");

  // Get breakdown by brand
  const { data: stores, error: storesError } = await supabase
    .from("competitors_market_data")
    .select("store_name, store_type, city, zip_code, est_annual_revenue");

  if (storesError) {
    console.error("❌ Error fetching stores:", storesError);
    return;
  }

  if (!stores || stores.length === 0) {
    console.log("⚠️  No stores found in database");
    console.log("");
    console.log("💡 This could mean:");
    console.log("   1. OpenStreetMap query didn't find any stores");
    console.log("   2. All stores were filtered out (missing ZIP/city data)");
    console.log("   3. Store names didn't match target brands");
    console.log("");
    console.log("🔧 Let's test the Overpass API directly...");
    console.log("");
    return;
  }

  // Group by brand
  const brandCounts = stores.reduce((acc, store) => {
    acc[store.store_name] = (acc[store.store_name] || 0) + 1;
    return acc;
  }, {});

  console.log("📈 Breakdown by brand:");
  Object.entries(brandCounts).forEach(([brand, count]) => {
    console.log(`  - ${brand}: ${count} stores`);
  });
  console.log("");

  // Show sample data
  console.log("📋 Sample stores (first 5):");
  stores.slice(0, 5).forEach((store, idx) => {
    console.log(`  ${idx + 1}. ${store.store_name} - ${store.city}, ZIP ${store.zip_code}`);
    console.log(`     Revenue: $${(store.est_annual_revenue / 1_000_000).toFixed(1)}M`);
  });
  console.log("");
}

testCompetitorData();
