import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables from .env.local
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

async function testSyncMarketData() {
  console.log("🧪 Testing sync-market-data Edge Function");
  console.log("==========================================");
  console.log("");
  console.log("📍 Function URL:", `${supabaseUrl}/functions/v1/sync-market-data`);
  console.log("");
  console.log("⏳ Calling function (this may take 60-120 seconds)...");
  console.log("");

  const startTime = Date.now();

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/sync-market-data`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Function failed with status ${response.status}:`, errorText);
      process.exit(1);
    }

    const result = await response.json();

    console.log("✅ Function completed successfully!");
    console.log("");
    console.log("📊 Results:");
    console.log("  Stores synced:", result.stores_synced);
    console.log("  Timestamp:", result.timestamp);
    console.log("  Duration:", `${elapsed}s`);
    console.log("");

    if (result.breakdown) {
      console.log("📈 Breakdown by brand:");
      Object.entries(result.breakdown).forEach(([brand, count]) => {
        console.log(`  - ${brand}: ${count} stores`);
      });
      console.log("");
    }

    console.log("💡 Next steps:");
    console.log("  1. Refresh your Florida Sales by ZIP Code map");
    console.log("  2. Toggle the 'Gaps' button to see red circles");
    console.log("  3. Click a red circle to view gap details");
    console.log("");

  } catch (error) {
    console.error("❌ Error calling function:", error);
    process.exit(1);
  }
}

testSyncMarketData();
