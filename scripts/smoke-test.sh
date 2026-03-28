#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# Open Classroom — E2E Smoke Test
#
# Tests every major feature against the live production site.
# Usage:
#   ./scripts/smoke-test.sh                    # uses default base URL
#   ./scripts/smoke-test.sh https://your-url   # custom base URL
#   TEST_EMAIL=x TEST_PASSWORD=y ./scripts/smoke-test.sh  # use existing account
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

BASE_URL="${1:-https://www.openclassroom.online}"
PASS=0
FAIL=0
SKIP=0
RESULTS=()

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Test account — override with env vars if you have an existing account
TEST_EMAIL="${TEST_EMAIL:-smoketest_$(date +%s)@test.openclassroom.online}"
TEST_PASSWORD="${TEST_PASSWORD:-SmokeTest123!}"
TEST_NAME="${TEST_NAME:-Smoke Test}"
TEST_MOBILE="${TEST_MOBILE:-9999999999}"

# Session cookie jar
COOKIE_JAR=$(mktemp)
trap "rm -f $COOKIE_JAR" EXIT

# ─── Helpers ──────────────────────────────────────────────────────────

log_test() {
  local status="$1" name="$2" detail="${3:-}"
  if [ "$status" = "PASS" ]; then
    PASS=$((PASS + 1))
    RESULTS+=("${GREEN}✓${NC} $name")
    echo -e "  ${GREEN}✓${NC} $name"
  elif [ "$status" = "FAIL" ]; then
    FAIL=$((FAIL + 1))
    RESULTS+=("${RED}✗${NC} $name ${RED}— $detail${NC}")
    echo -e "  ${RED}✗${NC} $name — $detail"
  else
    SKIP=$((SKIP + 1))
    RESULTS+=("${YELLOW}○${NC} $name ${YELLOW}— $detail${NC}")
    echo -e "  ${YELLOW}○${NC} $name — $detail"
  fi
}

api() {
  # Usage: api METHOD path [body]
  local method="$1" path="$2" body="${3:-}"
  local url="${BASE_URL}${path}"
  local args=(-s -w "\n%{http_code}" -b "$COOKIE_JAR" -c "$COOKIE_JAR")

  if [ "$method" = "POST" ] && [ -n "$body" ]; then
    args+=(-X POST -H "Content-Type: application/json" -d "$body")
  elif [ "$method" = "POST" ]; then
    args+=(-X POST -H "Content-Type: application/json")
  fi

  curl "${args[@]}" "$url"
}

extract_status() {
  echo "$1" | tail -n1
}

extract_body() {
  echo "$1" | sed '$d'
}

json_field() {
  echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$2',''))" 2>/dev/null || echo ""
}

# ═══════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║   Open Classroom — E2E Smoke Test Suite      ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo -e "  Target: ${BOLD}$BASE_URL${NC}"
echo -e "  Account: $TEST_EMAIL"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# 1. PUBLIC ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════
echo -e "${BOLD}▸ Public Endpoints${NC}"

# 1a. Landing page loads
resp=$(api GET "/")
status=$(extract_status "$resp")
if [ "$status" = "200" ]; then
  log_test PASS "Landing page (GET /)"
else
  log_test FAIL "Landing page (GET /)" "HTTP $status"
fi

# 1b. Server providers API
resp=$(api GET "/api/server-providers")
status=$(extract_status "$resp")
body=$(extract_body "$resp")
if [ "$status" = "200" ]; then
  has_openai=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print('openai' in d.get('providers',{}))" 2>/dev/null)
  if [ "$has_openai" = "True" ]; then
    log_test PASS "Server providers — OpenAI configured"
  else
    log_test FAIL "Server providers" "OpenAI not in providers list"
  fi
else
  log_test FAIL "Server providers (GET /api/server-providers)" "HTTP $status"
fi

# 1c. Health check
resp=$(api GET "/api/health")
status=$(extract_status "$resp")
if [ "$status" = "200" ]; then
  log_test PASS "Health check (GET /api/health)"
