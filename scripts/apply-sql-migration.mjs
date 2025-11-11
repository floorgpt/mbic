#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('📝 Reading migration file...\n');

const migrationSQL = readFileSync('supabase/migrations/20250111_enhance_collection_by_dealer.sql', 'utf8');

// Extract the SQL statements
const dropStatement = migrationSQL.match(/drop function[^;]+;/is)?.[0];
const createStatement = migrationSQL.match(/create function[^$]+\$\$/is)?.[0] + '$$;';
const grantStatement = migrationSQL.match(/grant execute[^;]+;/is)?.[0];

console.log('🔧 Step 1: Dropping old function...');
if (dropStatement) {
  const { error } = await supabase.rpc('exec', { sql: dropStatement });
  if (error && !error.message.includes('does not exist')) {
    console.error('  Warning: ', error.message);
  } else {
    console.log('  Success: Old function dropped (or did not exist)');
  }
}

console.log('\nStep 2: Creating enhanced function via direct query...');
console.log('  Warning: Cannot execute DDL via RPC. Please run the SQL manually.\n');
console.log('  Copy this SQL and run it in Supabase SQL Editor:\n');
console.log('─'.repeat(80));
console.log(migrationSQL);
console.log('─'.repeat(80));
console.log('\n  Or visit: ' + supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql'));

// Try to test if function already has new fields
console.log('\nTesting if function is already enhanced...\n');

const { data, error } = await supabase.rpc('sales_ops_collection_by_dealer', {
  p_collection: 'Spirit',
  from_date: '2025-01-01',
  to_date: '2025-11-10'
});

if (error) {
  console.error('❌ Function call failed:', error.message);
} else if (data && data.length > 0) {
  const hasNewFields = 'dealer_id' in data[0] && 'preferred_color' in data[0] && 'buying_power_pct' in data[0];

  if (hasNewFields) {
    console.log('Success: Function is already enhanced!');
    console.log(`   Found ${data.length} dealers with new fields\n`);
    console.log('Top 3 Dealers:');
    data.slice(0, 3).forEach((dealer, i) => {
      console.log(`   ${i + 1}. ${dealer.dealer} (ID: ${dealer.dealer_id})`);
      console.log(`      Revenue: $${Number(dealer.revenue).toLocaleString()}`);
      console.log(`      Buying Power: ${dealer.buying_power_pct}%`);
      console.log(`      Preferred Color: ${dealer.preferred_color}`);
      console.log('');
    });
  } else {
    console.log('Warning: Function exists but is not enhanced yet.');
    console.log('   Missing fields: dealer_id, preferred_color, buying_power_pct');
    console.log('\n   Please run the SQL manually in Supabase Dashboard.');
  }
}
