#!/usr/bin/env node
/**
 * Test the forms diagnostics to ensure catalog validation works properly
 */

import { createClient } from '@supabase/supabase-js';

// Check environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('\n🔍 Testing Forms Diagnostics\n');
console.log('═'.repeat(80));

// Test 1: Basic diagnostics with no selections
console.log('\n📋 Test 1: No selections (should all pass)\n');
try {
  const response1 = await fetch('https://cpf-mbic2.netlify.app/api/diag-forms?dryRun=true');
  const data1 = await response1.json();

  console.log(`Status: ${response1.status}`);
  console.log(`Overall OK: ${data1.ok ? '✅' : '❌'}`);
  console.log(`\nChecks:`);
  data1.checks.forEach(check => {
    const icon = check.ok ? '✅' : '❌';
    console.log(`  ${icon} ${check.label}: count=${check.count}, err=${check.err || 'null'}`);
  });
} catch (error) {
  console.error('❌ Test 1 failed:', error.message);
}

// Test 2: With rep selection
console.log('\n\n📋 Test 2: With rep selection (repId=1)\n');
try {
  const response2 = await fetch('https://cpf-mbic2.netlify.app/api/diag-forms?dryRun=true&repId=1');
  const data2 = await response2.json();

  console.log(`Status: ${response2.status}`);
  console.log(`Overall OK: ${data2.ok ? '✅' : '❌'}`);
  console.log(`\nChecks:`);
  data2.checks.forEach(check => {
    const icon = check.ok ? '✅' : '❌';
    console.log(`  ${icon} ${check.label}: count=${check.count}, err=${check.err || 'null'}`);
  });
} catch (error) {
  console.error('❌ Test 2 failed:', error.message);
}

// Test 3: With full selection (rep + category + collection)
console.log('\n\n📋 Test 3: Full selection (repId=1, category=vinyl, collection=Spirit)\n');
try {
  const response3 = await fetch('https://cpf-mbic2.netlify.app/api/diag-forms?dryRun=true&repId=1&category=vinyl&collection=Spirit');
  const data3 = await response3.json();

  console.log(`Status: ${response3.status}`);
  console.log(`Overall OK: ${data3.ok ? '✅' : '❌'}`);
  console.log(`\nChecks:`);
  data3.checks.forEach(check => {
    const icon = check.ok ? '✅' : '❌';
    const extra = check.usedUrl ? `\n      URL: ${check.usedUrl}` : '';
    console.log(`  ${icon} ${check.label}: count=${check.count}, status=${check.status}, err=${check.err || 'null'}${extra}`);
  });

  // Check the critical colors check
  const colorsCheck = data3.checks.find(c => c.label.startsWith('colors-'));
  if (colorsCheck) {
    console.log(`\n🎨 Colors Check Detail:`);
    console.log(`   OK: ${colorsCheck.ok ? '✅' : '❌'}`);
    console.log(`   Count: ${colorsCheck.count}`);
    console.log(`   Status: ${colorsCheck.status}`);
    console.log(`   Error: ${colorsCheck.err || 'none'}`);
    if (colorsCheck.sample) {
      console.log(`   Sample: ${JSON.stringify(colorsCheck.sample).slice(0, 100)}...`);
    }
  }
} catch (error) {
  console.error('❌ Test 3 failed:', error.message);
}

// Test 4: Direct colors API call
console.log('\n\n📋 Test 4: Direct colors API call\n');
try {
  const response4 = await fetch('https://cpf-mbic2.netlify.app/api/forms/catalog/colors?collection=Spirit');
  const data4 = await response4.json();

  console.log(`Status: ${response4.status}`);
  console.log(`OK: ${data4.ok ? '✅' : '❌'}`);
  console.log(`Count: ${data4.meta?.count || 0}`);
  if (data4.data && data4.data.length > 0) {
    console.log(`Sample colors: ${data4.data.slice(0, 3).map(c => c.value).join(', ')}`);
  }
  if (data4.err) {
    console.log(`Error: ${data4.err}`);
  }
} catch (error) {
  console.error('❌ Test 4 failed:', error.message);
}

console.log('\n═'.repeat(80));
console.log('\n✅ Forms diagnostics test complete\n');
