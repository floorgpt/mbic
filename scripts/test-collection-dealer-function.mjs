#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test if the function exists
console.log('Testing sales_ops_collection_by_dealer function...\n');

const { data, error } = await supabase.rpc('sales_ops_collection_by_dealer', {
  p_collection: 'Spirit',
  from_date: '2025-01-01',
  to_date: '2025-11-10'
});

if (error) {
  console.error('❌ Function call failed:');
  console.error('Error:', error.message);
  console.error('Details:', error.details);
  console.error('Hint:', error.hint);
  console.error('\n🔍 The function may not exist in the database.');
  console.error('📝 Run the migration: supabase/migrations/20250107_sales_ops_rpcs_v3.sql');
} else {
  console.log('✅ Function exists and returned data:');
  console.log(`Found ${data?.length || 0} dealers for Spirit collection`);
  if (data?.length > 0) {
    console.log('\nSample data:');
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
  }
}
