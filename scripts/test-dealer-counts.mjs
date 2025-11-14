import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDealerCounts() {
  console.log('=== DEALER COUNT INVESTIGATION FOR JANUARY 2025 ===\n');

  // 1. Total dealers excluding rep_id 14 and 15
  const { data: totalDealers, error: totalError } = await supabase
    .from('customers_demo')
    .select('customer_id')
    .not('rep_id', 'in', '(14,15)');

  console.log('1. Total Assigned Dealers (excluding rep_id 14, 15):');
  console.log('   Count:', totalDealers?.length);
  if (totalError) console.error('   Error:', totalError);

  // 2. Active dealers in January 2025 (with sales)
  const { data: activeDealers, error: activeError } = await supabase
    .rpc('active_dealers_by_month', { p_target_month: '2025-01-01' });

  console.log('\n2. Active Dealers in January 2025 (from RPC):');
  console.log('   Count:', activeDealers?.length);
  if (activeError) console.error('   Error:', activeError);

  // 3. Inactive dealers in January 2025
  const { data: inactiveDealers, error: inactiveError } = await supabase
    .rpc('inactive_dealers_by_month', { p_target_month: '2025-01-01' });

  console.log('\n3. Inactive Dealers in January 2025 (from RPC):');
  console.log('   Count:', inactiveDealers?.length);
  if (inactiveError) console.error('   Error:', inactiveError);

  // 4. Math check
  console.log('\n4. Math Check:');
  console.log('   Total:', totalDealers?.length);
  console.log('   Active:', activeDealers?.length);
  console.log('   Inactive:', inactiveDealers?.length);
  console.log('   Active + Inactive =', (activeDealers?.length || 0) + (inactiveDealers?.length || 0));
  console.log('   Expected:', totalDealers?.length);
  console.log('   Match:', (activeDealers?.length || 0) + (inactiveDealers?.length || 0) === totalDealers?.length ? '✅' : '❌');

  // 5. Test the month details RPC
  console.log('\n5. Month Details RPC (dealer_activity_month_details):');
  const { data: monthDetails, error: monthError } = await supabase
    .rpc('dealer_activity_month_details', { p_target_month: '2025-01-01' })
    .single();

  if (monthError) {
    console.error('   Error:', monthError);
  } else {
    console.log('   Active Dealers:', monthDetails.active_dealers);
    console.log('   Total Dealers:', monthDetails.total_dealers);
    console.log('   Active %:', monthDetails.active_pct);
    console.log('   Revenue:', monthDetails.total_revenue);
    console.log('   Prior Month Active:', monthDetails.prior_active_dealers);
    console.log('   Prior Month Total:', monthDetails.prior_total_dealers);
    console.log('   Revenue Change %:', monthDetails.revenue_change_pct);
    console.log('   Engagement Change %:', monthDetails.engagement_change_pct);
  }
}

testDealerCounts().catch(console.error);
