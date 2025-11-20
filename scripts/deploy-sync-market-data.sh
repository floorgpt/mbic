#!/bin/bash

# Deploy and test the sync-market-data Edge Function

echo "🚀 Deploying sync-market-data Edge Function"
echo "==========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI not found. Install it first:"
  echo "   npm install -g supabase"
  echo ""
  exit 1
fi

# Deploy the function
echo "📦 Deploying function to Supabase..."
echo ""

supabase functions deploy sync-market-data \
  --project-ref sqhqzrtmjspwqqhnjtss

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Function deployed successfully!"
  echo ""
  echo "📝 Function URL:"
  echo "   https://sqhqzrtmjspwqqhnjtss.supabase.co/functions/v1/sync-market-data"
  echo ""
  echo "🧪 To test the function:"
  echo "   curl -X POST https://sqhqzrtmjspwqqhnjtss.supabase.co/functions/v1/sync-market-data \\"
  echo "     -H \"Authorization: Bearer \$SUPABASE_SERVICE_ROLE_KEY\""
  echo ""
  echo "💡 Or use the test script:"
  echo "   node scripts/test-sync-market-data.mjs"
  echo ""
else
  echo ""
  echo "❌ Deployment failed. Check the error above."
  echo ""
  echo "💡 Common issues:"
  echo "   1. Not logged in: Run 'supabase login'"
  echo "   2. Wrong project: Check project ref in command"
  echo "   3. Missing permissions: Ensure you have access to the project"
  echo ""
fi
