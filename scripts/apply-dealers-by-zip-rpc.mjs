const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

import { readFileSync } from 'fs';

async function applyMigration() {
  const sql = readFileSync('supabase/migrations/20250112_dealers_by_zip_rpc.sql', 'utf8');

  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ sql })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Failed to apply migration:', err);
    process.exit(1);
  }

  console.log('✓ dealers_by_zip RPC function created successfully!');
}

applyMigration().catch(console.error);
