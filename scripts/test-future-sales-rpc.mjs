#!/usr/bin/env node

/**
 * Diagnostic script to test list_future_sale_opps_open RPC function
 * Tests if the RPC is returning data from future_sale_opportunities table
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("🔍 Testing Future Sales RPC Function\n");
console.log("=" .repeat(60));

// Test 1: Check if table has data
console.log("\n📋 Test 1: Check future_sale_opportunities table");
const { data: tableData, error: tableError } = await supabase
  .from("future_sale_opportunities")
  .select("*")
  .limit(5);

if (tableError) {
  console.error("❌ Table query error:", tableError.message);
} else {
  console.log(`✅ Table has ${tableData?.length || 0} records`);
  if (tableData && tableData.length > 0) {
    console.log("Sample record:", JSON.stringify(tableData[0], null, 2));
  }
}

// Test 2: Check RPC with YTD date range (2025-01-01 to today)
const today = new Date();
const ytdFrom = `${today.getFullYear()}-01-01`;
const todayStr = today.toISOString().split("T")[0];

console.log("\n📋 Test 2: Call RPC with YTD range");
console.log(`Date range: ${ytdFrom} to ${todayStr}`);

const { data: rpcData, error: rpcError } = await supabase.rpc("list_future_sale_opps_open", {
  from_date: ytdFrom,
  to_date: todayStr,
});

if (rpcError) {
  console.error("❌ RPC error:", rpcError.message);
  console.error("Full error:", rpcError);
} else {
  console.log(`✅ RPC returned ${rpcData?.length || 0} records`);
  if (rpcData && rpcData.length > 0) {
    console.log("Sample RPC result:", JSON.stringify(rpcData[0], null, 2));
  } else {
    console.log("⚠️  No records returned by RPC");
  }
}

// Test 3: Check with very wide date range
console.log("\n📋 Test 3: Call RPC with wide date range (2024-01-01 to 2026-12-31)");

const { data: wideData, error: wideError } = await supabase.rpc("list_future_sale_opps_open", {
  from_date: "2024-01-01",
  to_date: "2026-12-31",
});

if (wideError) {
  console.error("❌ RPC error:", wideError.message);
} else {
  console.log(`✅ RPC returned ${wideData?.length || 0} records`);
  if (wideData && wideData.length > 0) {
    console.log("Sample RPC result:", JSON.stringify(wideData[0], null, 2));
  }
}

// Test 4: Check for unconfirmed opportunities
console.log("\n📋 Test 4: Check unconfirmed opportunities in table");
const { data: unconfirmed, error: unconfirmedError } = await supabase
  .from("future_sale_opportunities")
  .select("id, project_name, ops_stock_confirmed, expected_close_date, created_at")
  .eq("ops_stock_confirmed", false);

if (unconfirmedError) {
  console.error("❌ Query error:", unconfirmedError.message);
} else {
  console.log(`✅ Found ${unconfirmed?.length || 0} unconfirmed opportunities`);
  if (unconfirmed && unconfirmed.length > 0) {
    console.log("Unconfirmed records:");
    unconfirmed.forEach((rec) => {
      console.log(`  - ID ${rec.id}: ${rec.project_name} (close: ${rec.expected_close_date || "NULL"}, created: ${rec.created_at})`);
    });
  }
}

console.log("\n" + "=".repeat(60));
console.log("🏁 Diagnostic complete\n");
