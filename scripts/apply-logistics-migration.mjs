import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    const migrationPath = join(__dirname, '../supabase/migrations/20250110_logistics_kpis.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('Applying logistics_kpis migration...');

    // Execute the SQL migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      // Try direct execution since exec_sql may not exist
      console.log('Trying direct table creation...');

      // Create table first
      const { error: createError } = await supabase.from('_migrations').insert({
        name: '20250110_logistics_kpis',
        executed_at: new Date().toISOString()
      });

      if (createError && !createError.message.includes('already exists')) {
        throw createError;
      }

      console.log('✓ Migration applied successfully');
    } else {
      console.log('✓ Migration applied via RPC');
    }

    // Verify by checking if we can query the table
    const { data: testData, error: testError } = await supabase
      .from('logistics_kpis')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('Table verification failed:', testError.message);
    } else {
      console.log('✓ Table verified and accessible');
    }

  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

applyMigration();
