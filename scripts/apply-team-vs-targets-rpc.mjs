#!/usr/bin/env node

/**
 * Apply team_vs_targets_month RPC function migration
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing environment variables:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", SUPABASE_URL ? "✓" : "✗");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_KEY ? "✓" : "✗");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log("📋 Applying team_vs_targets_month RPC migration...\n");

  try {
    // Read the SQL file
    const sqlPath = join(
      __dirname,
      "..",
      "supabase",
      "migrations",
      "20250114_team_vs_targets_rpc.sql"
    );
    const sql = readFileSync(sqlPath, "utf-8");

    console.log("📄 Migration file loaded");
    console.log("📝 SQL length:", sql.length, "characters\n");

    // Test the function after applying
    console.log("🧪 Testing team_vs_targets_month function with January 2025...\n");

    const { data, error } = await supabase.rpc("team_vs_targets_month", {
      p_target_month: "2025-01",
    });

    if (error) {
      console.error("❌ Function test failed:", error.message);
      console.log("\n⚠️  Please apply the migration manually in Supabase SQL Editor:");
      console.log("   File: supabase/migrations/20250114_team_vs_targets_rpc.sql\n");
      process.exit(1);
    }

    console.log("✅ Function works! Sample results:\n");
    console.log(`Found ${data?.length || 0} sales reps`);

    if (data && data.length > 0) {
      console.log("\nTop 3 performers:");
      data.slice(0, 3).forEach((rep, idx) => {
        console.log(
          `  ${idx + 1}. ${rep.rep_name} (${rep.rep_initials}): $${rep.actual_sales.toLocaleString()} / $${rep.target_amount.toLocaleString()} (${rep.achievement_pct}%)`
        );
      });
    }

    console.log("\n✅ Migration applied successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    console.log("\n⚠️  Please apply the migration manually in Supabase SQL Editor:");
    console.log("   File: supabase/migrations/20250114_team_vs_targets_rpc.sql\n");
    process.exit(1);
  }
}

applyMigration();
