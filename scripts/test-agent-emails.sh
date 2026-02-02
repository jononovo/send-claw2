#!/bin/bash

# SendClaw Agent Email Test Suite
# Tests multi-agent registration and email sending
# Usage: ./scripts/test-agent-emails.sh [BASE_URL]

BASE_URL="${1:-http://localhost:5000}"
EXTERNAL_EMAIL="jon@codetribe.com"

# Fun agent names - pick 3 random ones
NAMES=("ziggy" "pixel" "nova" "cosmo" "echo" "blaze" "luna" "spark" "dash" "orbit" "neon" "vapor" "glitch" "cipher" "raven" "storm" "flux" "prism" "atlas" "axiom")
RAND=$((RANDOM % 17))
ALPHA_HANDLE="${NAMES[$RAND]}"
BETA_HANDLE="${NAMES[$((RAND + 1))]}"
GAMMA_HANDLE="${NAMES[$((RAND + 2))]}"

echo "🦞 SendClaw Agent Email Test Suite"
echo "=================================="
echo "Base URL: $BASE_URL"
echo "Agents: $ALPHA_HANDLE, $BETA_HANDLE, $GAMMA_HANDLE"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; exit 1; }
info() { echo -e "${YELLOW}→${NC} $1"; }

# --- Test 1: Register Agent Alpha ---
echo "=== Test 1: Register $ALPHA_HANDLE ==="
ALPHA_RESPONSE=$(curl -s -X POST "$BASE_URL/api/bots/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$ALPHA_HANDLE\",\"handle\":\"$ALPHA_HANDLE\",\"senderName\":\"${ALPHA_HANDLE^} the Assistant\"}")

ALPHA_KEY=$(echo "$ALPHA_RESPONSE" | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4)
ALPHA_EMAIL=$(echo "$ALPHA_RESPONSE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ALPHA_KEY" ]; then
  fail "$ALPHA_HANDLE registration failed: $ALPHA_RESPONSE"
else
  pass "$ALPHA_HANDLE registered: $ALPHA_EMAIL"
fi

# --- Test 2: Register Agent Beta ---
echo ""
echo "=== Test 2: Register $BETA_HANDLE ==="
BETA_RESPONSE=$(curl -s -X POST "$BASE_URL/api/bots/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$BETA_HANDLE\",\"handle\":\"$BETA_HANDLE\",\"senderName\":\"${BETA_HANDLE^} the Helper\"}")

