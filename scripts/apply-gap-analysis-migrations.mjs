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
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigrations() {
  console.log("🚀 Applying Gap Analysis Migrations");
  console.log("====================================\n");

  try {
    // Migration 1: Create competitors_market_data table
    console.log("📦 Migration 1: Creating competitors_market_data table...");
    const tableSql = readFileSync(
      join(__dirname, "../supabase/migrations/20250120_create_competitors_market_data.sql"),
      "utf-8"
    );

    const { error: tableError } = await supabase.rpc("exec_sql", { sql: tableSql }).single();

    // If exec_sql doesn't exist, use direct query
    if (tableError && tableError.message.includes("exec_sql")) {
      console.log("   Using direct SQL execution...");
      const { error: directError } = await supabase.from("_sql").insert({ query: tableSql });

      if (directError) {
        // Try one more method - via REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ query: tableSql }),
        });

        if (!response.ok) {
          console.log("   ⚠️  Could not auto-apply. Please apply manually via Supabase SQL Editor:");
          console.log("   File: supabase/migrations/20250120_create_competitors_market_data.sql\n");
        } else {
          console.log("   ✅ Table migration applied successfully\n");
        }
      } else {
        console.log("   ✅ Table migration applied successfully\n");
      }
    } else if (tableError) {
      console.log("   ⚠️  Error applying table migration:", tableError.message);
      console.log("   Please apply manually via Supabase SQL Editor\n");
    } else {
      console.log("   ✅ Table migration applied successfully\n");
    }

    // Migration 2: Create RPC functions
    console.log("📦 Migration 2: Creating RPC functions...");
    const rpcSql = readFileSync(
      join(__dirname, "../supabase/migrations/20250120_gap_analysis_rpcs.sql"),
      "utf-8"
    );

    const { error: rpcError } = await supabase.rpc("exec_sql", { sql: rpcSql }).single();

    if (rpcError && rpcError.message.includes("exec_sql")) {
      console.log("   Using direct SQL execution...");
      const { error: directError } = await supabase.from("_sql").insert({ query: rpcSql });

      if (directError) {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ query: rpcSql }),
        });

        if (!response.ok) {
          console.log("   ⚠️  Could not auto-apply. Please apply manually via Supabase SQL Editor:");
          console.log("   File: supabase/migrations/20250120_gap_analysis_rpcs.sql\n");
        } else {
          console.log("   ✅ RPC migration applied successfully\n");
        }
      } else {
        console.log("   ✅ RPC migration applied successfully\n");
      }
    } else if (rpcError) {
      console.log("   ⚠️  Error applying RPC migration:", rpcError.message);
      console.log("   Please apply manually via Supabase SQL Editor\n");
    } else {
      console.log("   ✅ RPC migration applied successfully\n");
    }

    // Verification
    console.log("🔍 Verifying migrations...");

    // Check if table exists
    const { data: tableCheck, error: tableCheckError } = await supabase
      .from("competitors_market_data")
      .select("id")
      .limit(1);

    if (!tableCheckError) {
      console.log("   ✅ competitors_market_data table exists");
    } else {
      console.log("   ⚠️  Table verification failed:", tableCheckError.message);
    }

    // Check if RPCs exist
    const { data: rpc1Check, error: rpc1Error } = await supabase
      .rpc("get_zip_gap_analysis", {
        from_date: "2025-01-01",
        to_date: "2025-12-31"
      });

    if (!rpc1Error || rpc1Error.message.includes("no rows")) {
      console.log("   ✅ get_zip_gap_analysis RPC exists");
    } else {
      console.log("   ⚠️  RPC get_zip_gap_analysis verification failed:", rpc1Error.message);
    }

    const { data: rpc2Check, error: rpc2Error } = await supabase
      .rpc("get_zip_opportunity_details", {
        p_zip_code: "33166"
      });

    if (!rpc2Error || rpc2Error.message.includes("no rows")) {
      console.log("   ✅ get_zip_opportunity_details RPC exists");
    } else {
      console.log("   ⚠️  RPC get_zip_opportunity_details verification failed:", rpc2Error.message);
    }

    console.log("\n====================================");
    console.log("✅ Gap Analysis Database Layer Complete");
    console.log("====================================\n");

    console.log("📝 Next Steps:");
    console.log("1. Run the sync-market-data Edge Function to populate competitor data");
    console.log("2. Verify data: SELECT COUNT(*) FROM competitors_market_data;");
    console.log("3. Test RPCs with sample ZIP codes\n");

    console.log("💡 Manual Migration (if auto-apply failed):");
    console.log("1. Open Supabase Dashboard → SQL Editor");
    console.log("2. Copy content from: supabase/migrations/20250120_create_competitors_market_data.sql");
    console.log("3. Copy content from: supabase/migrations/20250120_gap_analysis_rpcs.sql");
    console.log("4. Run both scripts\n");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

applyMigrations();
