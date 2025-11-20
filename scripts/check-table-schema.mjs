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

async function checkSchema() {
  console.log("🔍 Checking competitors_market_data table schema");
  console.log("=================================================");
  console.log("");

  // Try to query the table to see all columns
  const { data, error } = await supabase
    .from("competitors_market_data")
    .select("*")
    .limit(1);

  if (error) {
    console.log("❌ Error querying table:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("📋 Columns found in table:");
    console.log(Object.keys(data[0]));
  } else {
    console.log("⚠️  Table is empty, trying to inspect metadata...");

    // Try inserting a test row to see what columns are expected
    const testRow = {
      zip_code: "00000",
      store_name: "Test",
      store_type: "Big Box",
      city: "Test City",
      est_annual_revenue: 0,
      tier_multiplier: 1.0,
      latitude: 0,
      longitude: 0,
    };

    const { error: insertError } = await supabase
      .from("competitors_market_data")
      .insert([testRow]);

    if (insertError) {
      console.log("❌ Insert error (this helps us understand schema):");
      console.log(JSON.stringify(insertError, null, 2));
    }
  }
}

checkSchema();
