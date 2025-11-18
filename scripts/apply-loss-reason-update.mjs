#!/usr/bin/env node

/**
 * Apply loss_reason update migration
 * Updates "cancelled" to "color_not_exist" in loss_opportunities table
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
  console.log("📋 Applying loss_reason update migration...\n");

  try {
    // Read the SQL file
    const sqlPath = join(
      __dirname,
      "..",
      "supabase",
      "migrations",
      "20250114_update_loss_reason_cancelled_to_color_not_exist.sql"
    );
    const sql = readFileSync(sqlPath, "utf-8");

    // Execute the migration
    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log("⚠️  exec_sql RPC not found, trying direct execution...\n");

      const { error: directError } = await supabase.from("loss_opportunities").select("count");

      if (directError) {
        throw directError;
      }

      // Since we can't execute raw SQL directly, let's use the Supabase client
      console.log("✓ Updating records with cancelled reason to color_not_exist...");

      const { data: updateData, error: updateError } = await supabase
        .from("loss_opportunities")
        .update({ lost_reason: "color_not_exist" })
        .eq("lost_reason", "cancelled")
        .select();

      if (updateError) {
        throw updateError;
      }

      console.log(`✓ Updated ${updateData?.length || 0} records\n`);

      // Get current count
      const { count, error: countError } = await supabase
        .from("loss_opportunities")
        .select("*", { count: "exact", head: true })
        .eq("lost_reason", "color_not_exist");

      if (countError) {
        console.warn("⚠️  Could not get count:", countError.message);
      } else {
        console.log(`📊 Total color_not_exist records: ${count}\n`);
      }
    } else {
      console.log("✓ Migration applied successfully!\n");
      console.log("Result:", data);
    }

    console.log("✅ Loss reason update completed successfully!");

  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

applyMigration();
