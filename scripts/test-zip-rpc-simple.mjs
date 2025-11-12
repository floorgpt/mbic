const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testRPC() {
  console.log('Testing sales_by_zip_fl RPC...');
  console.log('URL:', url);

  const res = await fetch(`${url}/rest/v1/rpc/sales_by_zip_fl`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      from_date: '2025-01-01',
      to_date: '2025-10-01',
      p_category: null,
      p_collection: null
    })
  });

  console.log('Status:', res.status);

  if (!res.ok) {
    const text = await res.text();
    console.error('Error response:', text);
    return;
  }

  const data = await res.json();
  console.log('Total ZIP codes returned:', Array.isArray(data) ? data.length : 0);
  console.log('\nFirst 10 ZIP codes:');
  console.log(JSON.stringify(data.slice(0, 10), null, 2));
}

testRPC().catch(console.error);
