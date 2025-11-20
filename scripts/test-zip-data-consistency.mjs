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
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testZipDataConsistency() {
  const testZip = "33166";
  const fromDate = "2025-01-01";
  const toDate = "2025-10-01";

  console.log("🧪 Testing ZIP Code Data Consistency");
  console.log("=====================================");
  console.log(`ZIP: ${testZip}`);
  console.log(`Date Range: ${fromDate} to ${toDate}`);
  console.log("");

  // Test 1: sales_by_zip_fl (OG Map - Aggregate data)
  console.log("📊 Test 1: sales_by_zip_fl (OG Map)");
  console.log("-----------------------------------");
  const { data: zipData, error: zipError } = await supabase.rpc("sales_by_zip_fl", {
    from_date: fromDate,
    to_date: toDate,
    p_category: null,
    p_collection: null,
  });

  if (zipError) {
    console.error("❌ Error:", zipError);
    process.exit(1);
  }

  const zip33166Data = zipData.find(row => row.zip_code === testZip);
  if (zip33166Data) {
    console.log(`✅ Found ZIP ${testZip} in sales_by_zip_fl:`);
    console.log(`   Revenue: $${Number(zip33166Data.revenue).toLocaleString()}`);
    console.log(`   Dealer Count: ${zip33166Data.dealer_count}`);
    console.log(`   Order Count: ${zip33166Data.order_count}`);
  } else {
    console.log(`❌ ZIP ${testZip} NOT found in sales_by_zip_fl`);
  }

  console.log("");

  // Test 2: dealers_by_zip_fl (Regional Map - Detailed dealer list)
  console.log("📊 Test 2: dealers_by_zip_fl (Regional Map)");
  console.log("--------------------------------------------");
  const { data: dealerData, error: dealerError } = await supabase.rpc("dealers_by_zip_fl", {
    p_zip_code: testZip,
    from_date: fromDate,
    to_date: toDate,
  });

  if (dealerError) {
    console.error("❌ Error:", dealerError);
    process.exit(1);
  }

  if (dealerData && dealerData.length > 0) {
    console.log(`✅ Found ${dealerData.length} dealers in ZIP ${testZip}:`);

    // Calculate totals from dealer list
    const totalRevenue = dealerData.reduce((sum, dealer) => sum + Number(dealer.revenue), 0);
    const totalOrders = dealerData.reduce((sum, dealer) => sum + Number(dealer.order_count), 0);
    const uniqueDealers = new Set(dealerData.map(d => d.customer_id)).size;

    console.log(`   Total Revenue: $${totalRevenue.toLocaleString()}`);
    console.log(`   Unique Dealers: ${uniqueDealers}`);
    console.log(`   Total Orders: ${totalOrders}`);

    console.log("\n   Top 3 Dealers:");
    dealerData.slice(0, 3).forEach((dealer, idx) => {
      console.log(`   ${idx + 1}. ${dealer.dealer_name}`);
      console.log(`      Revenue: $${Number(dealer.revenue).toLocaleString()}`);
      console.log(`      Orders: ${dealer.order_count}`);
      console.log(`      Sales Rep: ${dealer.sales_rep}`);
    });
  } else {
    console.log(`❌ No dealers found in ZIP ${testZip}`);
  }

  console.log("");

  // Comparison
  console.log("🔍 Data Consistency Check");
  console.log("-------------------------");

  if (zip33166Data && dealerData && dealerData.length > 0) {
    const totalRevenue = dealerData.reduce((sum, dealer) => sum + Number(dealer.revenue), 0);
    const totalOrders = dealerData.reduce((sum, dealer) => sum + Number(dealer.order_count), 0);
    const uniqueDealers = new Set(dealerData.map(d => d.customer_id)).size;

    const revenueMatch = Math.abs(Number(zip33166Data.revenue) - totalRevenue) < 0.01;
    const dealerMatch = zip33166Data.dealer_count === uniqueDealers;
    const orderMatch = zip33166Data.order_count === totalOrders;

    console.log(`Revenue Match: ${revenueMatch ? '✅' : '❌'}`);
    console.log(`  OG Map: $${Number(zip33166Data.revenue).toLocaleString()}`);
    console.log(`  Regional Map Sum: $${totalRevenue.toLocaleString()}`);
    console.log(`  Difference: $${Math.abs(Number(zip33166Data.revenue) - totalRevenue).toFixed(2)}`);

    console.log(`\nDealer Count Match: ${dealerMatch ? '✅' : '❌'}`);
    console.log(`  OG Map: ${zip33166Data.dealer_count}`);
    console.log(`  Regional Map: ${uniqueDealers}`);

    console.log(`\nOrder Count Match: ${orderMatch ? '✅' : '❌'}`);
    console.log(`  OG Map: ${zip33166Data.order_count}`);
    console.log(`  Regional Map: ${totalOrders}`);

    if (revenueMatch && dealerMatch && orderMatch) {
      console.log("\n🎉 All metrics match! Data is consistent.");
    } else {
      console.log("\n⚠️  Data inconsistency detected!");
    }
  } else {
    console.log("❌ Cannot compare - data missing from one or both RPCs");
  }

  console.log("");
  process.exit(0);
}

testZipDataConsistency();
