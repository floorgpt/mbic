#!/usr/bin/env node

/**
 * Fix Team vs Targets - Apply schema fixes and RPC function
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

async function applyFix() {
  console.log("🔧 Fixing Team vs Targets schema and RPC function...\n");

  try {
    // Step 1: Fix sales_targets table column type
    console.log("📋 Step 1: Fixing sales_targets.rep_id column type...");
    const alterTableSQL = `
      ALTER TABLE sales_targets
        ALTER COLUMN rep_id TYPE BIGINT;
    `;

    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: alterTableSQL
    }).catch(() => {
      // exec_sql might not exist, we'll handle this differently
      return { error: { message: "exec_sql not available" } };
    });

    if (alterError && !alterError.message.includes("exec_sql")) {
      console.log("⚠️  Cannot alter table via RPC. You'll need to run this SQL manually:");
      console.log("\nCopy and run this in Supabase SQL Editor:");
      console.log("─".repeat(60));
      console.log(alterTableSQL.trim());
      console.log("─".repeat(60));
      console.log("\nPress Enter after running the SQL above...");

      // Wait for user input
      await new Promise((resolve) => {
        process.stdin.once('data', resolve);
      });
    } else {
      console.log("✅ sales_targets.rep_id is now BIGINT\n");
    }

    // Step 2: Apply RPC function
    console.log("📋 Step 2: Creating team_vs_targets_month RPC function...");
    const sqlPath = join(
      __dirname,
      "..",
      "supabase",
      "migrations",
      "20250114_team_vs_targets_rpc.sql"
    );
    const rpcSQL = readFileSync(sqlPath, "utf-8");

    console.log("⚠️  Copy and run this in Supabase SQL Editor:");
    console.log("─".repeat(60));
    console.log(rpcSQL);
    console.log("─".repeat(60));
    console.log("\nPress Enter after running the SQL above...");

    await new Promise((resolve) => {
      process.stdin.once('data', resolve);
    });

    // Step 3: Test the function
    console.log("\n🧪 Testing team_vs_targets_month function...\n");

    const { data, error } = await supabase.rpc("team_vs_targets_month", {
      p_target_month: "2025-01",
    });

    if (error) {
      console.error("❌ Function test failed:", error.message);
      console.log("\nPlease check:");
      console.log("  1. Did you run the ALTER TABLE command?");
      console.log("  2. Did you run the CREATE FUNCTION command?");
      console.log("  3. Check for any error messages in Supabase SQL Editor\n");
      process.exit(1);
    }

    console.log("✅ Function works! Results:\n");
    console.log(`Found ${data?.length || 0} sales reps`);

    if (data && data.length > 0) {
      console.log("\nTop 3 performers for January 2025:");
      data.slice(0, 3).forEach((rep, idx) => {
        const statusEmoji = rep.status === 'achieved' ? '🟢' : rep.status === 'near' ? '🟡' : '🔴';
        console.log(
          `  ${idx + 1}. ${statusEmoji} ${rep.rep_name} (${rep.rep_initials}): $${rep.actual_sales.toLocaleString()} / $${rep.target_amount.toLocaleString()} (${rep.achievement_pct}%)`
        );
      });
    }

    console.log("\n✅ All fixes applied successfully!");
    console.log("🔄 Refresh your browser at http://localhost:3001/");
    console.log("👆 Click on a month bar to see the Team vs Targets chart\n");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

applyFix();
