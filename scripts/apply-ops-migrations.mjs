#!/usr/bin/env node

/**
 * Apply Operations Hub migrations directly to Supabase
 * This bypasses the CLI migration tracking to apply specific SQL
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migrations = [
  "supabase/migrations/20250111_create_incoming_stock_table.sql",
  "supabase/migrations/20250111_update_future_opps_rpc_v2.sql",
  "supabase/migrations/20250111_update_incoming_stock_rpc.sql",
];

console.log("🚀 Applying Operations Hub Migrations\n");
console.log("=" .repeat(60));

for (const migrationPath of migrations) {
  console.log(`\n📝 Applying: ${migrationPath}`);

  try {
    const fullPath = join(rootDir, migrationPath);
    const sql = readFileSync(fullPath, "utf-8");

    // Execute the SQL directly
    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql }).single();

    if (error) {
      // Try alternative approach - use the REST API directly
      console.log("  Trying direct SQL execution...");

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ sql_query: sql }),
      });

      if (!response.ok) {
        // Final approach: Split by statement and execute each
        console.log("  Trying statement-by-statement execution...");

        const statements = sql
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith("--"));

        for (const statement of statements) {
          if (statement.length === 0) continue;

          const { error: stmtError } = await supabase.rpc("exec_sql", {
            sql_query: statement + ";"
          });

          if (stmtError) {
            throw new Error(`Statement failed: ${stmtError.message}`);
          }
        }
      }
    }

    console.log(`  ✅ Applied successfully`);
  } catch (err) {
    console.error(`  ❌ Failed:`, err.message);
    console.error(`  Full error:`, err);
    process.exit(1);
  }
}

console.log("\n" + "=".repeat(60));
console.log("✅ All migrations applied successfully!\n");

// Test the RPC
console.log("🧪 Testing updated RPC...\n");

const today = new Date();
const ytdFrom = `${today.getFullYear()}-01-01`;
const todayStr = today.toISOString().split("T")[0];

const { data: rpcData, error: rpcError } = await supabase.rpc("list_future_sale_opps_open", {
  from_date: ytdFrom,
  to_date: todayStr,
});

if (rpcError) {
  console.error("❌ RPC test failed:", rpcError.message);
} else {
  console.log(`✅ RPC test passed: ${rpcData?.length || 0} records returned`);
  if (rpcData && rpcData.length > 0) {
    console.log("\nSample record:");
    console.log(JSON.stringify(rpcData[0], null, 2));
  }
}

console.log("\n🏁 Done!\n");
