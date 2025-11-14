import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('📝 Applying sales_targets migration...\n');

  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20250113_create_sales_targets_table.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec', { sql });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!\n');

    // Verify the table was created
    const { data: tableCheck, error: checkError } = await supabase
      .from('sales_targets')
      .select('count')
      .limit(1);

    if (checkError) {
      console.log('⚠️  Table verification failed, but migration may have succeeded');
      console.log('   Error:', checkError.message);
    } else {
      console.log('✅ Table verified: sales_targets exists\n');

      // Count seeded records
      const { count } = await supabase
        .from('sales_targets')
        .select('*', { count: 'exact', head: true });

      console.log(`📊 Seeded ${count} target records for 2025\n`);

      // Show sample data
      const { data: sample } = await supabase
        .from('sales_targets')
        .select('*')
        .limit(3)
        .order('target_month');

      if (sample && sample.length > 0) {
        console.log('Sample records:');
        sample.forEach(record => {
          console.log(`  - Rep ${record.rep_id}: ${record.target_month} = $${record.target_amount.toLocaleString()}`);
        });
      }
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

applyMigration();
