import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250114_dealer_month_details_rpc.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('Applying migration to Supabase...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();

    if (error) {
      // Try direct execution via fetch since exec_sql might not exist
      console.log('Trying direct SQL execution...');

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ query: sql })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('✅ Migration applied successfully!');
    } else {
      console.log('✅ Migration applied successfully!');
      if (data) console.log('Result:', data);
    }

    // Test the new functions
    console.log('\nTesting dealer_activity_month_details function...');
    const { data: monthDetails, error: monthError } = await supabase
      .rpc('dealer_activity_month_details', { p_target_month: '2025-09-01' })
      .single();

    if (monthError) {
      console.error('Error testing month details:', monthError);
    } else {
      console.log('Month details result:', JSON.stringify(monthDetails, null, 2));
    }

    console.log('\nTesting reactivated_dealers_by_month function...');
    const { data: reactivated, error: reactivatedError } = await supabase
      .rpc('reactivated_dealers_by_month', { p_target_month: '2025-09-01' });

    if (reactivatedError) {
      console.error('Error testing reactivated dealers:', reactivatedError);
    } else {
      console.log(`Found ${reactivated?.length || 0} reactivated dealers`);
      if (reactivated && reactivated.length > 0) {
        console.log('Sample:', JSON.stringify(reactivated[0], null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
