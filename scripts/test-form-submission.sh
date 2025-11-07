#!/bin/bash
# Test form submission with Jorge/Cruz Flooring/Vinyl/Spirit/Cerise

# First, get Cruz Flooring's dealer ID for Jorge (repId=3)
echo "Getting dealers for Jorge (repId=3)..."
DEALER_ID=$(curl -s 'https://cpf-mbic2.netlify.app/api/forms/catalog/dealers?repId=3' | jq -r '.data[] | select(.name | contains("Cruz")) | .id')

if [ -z "$DEALER_ID" ]; then
  echo "ERROR: Could not find Cruz Flooring for Jorge"
  exit 1
fi

echo "Found Cruz Flooring: dealerId=$DEALER_ID"
echo ""
echo "Submitting loss opportunity form..."
echo ""

curl -s -X POST 'https://cpf-mbic2.netlify.app/api/forms/loss-opportunity' \
  -H 'Content-Type: application/json' \
  -d "{
    \"repId\": 3,
    \"dealerId\": $DEALER_ID,
    \"categoryKey\": \"vinyl\",
    \"collectionKey\": \"Spirit\",
    \"colorName\": \"Cerise\",
    \"reason\": \"no_stock\",
    \"requestedQty\": 3500,
    \"targetPrice\": 1.85,
    \"potentialAmount\": 6475,
    \"notes\": \"Test submission - Jorge/Cruz Flooring\"
  }" | jq '.'
