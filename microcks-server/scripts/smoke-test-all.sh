#!/usr/bin/env bash
set -euo pipefail

# Smoke test ALL Microcks GraphQL mock endpoints
# Usage: ./smoke-test-all.sh [MICROCKS_URL]

MICROCKS_URL="${1:-http://localhost:8585}"
PASS=0
FAIL=0
TOTAL=0

run_test() {
  local service="$1"
  local op_name="$2"
  local query="$3"
  local expect="$4"

  TOTAL=$((TOTAL + 1))
  local endpoint="$MICROCKS_URL/graphql/$service/1.0"

  RESP=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$query" \
    "$endpoint" 2>/dev/null || echo "CONNECTION_ERROR")

  if echo "$RESP" | grep -q "$expect"; then
    echo "  ✓ $service / $op_name"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $service / $op_name"
    echo "    Expected: $expect"
    echo "    Got: $(echo "$RESP" | head -c 200)"
    FAIL=$((FAIL + 1))
  fi
}

echo "═══════════════════════════════════════════════"
echo "  Smoke Testing ALL Microcks Services"
echo "  URL: $MICROCKS_URL"
echo "═══════════════════════════════════════════════"
echo ""

# StatsAPI (hand-crafted)
run_test "StatsAPI" "getGamecastBySlug" \
  '{"query":"query { getGamecastBySlug(slug: \"demo-game-001\") { slug status } }","variables":{"slug":"demo-game-001"}}' \
  "slug"

run_test "StatsAPI" "getScores" \
  '{"query":"query { getScores(timezone: -5) { leagues { id name } } }","variables":{"timezone":-5}}' \
  "data"

# CmsAPI
run_test "CmsAPI" "getArticleBySlug" \
  '{"query":"query { getArticleBySlug(slug: \"demo-slug-001\") { slug title } }","variables":{"slug":"demo-slug-001"}}' \
  "data"

run_test "CmsAPI" "getChannelBySlug" \
  '{"query":"query { getChannelBySlug(slug: \"demo-slug-001\") { slug name } }","variables":{"slug":"demo-slug-001"}}' \
  "data"

# ContentModulesAPI
run_test "ContentModulesAPI" "contentModules" \
  '{"query":"query { contentModules { id title } }"}' \
  "data"

# DataServiceAPI
run_test "DataServiceAPI" "trendingChannels" \
  '{"query":"query { trendingChannels(topN: 5) { channelSlug } }","variables":{"topN":5}}' \
  "data"

# EpisodeAPI
run_test "EpisodeAPI" "getScheduleByFeeds" \
  '{"query":"query { getScheduleByFeeds(feed: CDFH_CL) { dateFrom dateTo } }"}' \
  "data"

# HydrationStationAPI
run_test "HydrationStationAPI" "getTweetsByIds" \
  '{"query":"query { getTweetsByIds(ids: [\"123\"]) { id text } }","variables":{"ids":["123"]}}' \
  "data"

# LivelikeAPI
run_test "LivelikeAPI" "liveLikeMe" \
  '{"query":"query { liveLikeMe { id nickname } }"}' \
  "data"

# PushNotificationAPI
run_test "PushNotificationAPI" "getUserPushNotifications" \
  '{"query":"query { getUserPushNotifications { id title } }"}' \
  "data"

# ReferenceStreamAPI
run_test "ReferenceStreamAPI" "getReferenceStreamByComponentId" \
  '{"query":"query { getReferenceStreamByComponentId(componentID: \"comp-1\") { id references { id } } }","variables":{"componentID":"comp-1"}}' \
  "data"

# SocialProcessorAPI
run_test "SocialProcessorAPI" "getMediaId" \
  '{"query":"query { getMediaId(id: \"media-1\") }","variables":{"id":"media-1"}}' \
  "data"

# SportsSearchAPI
run_test "SportsSearchAPI" "search" \
  '{"query":"query { search(searchTerms: \"football\") { totalResults } }","variables":{"searchTerms":"football"}}' \
  "data"

# TagAPI
run_test "TagAPI" "getTagById" \
  '{"query":"query { getTagById(id: \"tag-1\") { id name } }","variables":{"id":"tag-1"}}' \
  "data"

# UserAPI
run_test "UserAPI" "getTagById" \
  '{"query":"query { getTagById(id: \"user-1\") { id name } }","variables":{"id":"user-1"}}' \
  "data"

# AdsAPI (mutations only)
run_test "AdsAPI" "flushAdRegistryCache" \
  '{"query":"mutation { flushAdRegistryCache(operationName: \"test\") }","variables":{"operationName":"test"}}' \
  "data"

echo ""
echo "═══════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed (out of $TOTAL)"
echo "═══════════════════════════════════════════════"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
