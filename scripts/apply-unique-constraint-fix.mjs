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

async function applyMigration() {
  console.log("🔧 Applying unique constraint fix migration");
  console.log("==========================================");
  console.log("");

  // Read migration file
  const migrationPath = join(__dirname, "../supabase/migrations/20250120_fix_unique_constraint.sql");
  const migrationSQL = readFileSync(migrationPath, "utf-8");

  console.log("📄 Migration file: 20250120_fix_unique_constraint.sql");
  console.log("");

  try {
    // Execute migration via RPC (using raw SQL)
    const { data, error } = await supabase.rpc("exec_sql", {
      sql_string: migrationSQL,
    });

    if (error) {
      // Try direct query method if RPC doesn't exist
      console.log("⚠️  RPC method not available, trying direct query...");
      const { data: queryData, error: queryError } = await supabase
        .from("_supabase_migrations")
        .select("*");

      // Use a workaround: create via JavaScript client
      console.log("📝 Applying constraint directly...");

      const constraintSQL = `
        ALTER TABLE public.competitors_market_data
        ADD CONSTRAINT IF NOT EXISTS unique_zip_store UNIQUE (zip_code, store_name);
      `;

      // Since we can't execute raw SQL directly, let's inform the user
      console.log("");
      console.log("⚠️  Unable to apply migration via Supabase client");
      console.log("");
      console.log("Please run this SQL manually in Supabase SQL Editor:");
      console.log("─".repeat(60));
      console.log(migrationSQL);
      console.log("─".repeat(60));
      console.log("");
      console.log("Or run: npx supabase db push --project-ref sqhqzrtmjspwqqhnjtss");
      console.log("");

      return;
    }

    console.log("✅ Migration applied successfully");
    console.log("");

  } catch (err) {
    console.error("❌ Error applying migration:", err.message);
    console.log("");
    console.log("Please run the migration manually via Supabase dashboard:");
    console.log(migrationSQL);
    console.log("");
  }
}

applyMigration();