else
  log_test SKIP "Health check" "HTTP $status (may not exist)"
fi

# 1d. Sitemap
resp=$(api GET "/sitemap.xml")
status=$(extract_status "$resp")
body=$(extract_body "$resp")
if [ "$status" = "200" ] && echo "$body" | grep -q "urlset"; then
  log_test PASS "Sitemap (GET /sitemap.xml)"
else
  log_test FAIL "Sitemap" "HTTP $status or invalid XML"
fi

# 1e. Robots.txt
resp=$(api GET "/robots.txt")
status=$(extract_status "$resp")
body=$(extract_body "$resp")
if [ "$status" = "200" ] && echo "$body" | grep -q "Disallow"; then
  log_test PASS "Robots.txt (GET /robots.txt)"
else
  log_test FAIL "Robots.txt" "HTTP $status"
fi

# 1f. OG Image
resp=$(curl -s -o /dev/null -w "%{http_code}|%{content_type}" "$BASE_URL/api/og")
status=$(echo "$resp" | cut -d'|' -f1)
ctype=$(echo "$resp" | cut -d'|' -f2)
if [ "$status" = "200" ] && echo "$ctype" | grep -q "image"; then
  log_test PASS "OG Image (GET /api/og) — $ctype"
else
  log_test FAIL "OG Image" "HTTP $status, type=$ctype"
fi

# ═══════════════════════════════════════════════════════════════════════
# 2. AUTH — PROTECTED ROUTES REJECT UNAUTHENTICATED
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}▸ Auth Guards (unauthenticated → 401)${NC}"

for route in "/api/chat" "/api/generate-classroom" \
  "/api/generate/scene-content" "/api/generate/agent-profiles" \
  "/api/quiz/generate" "/api/interview/session" "/api/web-search" \
  "/api/parse-pdf" "/api/pbl/chat"; do

  resp=$(api POST "$route" '{}')
  status=$(extract_status "$resp")
  if [ "$status" = "401" ]; then
    log_test PASS "POST $route → 401"
  else
    log_test FAIL "POST $route → 401" "got HTTP $status"
  fi
done

# ═══════════════════════════════════════════════════════════════════════
# 3. SIGNUP + LOGIN
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}▸ Authentication Flow${NC}"

# 3a. Signup
resp=$(api POST "/api/auth/signup" "{\"name\":\"$TEST_NAME\",\"email\":\"$TEST_EMAIL\",\"mobile\":\"$TEST_MOBILE\",\"password\":\"$TEST_PASSWORD\"}")
status=$(extract_status "$resp")
body=$(extract_body "$resp")
signup_ok=false
if [ "$status" = "200" ]; then
  credits=$(json_field "$body" "credits" 2>/dev/null || echo "")
  log_test PASS "Signup — new account created (credits: $credits)"
  signup_ok=true
elif [ "$status" = "409" ]; then
  log_test PASS "Signup — account already exists (reusing)"
  signup_ok=true
else
  log_test FAIL "Signup" "HTTP $status — $(echo "$body" | head -c 200)"
fi

# 3b. Login via NextAuth credentials
if [ "$signup_ok" = true ]; then
  # Get CSRF token first
  csrf_resp=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE_URL/api/auth/csrf")
  csrf_token=$(echo "$csrf_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('csrfToken',''))" 2>/dev/null)

  if [ -n "$csrf_token" ]; then
    # Login with credentials
    login_resp=$(curl -s -w "\n%{http_code}" -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
      -X POST "$BASE_URL/api/auth/callback/credentials" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -d "csrfToken=$csrf_token&email=$TEST_EMAIL&password=$TEST_PASSWORD&redirect=false&callbackUrl=$BASE_URL/create" \
      -L)
    login_status=$(extract_status "$login_resp")

    # Check if we got a session
    session_resp=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/auth/session")
    session_email=$(echo "$session_resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('email',''))" 2>/dev/null)

    if [ "$session_email" = "$TEST_EMAIL" ]; then
      log_test PASS "Login — session active ($session_email)"
    else
      log_test FAIL "Login" "Session not established (email='$session_email')"
    fi
  else
    log_test FAIL "Login" "Could not get CSRF token"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════
