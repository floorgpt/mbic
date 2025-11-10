#!/usr/bin/env node
/**
 * Verify Sales Ops Migration was applied successfully
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const from = '2025-01-01';
const to = '2025-10-01';

console.log('\n🔍 Verifying Sales Ops Migration\n');
console.log('═'.repeat(80));
console.log(`Date Range: ${from} to ${to}\n`);

const tests = [
  {
    name: 'sales_ops_category_kpis',
    purpose: 'Category KPIs for Gross Revenue',
    critical: true,
  },
  {
    name: 'sales_ops_category_kpis_monthly',
    purpose: 'Monthly category data',
    critical: true,
  },
  {
    name: 'sales_ops_kpis_by_collection',
    purpose: 'Top Collections',
    critical: true,
  },
  {
    name: 'sales_ops_kpis_monthly_by_collection',
    purpose: 'Collections monthly trends',
    critical: false,
  },
  {
    name: 'sales_ops_fill_rate',
    purpose: 'Fill Rate KPI',
    critical: false,
  },
  {
    name: 'sales_ops_import_lead_time',
    purpose: 'Import Lead Time',
    critical: false,
  },
  {
    name: 'sales_ops_forecast_accuracy',
    purpose: 'Forecast Accuracy',
    critical: false,
  },
  {
    name: 'sales_ops_inventory_turnover',
    purpose: 'Inventory Turnover',
    critical: false,
  },
  {
    name: 'sales_ops_dealer_bounce_rate',
    purpose: 'Dealer Bounce Rate',
    critical: false,
  },
  {
    name: 'ops_reports_made_by_month',
    purpose: 'Reports Timeline',
    critical: false,
  },
  {
    name: 'ops_comm_consistency_index',
    purpose: 'Communication Consistency',
    critical: false,
  },
  {
    name: 'list_future_sale_opps_open',
    purpose: 'Future Opportunities',
    critical: false,
  },
  {
    name: 'list_incoming_stock_by_collection',
    purpose: 'Incoming Stock',
    critical: false,
  },
];

let successCount = 0;
let failureCount = 0;
let criticalFailures = [];

console.log('Testing RPC Functions:\n');
console.log('─'.repeat(80));

for (const test of tests) {
  try {
    const { data, error } = await supabase.rpc(test.name, {
      from_date: from,
      to_date: to,
    });

    if (error) {
      const status = test.critical ? '❌ CRITICAL' : '⚠️  WARNING';
      console.log(`${status} ${test.name}`);
      console.log(`         Purpose: ${test.purpose}`);
      console.log(`         Error: ${error.message}`);
      console.log('');
      failureCount++;
      if (test.critical) {
        criticalFailures.push(test);
      }
    } else {
      const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
      const icon = test.critical ? '✅' : '✓';
      console.log(`${icon}  ${test.name.padEnd(45)} ${count} rows`);
      successCount++;

      // Show sample data for critical functions
      if (test.critical && Array.isArray(data) && data.length > 0) {
        const sample = data[0];
        const keys = Object.keys(sample).slice(0, 3);
        const preview = keys.map(k => `${k}: ${sample[k]}`).join(', ');
        console.log(`         Sample: ${preview}`);
      }
    }
  } catch (err) {
    const status = test.critical ? '❌ CRITICAL' : '⚠️  WARNING';
    console.log(`${status} ${test.name}`);
    console.log(`         Purpose: ${test.purpose}`);
    console.log(`         Error: ${err.message}`);
    console.log('');
    failureCount++;
    if (test.critical) {
      criticalFailures.push(test);
    }
  }
}

console.log('─'.repeat(80));
console.log(`\n📊 Summary:`);
console.log(`   ✅ Working: ${successCount}/${tests.length}`);
console.log(`   ❌ Failed: ${failureCount}/${tests.length}`);

if (criticalFailures.length > 0) {
  console.log(`\n❌ CRITICAL FAILURES (${criticalFailures.length}):`);
  console.log('   These functions are required for the sales-ops page to work:\n');
  criticalFailures.forEach(test => {
    console.log(`   - ${test.name} (${test.purpose})`);
  });
  console.log('\n   ⚠️  The sales-ops page will NOT show data until these are fixed.');
  console.log('\n   📝 To fix:');
  console.log('      1. Open Supabase Dashboard SQL Editor');
  console.log('      2. Run the migration: supabase/migrations/20250107_sales_ops_rpcs.sql');
  console.log('      3. Re-run this verification script');
} else if (failureCount > 0) {
  console.log(`\n⚠️  Some non-critical functions failed.`);
  console.log('   The sales-ops page will work, but some metrics will be missing.');
} else {
  console.log('\n🎉 SUCCESS! All Sales Ops RPC functions are working!');
  console.log('\n   The sales-ops page should now display:');
  console.log('   ✅ Gross Revenue card');
  console.log('   ✅ Top Collections with drill-down');
  console.log('   ✅ All operational metrics');
  console.log('\n   Visit: https://cpf-mbic2.netlify.app/sales-ops');
}

console.log('\n═'.repeat(80) + '\n');

process.exit(criticalFailures.length > 0 ? 1 : 0);
