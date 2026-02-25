#!/usr/bin/env bash
set -euo pipefail

# Import ALL service schemas and Postman collections into Microcks
# Usage: ./import-all.sh [MICROCKS_URL]

MICROCKS_URL="${1:-http://localhost:8585}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ARTIFACTS_DIR="$SCRIPT_DIR/../artifacts"

echo "═══════════════════════════════════════════════"
echo "  Importing all services into Microcks"
echo "  URL: $MICROCKS_URL"
echo "═══════════════════════════════════════════════"
echo ""

PASS=0
FAIL=0
SERVICES=()

upload_artifact() {
  local file="$1"
  local is_main="${2:-true}"
  local desc="$3"

  local extra_args=""
  if [ "$is_main" = "false" ]; then
    extra_args="-F mainArtifact=false"
  fi

  HTTP_CODE=$(curl -s -o /tmp/microcks-upload-resp.txt -w "%{http_code}" \
    -X POST "$MICROCKS_URL/api/artifact/upload" \
    -F "file=@$file" \
    $extra_args)

  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "    ✓ $desc"
    return 0
  else
    echo "    ✗ $desc (HTTP $HTTP_CODE)"
    cat /tmp/microcks-upload-resp.txt 2>/dev/null | head -c 200
    echo ""
    return 1
  fi
}

# Import each *-api service
for SCHEMA_FILE in "$ARTIFACTS_DIR"/*-api-schema.graphql; do
  [ -f "$SCHEMA_FILE" ] || continue

  BASE=$(basename "$SCHEMA_FILE" -schema.graphql)
  POSTMAN_FILE="$ARTIFACTS_DIR/${BASE}-examples.postman.json"
  SERVICE_NAME=$(head -1 "$SCHEMA_FILE" | sed 's/# microcksId: \(.*\) : .*/\1/')

  echo "[$SERVICE_NAME]"

  if upload_artifact "$SCHEMA_FILE" "true" "Schema (primary)"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi

  if [ -f "$POSTMAN_FILE" ]; then
    if upload_artifact "$POSTMAN_FILE" "false" "Postman collection (secondary)"; then
      PASS=$((PASS + 1))
    else
      FAIL=$((FAIL + 1))
    fi
  fi

  SERVICES+=("$SERVICE_NAME")
  echo ""
done

# Also re-import the original StatsAPI if the hand-crafted one still exists
if [ -f "$ARTIFACTS_DIR/schema.graphql" ]; then
  echo "[StatsAPI — hand-crafted override]"
  upload_artifact "$ARTIFACTS_DIR/schema.graphql" "true" "Schema (primary)" || true
  if [ -f "$ARTIFACTS_DIR/mock-examples.postman.json" ]; then
    upload_artifact "$ARTIFACTS_DIR/mock-examples.postman.json" "false" "Postman collection (secondary)" || true
  fi
  echo ""
fi

echo "═══════════════════════════════════════════════"
echo "  Import complete: $PASS succeeded, $FAIL failed"
echo "  Services imported: ${#SERVICES[@]}"
echo ""
echo "  Services:"
for S in "${SERVICES[@]}"; do
  echo "    • $S → $MICROCKS_URL/graphql/$S/1.0"
done
echo ""
echo "  Open Microcks UI: $MICROCKS_URL"
echo "═══════════════════════════════════════════════"
