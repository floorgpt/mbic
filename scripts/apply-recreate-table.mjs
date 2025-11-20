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
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("🔧 Recreating competitors_market_data table");
console.log("============================================");
console.log("");

// Read migration file
const migrationPath = join(__dirname, "../supabase/migrations/20250120_recreate_competitors_table.sql");
const migrationSQL = readFileSync(migrationPath, "utf-8");

console.log("📄 Migration: 20250120_recreate_competitors_table.sql");
console.log("");
console.log("⚠️  This migration will DROP and recreate the table");
console.log("");
console.log("📝 Please run this SQL manually in Supabase SQL Editor:");
console.log("   https://supabase.com/dashboard/project/sqhqzrtmjspwqqhnjtss/sql/new");
console.log("");
console.log("─".repeat(80));
console.log(migrationSQL);
console.log("─".repeat(80));
console.log("");
console.log("💡 After running the SQL, execute: node scripts/seed-competitor-data.mjs");
console.log("");
