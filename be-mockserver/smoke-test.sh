#!/usr/bin/env bash
set -euo pipefail

CUSTOM_URL="${CUSTOM_URL:-http://localhost:4010/graphql}"
MICROCKS_MOCK_URL="${MICROCKS_MOCK_URL:-}"

PAYLOAD='{
  "operationName": "GetGamecastBySlug",
  "query": "query GetGamecastBySlug($slug: String!) { getGamecastBySlug(slug: $slug) { slug status } }",
  "variables": { "slug": "demo-game-001" }
}'

echo "Custom mock server: success"
curl -s "$CUSTOM_URL" \
  -H "content-type: application/json" \
  -H "x-mock-scenario: success" \
  -d "$PAYLOAD" | jq .

echo "Custom mock server: empty"
curl -s "$CUSTOM_URL" \
  -H "content-type: application/json" \
  -H "x-mock-scenario: empty" \
  -d "$PAYLOAD" | jq .

echo "Custom mock server: error"
curl -s "$CUSTOM_URL" \
  -H "content-type: application/json" \
  -H "x-mock-scenario: error" \
  -d "$PAYLOAD" | jq .

if [ -n "$MICROCKS_MOCK_URL" ]; then
  echo "Microcks mock endpoint: success"
  curl -s "$MICROCKS_MOCK_URL" \
    -H "content-type: application/json" \
    -d "$PAYLOAD" | jq .
else
  echo "MICROCKS_MOCK_URL not set; skipping Microcks smoke test."
fi
