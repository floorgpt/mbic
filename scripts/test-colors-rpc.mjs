#!/usr/bin/env node
/**
 * Test the colors RPC directly
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

console.log('Testing get_colors_by_collection_v2 RPC...\n');

// Test 1: lowercase "spirit"
console.log('Test 1: lowercase "spirit"');
const { data: data1, error: error1 } = await supabase.rpc('get_colors_by_collection_v2', {
  p_collection: 'spirit'
});

console.log(`  Result: ${data1 ? `${data1.length} colors` : 'null'}`);
console.log(`  Error: ${error1 ? JSON.stringify(error1) : 'none'}`);
if (data1 && data1.length > 0) {
  console.log(`  Sample: ${JSON.stringify(data1.slice(0, 2))}`);
}

// Test 2: Capital "Spirit"
console.log('\nTest 2: Capital "Spirit"');
const { data: data2, error: error2 } = await supabase.rpc('get_colors_by_collection_v2', {
  p_collection: 'Spirit'
});

console.log(`  Result: ${data2 ? `${data2.length} colors` : 'null'}`);
console.log(`  Error: ${error2 ? JSON.stringify(error2) : 'none'}`);
if (data2 && data2.length > 0) {
  console.log(`  Sample: ${JSON.stringify(data2.slice(0, 2))}`);
}

// Test 3: Check if Cerise exists
console.log('\nTest 3: Check if "Cerise" exists in Spirit colors');
if (data2 && Array.isArray(data2)) {
  const cerise = data2.find(c => {
    const val = typeof c === 'string' ? c : (c.color || c.value || c.label || '');
    return val.toLowerCase() === 'cerise';
  });
  console.log(`  Found Cerise: ${cerise ? 'YES' : 'NO'}`);
  if (cerise) {
    console.log(`  Value: ${JSON.stringify(cerise)}`);
  }
}
