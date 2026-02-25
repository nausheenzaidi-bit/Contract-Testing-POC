#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCHEMA_PATH="${SCHEMA_PATH:-$SCRIPT_DIR/../schema.graphql}"
BASELINE_PATH="${BASELINE_PATH:-$SCRIPT_DIR/schema.baseline.graphql}"

if [ ! -f "$BASELINE_PATH" ]; then
  echo "Baseline not found. Creating baseline at $BASELINE_PATH"
  cp "$SCHEMA_PATH" "$BASELINE_PATH"
  echo "Re-run to detect breaking changes."
  exit 0
fi

echo "Comparing current schema with baseline..."
npx -y @graphql-inspector/cli diff "$BASELINE_PATH" "$SCHEMA_PATH"
