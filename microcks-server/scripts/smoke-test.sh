#!/usr/bin/env bash
set -euo pipefail

# Smoke test Microcks GraphQL mock endpoint
# Usage: ./smoke-test.sh [MICROCKS_URL]

MICROCKS_URL="${1:-http://localhost:8585}"
GQL_ENDPOINT="$MICROCKS_URL/graphql/StatsAPI/1.0"
PASS=0
FAIL=0

run_test() {
  local name="$1"
  local query="$2"
  local expect="$3"

  RESP=$(echo "$query" | tr -d '\n' | curl -s \
    -X POST \
    -H "Content-Type: application/json" \
    -d @- \
    "$GQL_ENDPOINT")

  if echo "$RESP" | grep -q "$expect"; then
    echo "  PASS  $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name"
    echo "        Expected to find: $expect"
    echo "        Got: $(echo "$RESP" | head -c 200)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Smoke testing Microcks GraphQL at $GQL_ENDPOINT ==="
echo ""

# Test 1: getGamecastBySlug
run_test "getGamecastBySlug" \
  '{"query": "query { getGamecastBySlug(slug: \"demo-game-001\") { slug status sport } }", "variables": {"slug": "demo-game-001"}}' \
  "demo-game-001"

# Test 2: getScores
run_test "getScores" \
  '{"query": "query { getScores(timezone: -5) { leagues { id name } } }", "variables": {"timezone": -5}}' \
  "National League"

# Test 3: getSchedule
run_test "getSchedule" \
  '{"query": "query { getSchedule(slug: \"demo-team\") { slug name league } }", "variables": {"slug": "demo-team"}}' \
  "Metro Hawks"

# Test 4: getStandings
run_test "getStandings" \
  '{"query": "query { getStandings(permalink: \"demo-league\") { slug name season } }", "variables": {"permalink": "demo-league"}}' \
  "Demo League"

# Test 5: getUser
run_test "getUser" \
  '{"query": "query { getUser { displayName email } }"}' \
  "Jane Doe"

# Test 6: getChannelBySlug
run_test "getChannelBySlug" \
  '{"query": "query { getChannelBySlug(slug: \"demo-channel\") { slug name } }", "variables": {"slug": "demo-channel"}}' \
  "Sports Center"

# Test 7: getSocialAlerts
run_test "getSocialAlerts" \
  '{"query": "query { getSocialAlerts { title body } }"}' \
  "Game Day Alert"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
