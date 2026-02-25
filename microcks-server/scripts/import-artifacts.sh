#!/usr/bin/env bash
set -euo pipefail

# Import schema + Postman Collection into Microcks
# Usage: ./import-artifacts.sh [MICROCKS_URL]

MICROCKS_URL="${1:-http://localhost:8585}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ARTIFACTS_DIR="$SCRIPT_DIR/../artifacts"

echo "=== Importing artifacts into Microcks at $MICROCKS_URL ==="
echo ""

# 1. Import GraphQL schema (primary artifact)
echo "[1/2] Uploading schema.graphql (primary artifact)..."
SCHEMA_HTTP=$(curl -s -o /tmp/microcks-schema-resp.txt -w "%{http_code}" \
  -X POST "$MICROCKS_URL/api/artifact/upload" \
  -F "file=@$ARTIFACTS_DIR/schema.graphql")

if [ "$SCHEMA_HTTP" = "201" ] || [ "$SCHEMA_HTTP" = "200" ]; then
  echo "  Schema imported successfully."
else
  echo "  Schema import returned HTTP $SCHEMA_HTTP"
  cat /tmp/microcks-schema-resp.txt 2>/dev/null
fi
echo ""

# 2. Import Postman Collection (secondary artifact -- provides examples)
echo "[2/2] Uploading mock-examples.postman.json (secondary artifact)..."
POSTMAN_HTTP=$(curl -s -o /tmp/microcks-postman-resp.txt -w "%{http_code}" \
  -X POST "$MICROCKS_URL/api/artifact/upload" \
  -F "file=@$ARTIFACTS_DIR/mock-examples.postman.json" \
  -F "mainArtifact=false")

if [ "$POSTMAN_HTTP" = "201" ] || [ "$POSTMAN_HTTP" = "200" ]; then
  echo "  Postman Collection imported successfully."
else
  echo "  Postman import returned HTTP $POSTMAN_HTTP"
  cat /tmp/microcks-postman-resp.txt 2>/dev/null
fi
echo ""

# 3. Fix dispatcher rules for GraphQL operations with arguments
# Microcks' Postman importer can't extract dispatch criteria from GraphQL variables,
# so we set FALLBACK dispatchers directly in MongoDB.
echo "[3/3] Configuring FALLBACK dispatchers for parameterized operations..."
docker exec microcks-db mongo microcks --quiet --eval '
var svc = db.service.findOne({name: "StatsAPI", version: "1.0"});
if (!svc) { print("Service not found, skipping dispatcher fix"); quit(); }
var ops = svc.operations;
var fbMap = {
  "getGamecastBySlug": {dispatcher: "QUERY_ARGS", dispatcherRules: "slug", fallback: "demo-game-001"},
  "getScores": {dispatcher: "QUERY_ARGS", dispatcherRules: "timezone", fallback: "scores-success"},
  "getSchedule": {dispatcher: "QUERY_ARGS", dispatcherRules: "slug", fallback: "demo-team"},
  "getStandings": {dispatcher: "QUERY_ARGS", dispatcherRules: "permalink", fallback: "demo-league"},
  "getUser": {dispatcher: "QUERY_ARGS", dispatcherRules: "profileId", fallback: "authenticated-user"},
  "getChannelBySlug": {dispatcher: "QUERY_ARGS", dispatcherRules: "slug", fallback: "demo-channel"},
};
var changed = 0;
for (var i = 0; i < ops.length; i++) {
  var fb = fbMap[ops[i].name];
  if (fb) { ops[i].dispatcher = "FALLBACK"; ops[i].dispatcherRules = JSON.stringify(fb); changed++; }
}
if (changed > 0) {
  db.service.updateOne({_id: svc._id}, {$set: {operations: ops}});
  print("  Updated " + changed + " operation dispatchers.");
} else { print("  No operations needed updating."); }
' 2>/dev/null || echo "  (MongoDB update skipped - requires docker exec access)"

echo ""
echo "=== Done. Open $MICROCKS_URL to view imported services. ==="
echo "GraphQL mock endpoint: $MICROCKS_URL/graphql/StatsAPI/1.0"
echo ""
echo "NOTE: If you changed dispatcher rules, restart the Microcks container:"
echo "  docker restart microcks"
