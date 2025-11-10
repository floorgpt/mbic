#!/usr/bin/env node
/**
 * Test Sales Ops RPC functions with the EXACT date range the production page uses
 * This mimics what the frontend is calling with today's date
 */

import { createClient } from '@supabase/supabase-js';

// Check environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Calculate EXACT date range that production frontend uses
// Mimics lines 226-237 from app/(dashboard)/sales-ops/page.tsx
function toISODate(date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

const todayDate = new Date();
const ytdFrom = toISODate(new Date(todayDate.getFullYear(), 0, 1)); // Jan 1 of current year
const todayIso = toISODate(todayDate);

console.log('\n🔍 Testing Production Sales Ops Date Range\n');
console.log('═'.repeat(80));
console.log(`Today's Date: ${todayIso}`);
console.log(`YTD Start: ${ytdFrom}`);
console.log(`Query Range: ${ytdFrom} to ${todayIso}\n`);
console.log('This matches the EXACT date range the production page uses by default.\n');
console.log('─'.repeat(80));

// Test the two critical RPC functions that power the main cards
const criticalTests = [
  {
    name: 'sales_ops_category_kpis',
    purpose: 'Powers "Gross Revenue" card',
    showSample: true,
  },
  {
    name: 'sales_ops_kpis_by_collection',
    purpose: 'Powers "Top Collections" card',
    showSample: true,
  },
];

console.log('\n📊 Critical RPC Functions (Must Work for Page to Show Data):\n');

let allSuccess = true;

for (const test of criticalTests) {
  try {
    const { data, error } = await supabase.rpc(test.name, {
      from_date: ytdFrom,
      to_date: todayIso,
    });

    if (error) {
      console.log(`❌ ${test.name}`);
      console.log(`   Purpose: ${test.purpose}`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Details: ${JSON.stringify(error, null, 2)}`);
      console.log('');
      allSuccess = false;
    } else {
      const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
      console.log(`✅ ${test.name}`);
      console.log(`   Purpose: ${test.purpose}`);
      console.log(`   Rows: ${count}`);

      if (test.showSample && Array.isArray(data) && data.length > 0) {
        console.log(`   Sample data:`);
        const sample = data.slice(0, 3);
        sample.forEach((row, idx) => {
          console.log(`   ${idx + 1}. ${JSON.stringify(row)}`);
        });
      }

      // Calculate totals for category KPIs
      if (test.name === 'sales_ops_category_kpis' && Array.isArray(data)) {
        const totalRevenue = data.reduce((sum, row) => sum + (row.gross_revenue || 0), 0);
        console.log(`   📈 Total Revenue: $${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      }

      // Show top collections
      if (test.name === 'sales_ops_kpis_by_collection' && Array.isArray(data)) {
        const sorted = [...data].sort((a, b) => (b.gross_revenue || 0) - (a.gross_revenue || 0));
        const top5 = sorted.slice(0, 5);
        console.log(`   🏆 Top 5 Collections:`);
        top5.forEach((row, idx) => {
          console.log(`      ${idx + 1}. ${row.collection}: $${(row.gross_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        });
      }

      console.log('');
    }
  } catch (err) {
    console.log(`❌ ${test.name}`);
    console.log(`   Purpose: ${test.purpose}`);
    console.log(`   Error: ${err.message}`);
    console.log('');
    allSuccess = false;
  }
}

console.log('─'.repeat(80));

if (allSuccess) {
  console.log('\n✅ SUCCESS! Both critical RPC functions are working with production date range!\n');
  console.log('If the frontend still shows no data, the issue is likely:');
  console.log('  1. Missing environment variables in Netlify production');
  console.log('  2. Stale deployment (needs rebuild)');
  console.log('  3. Browser/CDN cache');
  console.log('  4. JavaScript error in browser (check console)\n');
  console.log('Next Steps:');
  console.log('  1. Open browser DevTools on https://cpf-mbic2.netlify.app/sales-ops');
  console.log('  2. Check Console tab for JavaScript errors');
  console.log('  3. Check Network tab to see if API calls are being made');
  console.log('  4. Verify environment variables are set in Netlify dashboard');
} else {
  console.log('\n❌ FAILURE! Critical RPC functions failed.\n');
  console.log('The backend is not working properly. Check Supabase logs.');
}

console.log('\n═'.repeat(80) + '\n');

process.exit(allSuccess ? 0 : 1);
