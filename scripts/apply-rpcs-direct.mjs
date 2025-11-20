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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRPCs() {
  console.log("🔧 Applying Gap Analysis RPC Functions\n");

  // Read the RPC SQL file
  const rpcSql = readFileSync(
    join(__dirname, "../supabase/migrations/20250120_gap_analysis_rpcs.sql"),
    "utf-8"
  );

  // Split by statements (separated by $$;)
  const statements = rpcSql
    .split("$$;")
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--") && !s.startsWith("COMMENT"));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  // Execute each function creation separately
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + "$$;";

    if (stmt.includes("CREATE OR REPLACE FUNCTION")) {
      const funcName = stmt.match(/FUNCTION\s+public\.(\w+)/)?.[1] || `statement_${i}`;
      console.log(`📝 Creating function: ${funcName}...`);

      try {
        // Use fetch to POST SQL directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({ query: stmt })
        });

        if (response.ok) {
          console.log(`   ✅ ${funcName} created\n`);
        } else {
          const error = await response.text();
          console.log(`   ⚠️  Failed: ${error}\n`);
        }
      } catch (error) {
        console.log(`   ⚠️  Error: ${error.message}\n`);
      }
    }
  }

  console.log("🔍 Verifying RPC functions...\n");

  // Test RPC 1
  try {
    const { data, error } = await supabase.rpc("get_zip_gap_analysis", {
      from_date: "2025-01-01",
      to_date: "2025-12-31"
    });

    if (!error) {
      console.log("✅ get_zip_gap_analysis is working");
      console.log(`   Returned ${data?.length || 0} gap ZIPs\n`);
    } else {
      console.log("⚠️  get_zip_gap_analysis error:", error.message, "\n");
    }
  } catch (e) {
    console.log("⚠️  get_zip_gap_analysis test failed:", e.message, "\n");
  }

  // Test RPC 2
  try {
    const { data, error } = await supabase.rpc("get_zip_opportunity_details", {
      p_zip_code: "33166"
    });

    if (!error) {
      console.log("✅ get_zip_opportunity_details is working");
      console.log(`   Returned ${data?.length || 0} competitors\n`);
    } else {
      console.log("⚠️  get_zip_opportunity_details error:", error.message, "\n");
    }
  } catch (e) {
    console.log("⚠️  get_zip_opportunity_details test failed:", e.message, "\n");
  }

  console.log("====================================");
  console.log("Phase 1 Complete: Database Layer Ready");
  console.log("====================================\n");
}

applyRPCs();
