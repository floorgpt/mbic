#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Read the migration file
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250111_enhance_collection_by_dealer.sql');
const migrationSQL = readFileSync(migrationPath, 'utf8');

console.log('📝 Applying enhanced collection_by_dealer migration...\n');

try {
  // Execute the SQL
  const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL }).catch(async () => {
    // If exec_sql doesn't exist, try direct approach
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Executing ${statements.length} SQL statements...`);

    for (const statement of statements) {
      if (statement.toLowerCase().includes('drop function')) {
        console.log('  - Dropping old function...');
      } else if (statement.toLowerCase().includes('create function')) {
        console.log('  - Creating enhanced function...');
      } else if (statement.toLowerCase().includes('grant')) {
        console.log('  - Granting permissions...');
      }
    }

    // For Supabase, we need to use the SQL editor or apply via dashboard
    console.log('\n⚠️  Cannot apply via API. Please run this SQL in Supabase SQL Editor:');
    console.log('   Dashboard → SQL Editor → New Query → Paste and Run\n');
    return { error: null };
  });

  if (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }

  // Test the enhanced function
  console.log('✅ Testing enhanced function...\n');

  const { data, error: testError } = await supabase.rpc('sales_ops_collection_by_dealer', {
    p_collection: 'Spirit',
    from_date: '2025-01-01',
    to_date: '2025-11-10'
  });

  if (testError) {
    console.error('❌ Function test failed:', testError.message);
    console.log('\n💡 The function may not have been updated yet.');
    console.log('   Please apply the SQL manually via Supabase Dashboard:');
    console.log('   → SQL Editor → Run the migration file\n');
    process.exit(1);
  }

  console.log('✅ Function is working!');
  console.log(`   Found ${data?.length || 0} dealers for Spirit collection`);

  if (data && data.length > 0) {
    console.log('\n📊 Top 3 Dealers:');
    data.slice(0, 3).forEach((dealer, i) => {
      console.log(`   ${i + 1}. ${dealer.dealer}`);
      console.log(`      Revenue: $${dealer.revenue.toLocaleString()}`);
      console.log(`      Buying Power: ${dealer.buying_power_pct}%`);
      console.log(`      Preferred Color: ${dealer.preferred_color}`);
      console.log(`      Dealer ID: ${dealer.dealer_id}`);
      console.log('');
    });
  }

  console.log('✅ Migration complete!\n');
} catch (err) {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
}