# 4. AUTHENTICATED API TESTS
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}▸ Authenticated API Tests${NC}"

# 4a. Credits balance
resp=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" "$BASE_URL/api/credits")
status=$(extract_status "$resp")
body=$(extract_body "$resp")
if [ "$status" = "200" ]; then
  credits=$(json_field "$body" "credits")
  log_test PASS "Credits API — balance: $credits"
else
  log_test FAIL "Credits API" "HTTP $status"
fi

# 4b. TTS voices endpoint
resp=$(api GET "/api/tts/voices")
status=$(extract_status "$resp")
if [ "$status" = "200" ]; then
  log_test PASS "TTS voices (GET /api/tts/voices)"
else
  log_test SKIP "TTS voices" "HTTP $status"
fi

# 4c. Generate agent profiles (lightweight test — small payload)
resp=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/generate/agent-profiles" \
  -H "Content-Type: application/json" \
  -H "x-model: openai:gpt-4o-mini-2024-07-18" \
  -d '{"stageInfo":{"name":"Test","description":"Quick smoke test"},"language":"en-US","availableAvatars":["/avatars/teacher.png","/avatars/assist.png"]}')
status=$(extract_status "$resp")
body=$(extract_body "$resp")
if [ "$status" = "200" ]; then
  has_agents=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('agents',[]))>0)" 2>/dev/null)
  if [ "$has_agents" = "True" ]; then
    log_test PASS "Agent profiles generation — agents returned"
  else
    log_test FAIL "Agent profiles" "No agents in response"
  fi
elif [ "$status" = "402" ]; then
  log_test SKIP "Agent profiles" "Insufficient credits (expected for test account)"
else
  log_test FAIL "Agent profiles generation" "HTTP $status — $(echo "$body" | head -c 200)"
fi

# 4d. TTS generation (small text)
resp=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/generate/tts" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","providerId":"openai-tts","voice":"alloy","speed":1}')
status=$(extract_status "$resp")
if [ "$status" = "200" ]; then
  log_test PASS "TTS generation (OpenAI) — audio returned"
elif [ "$status" = "401" ]; then
  log_test FAIL "TTS generation" "Got 401 — auth issue"
else
  log_test SKIP "TTS generation" "HTTP $status (may need API key)"
fi

# ═══════════════════════════════════════════════════════════════════════
# 5. STATIC PAGES
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}▸ Page Rendering${NC}"

for page in "/" "/login" "/signup" "/create" "/library" \
  "/payment/success" "/payment/failed"; do
  resp=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$page")
  if [ "$resp" = "200" ]; then
    log_test PASS "GET $page"
  elif [ "$resp" = "307" ] || [ "$resp" = "302" ]; then
    log_test PASS "GET $page → redirect ($resp)"
  else
    log_test FAIL "GET $page" "HTTP $resp"
  fi
done

# ═══════════════════════════════════════════════════════════════════════
# 6. RATE LIMITING CHECK
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}▸ Rate Limiting${NC}"

# Send a burst of requests to check rate limiter responds
got_429=false
for i in $(seq 1 3); do
  resp=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
    -X POST "$BASE_URL/api/generate/scene-outlines-stream" \
    -H "Content-Type: application/json" \
    -d '{}')
  status=$(extract_status "$resp")
  if [ "$status" = "429" ]; then
    got_429=true
    break
  fi
done
if [ "$got_429" = true ]; then
  log_test PASS "Rate limiter responds with 429"
else
  log_test SKIP "Rate limiter" "Did not trigger 429 in 3 requests (Redis may not be configured)"
fi

# ═══════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  RESULTS: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, ${YELLOW}$SKIP skipped${NC}"
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}${BOLD}Some tests failed. Review output above.${NC}"
  exit 1
else
  echo -e "${GREEN}${BOLD}All tests passed!${NC}"
  exit 0
fi
