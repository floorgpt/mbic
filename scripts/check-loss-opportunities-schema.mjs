#!/usr/bin/env node
/**
 * Check the loss_opportunities table schema
 */

import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Checking loss_opportunities table schema...\n');

// Query to get table columns
const { data, error } = await supabase
  .from('loss_opportunities')
  .select('*')
  .limit(1);

if (error) {
  console.error('Error querying table:', error);
  process.exit(1);
}

console.log('Sample row (first record):');
console.log(JSON.stringify(data?.[0] || {}, null, 2));

if (data && data.length > 0) {
  console.log('\nColumns in table:');
  Object.keys(data[0]).sort().forEach(col => {
    console.log(`  - ${col}`);
  });
}
