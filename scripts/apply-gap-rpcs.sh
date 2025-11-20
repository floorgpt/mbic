#!/bin/bash

# Apply Gap Analysis RPC Functions to Supabase
# This script uses psql to apply the SQL migrations directly

echo "🔧 Applying Gap Analysis RPC Functions"
echo "======================================"
echo ""

# Load Supabase credentials
source .env.local 2>/dev/null || {
  echo "❌ Could not load .env.local"
  exit 1
}

# Extract database connection from Supabase URL
DB_HOST=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's|https://||' | sed 's|http://||')
DB_NAME="postgres"
DB_USER="postgres"
DB_PORT="5432"

# Supabase uses pooler on port 6543
POOLER_HOST="db.${DB_HOST#*.}"

echo "📝 Target: $DB_HOST"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
  echo "⚠️  psql not found. Installing migrations via Supabase Dashboard..."
  echo ""
  echo "📋 Manual Steps:"
  echo "1. Open: https://supabase.com/dashboard/project/sqhqzrtmjspwqqhnjtss/sql/new"
  echo "2. Copy and paste the content from:"
  echo "   supabase/migrations/20250120_gap_analysis_rpcs.sql"
  echo "3. Click 'Run'"
  echo ""
  exit 0
fi

# Try to apply using psql (requires database password)
echo "💡 Attempting to apply RPCs..."
echo ""
echo "Note: If prompted for password, check your Supabase database settings"
echo "or use the Supabase Dashboard SQL Editor instead."
echo ""

psql "postgresql://${DB_USER}@${POOLER_HOST}:${DB_PORT}/${DB_NAME}" \
  -f supabase/migrations/20250120_gap_analysis_rpcs.sql \
  2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ RPCs applied successfully"
else
  echo ""
  echo "⚠️  psql connection failed. Please use Supabase Dashboard:"
  echo ""
  echo "1. Open: https://supabase.com/dashboard/project/sqhqzrtmjspwqqhnjtss/sql/new"
  echo "2. Copy content from: supabase/migrations/20250120_gap_analysis_rpcs.sql"
  echo "3. Run the SQL"
  echo ""
fi
