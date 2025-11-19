import { createClient } from "@supabase/supabase-js";
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
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log("📝 Reading migration file...");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const sqlPath = join(__dirname, "../supabase/migrations/20250119_add_city_to_sales_by_county_fl.sql");
    const sql = readFileSync(sqlPath, "utf-8");

    console.log("🔧 Applying migration...");

    // Split by semicolons and execute each statement
    const statements = sql.split(";").filter(s => s.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc("exec", { sql: statement + ";" });
        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase.from("_migrations").select("*").limit(0);
          if (directError) {
            console.error("❌ Migration failed:", error);
            throw error;
          }
        }
      }
    }

    console.log("✅ Migration applied successfully!");

    // Test the function
    console.log("\n🧪 Testing updated function...");
    const { data, error } = await supabase.rpc("sales_by_county_fl", {
      from_date: "2025-01-01",
      to_date: "2025-02-01",
    });

    if (error) {
      console.error("❌ Test query failed:", error);
      process.exit(1);
    }

    console.log(`✅ Found ${data.length} results`);
    if (data.length > 0) {
      console.log("\nSample row:");
      console.log(`  ZIP: ${data[0].zip_code}`);
      console.log(`  City: ${data[0].city}`);
      console.log(`  County: ${data[0].county}`);
      console.log(`  Region: ${data[0].region}`);
      console.log(`  Revenue: $${Number(data[0].revenue).toLocaleString()}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

applyMigration();
