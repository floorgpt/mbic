#!/usr/bin/env node

/**
 * Test what the RPC would return if we removed the date filtering
 * This simulates the fixed RPC behavior
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("🧪 Testing Fixed RPC Behavior (without date filtering)\n");
console.log("=" .repeat(60));

// Simulate what the fixed RPC would return
console.log("\n📋 Simulating fixed RPC: Get ALL unconfirmed opportunities");

const { data, error } = await supabase
  .from("future_sale_opportunities")
  .select(`
    id,
    project_name,
    dealer_id,
    rep_id,
    expected_sku,
    expected_qty,
    expected_unit_price,
    probability_pct,
    expected_close_date,
    needed_by_date,
    status,
    ops_stock_confirmed,
    ops_confirmed_at,
    notes,
    created_at,
    customers_demo!dealer_id (dealer_name),
    sales_reps_demo!rep_id (rep_name)
  `)
  .eq("ops_stock_confirmed", false)
  .order("expected_close_date", { ascending: true, nullsFirst: false })
  .order("created_at", { ascending: false });

if (error) {
  console.error("❌ Query error:", error.message);
  process.exit(1);
}

console.log(`✅ Would return ${data?.length || 0} records\n`);

if (data && data.length > 0) {
  console.log("Records that would be shown:");

  const opportunities = data.map((row) => {
    const dealer = Array.isArray(row.customers_demo) ? row.customers_demo[0] : row.customers_demo;
    const rep = Array.isArray(row.sales_reps_demo) ? row.sales_reps_demo[0] : row.sales_reps_demo;

    const qty = Number(row.expected_qty ?? 0);
    const price = Number(row.expected_unit_price ?? 0);
    const potential_amount = qty * price;

    return {
      id: row.id,
      project_name: row.project_name,
      dealer_name: dealer?.dealer_name ?? "Unknown",
      rep_name: rep?.rep_name ?? "Unknown",
      expected_qty: qty,
      expected_unit_price: price,
      potential_amount,
      probability_pct: Number(row.probability_pct ?? 0),
      expected_close_date: row.expected_close_date,
      status: row.status ?? "open",
    };
  });

  // Calculate aggregates for the sales-ops card
  const totalQty = opportunities.reduce((sum, opp) => sum + opp.expected_qty, 0);
  const totalRevenue = opportunities.reduce((sum, opp) => sum + opp.potential_amount, 0);
  const openCount = opportunities.length;

  console.log("\n📊 Aggregated Summary (for sales-ops card):");
  console.log(`  Total Quantity: ${totalQty.toLocaleString()} SqFt`);
  console.log(`  Total Revenue Potential: $${totalRevenue.toLocaleString()}`);
  console.log(`  Open Opportunities: ${openCount}`);

  console.log("\n📋 Individual Opportunities:");
  opportunities.forEach((opp) => {
    console.log(`\n  ${opp.id}. ${opp.project_name}`);
    console.log(`     Rep: ${opp.rep_name} | Dealer: ${opp.dealer_name}`);
    console.log(`     Qty: ${opp.expected_qty.toLocaleString()} | Price: $${opp.expected_unit_price.toFixed(2)} | Amount: $${opp.potential_amount.toLocaleString()}`);
    console.log(`     Close Date: ${opp.expected_close_date || "TBD"} | Status: ${opp.status}`);
  });
}

console.log("\n" + "=".repeat(60));
console.log("✅ This is what the sales-ops card SHOULD show after migration\n");
