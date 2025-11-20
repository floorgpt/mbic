// Test Overpass API query directly to debug why no stores are found

const OVERPASS_API = "https://overpass-api.de/api/interpreter";

// Simplified query to test if we can find ANY hardware/flooring stores in Florida
const testQueries = {
  // Test 1: Simple Home Depot search by name
  simpleHomeDepot: `
    [out:json][timeout:60];
    area["name"="Florida"]["admin_level"="4"]->.florida;
    (
      node["name"~"Home Depot",i](area.florida);
      way["name"~"Home Depot",i](area.florida);
    );
    out center 10;
  `,

  // Test 2: Hardware stores by shop tag
  hardwareShops: `
    [out:json][timeout:60];
    area["name"="Florida"]["admin_level"="4"]->.florida;
    (
      node["shop"="hardware"](area.florida);
      way["shop"="hardware"](area.florida);
    );
    out center 10;
  `,

  // Test 3: Search in specific city (Miami)
  miamiHomeDepot: `
    [out:json][timeout:60];
    area["name"="Miami"]["admin_level"="8"]->.miami;
    (
      node["name"~"Home Depot",i](area.miami);
      way["name"~"Home Depot",i](area.miami);
    );
    out center 5;
  `,
};

async function testOverpassQuery(queryName, query) {
  console.log(`\n🔍 Testing: ${queryName}`);
  console.log("─".repeat(60));

  try {
    const response = await fetch(OVERPASS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ data: query }),
    });

    if (!response.ok) {
      console.log(`❌ Query failed with status ${response.status}`);
      const text = await response.text();
      console.log("Response:", text.substring(0, 500));
      return;
    }

    const data = await response.json();
    const elements = data.elements || [];

    console.log(`✅ Found ${elements.length} elements`);

    if (elements.length > 0) {
      console.log("\n📋 Sample results:");
      elements.slice(0, 3).forEach((el, idx) => {
        const tags = el.tags || {};
        const lat = el.lat || el.center?.lat || "N/A";
        const lon = el.lon || el.center?.lon || "N/A";

        console.log(`\n  ${idx + 1}. ${tags.name || "Unnamed"}`);
        console.log(`     Type: ${el.type} (ID: ${el.id})`);
        console.log(`     Coords: ${lat}, ${lon}`);
        console.log(`     ZIP: ${tags["addr:postcode"] || "N/A"}`);
        console.log(`     City: ${tags["addr:city"] || tags["addr:town"] || "N/A"}`);
        console.log(`     Shop tag: ${tags.shop || "N/A"}`);

        // Show all tags for debugging
        console.log(`     All tags:`, JSON.stringify(tags, null, 2).split('\n').map(l => '       ' + l).join('\n').trim());
      });
    } else {
      console.log("⚠️  No elements found for this query");
    }

  } catch (error) {
    console.log(`❌ Error:`, error.message);
  }
}

async function runTests() {
  console.log("🧪 Testing Overpass API Queries");
  console.log("═".repeat(60));
  console.log("This will help debug why the Edge Function found 0 stores");
  console.log("");

  // Run each test query
  for (const [name, query] of Object.entries(testQueries)) {
    await testOverpassQuery(name, query);

    // Small delay between queries to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n" + "═".repeat(60));
  console.log("🏁 Tests complete");
  console.log("");
  console.log("💡 Next steps:");
  console.log("   - If no results found, OSM data may be sparse for Florida");
  console.log("   - May need to use alternative data source (e.g., scraping)");
  console.log("   - Consider manually seeding data for POC");
  console.log("");
}

runTests();