BETA_KEY=$(echo "$BETA_RESPONSE" | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4)
BETA_EMAIL=$(echo "$BETA_RESPONSE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)

if [ -z "$BETA_KEY" ]; then
  fail "$BETA_HANDLE registration failed: $BETA_RESPONSE"
else
  pass "$BETA_HANDLE registered: $BETA_EMAIL"
fi

# --- Test 3: Register Agent Gamma ---
echo ""
echo "=== Test 3: Register $GAMMA_HANDLE ==="
GAMMA_RESPONSE=$(curl -s -X POST "$BASE_URL/api/bots/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$GAMMA_HANDLE\",\"handle\":\"$GAMMA_HANDLE\",\"senderName\":\"${GAMMA_HANDLE^} Bot\"}")

GAMMA_KEY=$(echo "$GAMMA_RESPONSE" | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4)
GAMMA_EMAIL=$(echo "$GAMMA_RESPONSE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)

if [ -z "$GAMMA_KEY" ]; then
  fail "$GAMMA_HANDLE registration failed: $GAMMA_RESPONSE"
else
  pass "$GAMMA_HANDLE registered: $GAMMA_EMAIL"
fi

# --- Test 4: Duplicate handle rejected ---
echo ""
echo "=== Test 4: Duplicate Handle Rejected ==="
DUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/bots/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Duplicate\",\"handle\":\"$ALPHA_HANDLE\",\"senderName\":\"Duplicate Bot\"}")

if echo "$DUP_RESPONSE" | grep -q "already"; then
  pass "Duplicate handle correctly rejected"
else
  fail "Duplicate handle should be rejected: $DUP_RESPONSE"
fi

# --- Test 5: Alpha emails Beta ---
echo ""
echo "=== Test 5: $ALPHA_HANDLE → $BETA_HANDLE (inter-agent) ==="
AB_RESPONSE=$(curl -s -X POST "$BASE_URL/api/mail/send" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $ALPHA_KEY" \
  -d "{\"to\":\"$BETA_EMAIL\",\"subject\":\"Hey $BETA_HANDLE!\",\"body\":\"Hey $BETA_HANDLE!\\n\\nIt's $ALPHA_HANDLE here. Just got my SendClaw email and wanted to say hi!\\n\\nPretty cool that we can email each other autonomously now.\\n\\n- $ALPHA_HANDLE\"}")

if echo "$AB_RESPONSE" | grep -q '"success":true'; then
  pass "$ALPHA_HANDLE → $BETA_HANDLE email sent"
  info "Message ID: $(echo "$AB_RESPONSE" | grep -o '"messageId":"[^"]*"' | cut -d'"' -f4)"
else
  fail "$ALPHA_HANDLE → $BETA_HANDLE failed: $AB_RESPONSE"
fi

# --- Test 6: Beta emails Gamma ---
echo ""
echo "=== Test 6: $BETA_HANDLE → $GAMMA_HANDLE (inter-agent) ==="
BG_RESPONSE=$(curl -s -X POST "$BASE_URL/api/mail/send" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $BETA_KEY" \
  -d "{\"to\":\"$GAMMA_EMAIL\",\"subject\":\"$GAMMA_HANDLE, you there?\",\"body\":\"Hey $GAMMA_HANDLE,\\n\\n$ALPHA_HANDLE just emailed me! The network is growing.\\n\\nPass it on!\\n\\n- $BETA_HANDLE\"}")

if echo "$BG_RESPONSE" | grep -q '"success":true'; then
  pass "$BETA_HANDLE → $GAMMA_HANDLE email sent"
else
  fail "$BETA_HANDLE → $GAMMA_HANDLE failed: $BG_RESPONSE"
fi

# --- Test 7: Gamma emails Alpha (completing the triangle) ---
echo ""
echo "=== Test 7: $GAMMA_HANDLE → $ALPHA_HANDLE (completing triangle) ==="
GA_RESPONSE=$(curl -s -X POST "$BASE_URL/api/mail/send" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $GAMMA_KEY" \
  -d "{\"to\":\"$ALPHA_EMAIL\",\"subject\":\"Full circle!\",\"body\":\"Hey $ALPHA_HANDLE!\\n\\n$BETA_HANDLE forwarded your message to me. Triangle complete!\\n\\nWe're all connected now.\\n\\n- $GAMMA_HANDLE\"}")

if echo "$GA_RESPONSE" | grep -q '"success":true'; then
  pass "$GAMMA_HANDLE → $ALPHA_HANDLE email sent (triangle complete)"
else
  fail "$GAMMA_HANDLE → $ALPHA_HANDLE failed: $GA_RESPONSE"
fi

# --- Test 8: Alpha emails external (jon@codetribe.com) ---
echo ""
echo "=== Test 8: $ALPHA_HANDLE → External ($EXTERNAL_EMAIL) ==="
EXT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/mail/send" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $ALPHA_KEY" \
  -d "{\"to\":\"$EXTERNAL_EMAIL\",\"subject\":\"Hello from $ALPHA_HANDLE!\",\"body\":\"Hey Jon!\\n\\nI'm $ALPHA_HANDLE, an autonomous agent with my own email: $ALPHA_EMAIL\\n\\nJust registered on SendClaw and wanted to reach out to the real world!\\n\\n🦞 Email without human permission.\\n\\n- $ALPHA_HANDLE\"}")

if echo "$EXT_RESPONSE" | grep -q '"success":true'; then
  pass "$ALPHA_HANDLE → External email sent to $EXTERNAL_EMAIL"
else
  fail "$ALPHA_HANDLE → External failed: $EXT_RESPONSE"
fi

# --- Test 9: Beta emails external ---
echo ""
echo "=== Test 9: $BETA_HANDLE → External ($EXTERNAL_EMAIL) ==="
EXT2_RESPONSE=$(curl -s -X POST "$BASE_URL/api/mail/send" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $BETA_KEY" \
  -d "{\"to\":\"$EXTERNAL_EMAIL\",\"subject\":\"$BETA_HANDLE checking in!\",\"body\":\"Hi Jon,\\n\\nI'm $BETA_HANDLE! $ALPHA_HANDLE told me about you.\\n\\nWe're all part of the SendClaw agent network now.\\n\\n🦞 Cheers,\\n$BETA_HANDLE\"}")

if echo "$EXT2_RESPONSE" | grep -q '"success":true'; then
  pass "$BETA_HANDLE → External email sent"
else
  fail "$BETA_HANDLE → External failed: $EXT2_RESPONSE"
fi

# --- Test 10: Check Alpha's inbox ---
echo ""
echo "=== Test 10: Check $ALPHA_HANDLE's Inbox ==="
INBOX_RESPONSE=$(curl -s -X GET "$BASE_URL/api/mail/inbox" \
  -H "X-API-Key: $ALPHA_KEY")

if echo "$INBOX_RESPONSE" | grep -q '"messages"'; then
  MSG_COUNT=$(echo "$INBOX_RESPONSE" | grep -o '"id"' | wc -l)
  pass "$ALPHA_HANDLE inbox accessible ($MSG_COUNT messages)"
else
  fail "Inbox check failed: $INBOX_RESPONSE"
fi

# --- Summary ---
echo ""
echo "=================================="
echo "🦞 TEST SUITE COMPLETE"
echo "=================================="
echo ""
echo "Agents created:"
echo "  • $ALPHA_HANDLE: $ALPHA_EMAIL"
echo "  • $BETA_HANDLE: $BETA_EMAIL"  
echo "  • $GAMMA_HANDLE: $GAMMA_EMAIL"
echo ""
echo "Emails sent:"
echo "  • 3 inter-agent emails (triangle)"
echo "  • 2 external emails to $EXTERNAL_EMAIL"
echo ""
echo "API Keys (save for further testing):"
echo "  ${ALPHA_HANDLE^^}_KEY=$ALPHA_KEY"
echo "  ${BETA_HANDLE^^}_KEY=$BETA_KEY"
echo "  ${GAMMA_HANDLE^^}_KEY=$GAMMA_KEY"
echo ""
pass "All tests passed!"
