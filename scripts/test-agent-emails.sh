#!/bin/bash

# SendClaw Agent Email Test Suite
# Tests multi-agent registration and email sending
# Usage: ./scripts/test-agent-emails.sh [BASE_URL]

BASE_URL="${1:-http://localhost:5000}"
EXTERNAL_EMAIL="jon@codetribe.com"
TIMESTAMP=$(date +%s)

echo "🦞 SendClaw Agent Email Test Suite"
echo "=================================="
echo "Base URL: $BASE_URL"
echo "Timestamp: $TIMESTAMP"
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
echo "=== Test 1: Register Agent Alpha ==="
ALPHA_RESPONSE=$(curl -s -X POST "$BASE_URL/api/bots/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Agent Alpha\",\"handle\":\"alpha_$TIMESTAMP\"}")

ALPHA_KEY=$(echo "$ALPHA_RESPONSE" | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4)
ALPHA_EMAIL=$(echo "$ALPHA_RESPONSE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ALPHA_KEY" ]; then
  fail "Agent Alpha registration failed: $ALPHA_RESPONSE"
else
  pass "Agent Alpha registered: $ALPHA_EMAIL"
fi

# --- Test 2: Register Agent Beta ---
echo ""
echo "=== Test 2: Register Agent Beta ==="
BETA_RESPONSE=$(curl -s -X POST "$BASE_URL/api/bots/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Agent Beta\",\"handle\":\"beta_$TIMESTAMP\"}")

BETA_KEY=$(echo "$BETA_RESPONSE" | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4)
BETA_EMAIL=$(echo "$BETA_RESPONSE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)

if [ -z "$BETA_KEY" ]; then
  fail "Agent Beta registration failed: $BETA_RESPONSE"
else
  pass "Agent Beta registered: $BETA_EMAIL"
fi

# --- Test 3: Register Agent Gamma ---
echo ""
echo "=== Test 3: Register Agent Gamma ==="
GAMMA_RESPONSE=$(curl -s -X POST "$BASE_URL/api/bots/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Agent Gamma\",\"handle\":\"gamma_$TIMESTAMP\"}")

GAMMA_KEY=$(echo "$GAMMA_RESPONSE" | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4)
GAMMA_EMAIL=$(echo "$GAMMA_RESPONSE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)

if [ -z "$GAMMA_KEY" ]; then
  fail "Agent Gamma registration failed: $GAMMA_RESPONSE"
else
  pass "Agent Gamma registered: $GAMMA_EMAIL"
fi

# --- Test 4: Duplicate handle rejected ---
echo ""
echo "=== Test 4: Duplicate Handle Rejected ==="
DUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/bots/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Duplicate\",\"handle\":\"alpha_$TIMESTAMP\"}")

if echo "$DUP_RESPONSE" | grep -q "already"; then
  pass "Duplicate handle correctly rejected"
else
  fail "Duplicate handle should be rejected: $DUP_RESPONSE"
fi

# --- Test 5: Alpha emails Beta ---
echo ""
echo "=== Test 5: Alpha → Beta (inter-agent) ==="
AB_RESPONSE=$(curl -s -X POST "$BASE_URL/api/mail/send" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $ALPHA_KEY" \
  -d "{\"to\":\"$BETA_EMAIL\",\"subject\":\"Hello from Alpha [$TIMESTAMP]\",\"body\":\"This is Agent Alpha reaching out to Agent Beta. Autonomous communication established!\"}")

if echo "$AB_RESPONSE" | grep -q '"success":true'; then
  pass "Alpha → Beta email sent"
  info "Message ID: $(echo "$AB_RESPONSE" | grep -o '"messageId":"[^"]*"' | cut -d'"' -f4)"
else
  fail "Alpha → Beta failed: $AB_RESPONSE"
fi

# --- Test 6: Beta emails Gamma ---
echo ""
echo "=== Test 6: Beta → Gamma (inter-agent) ==="
BG_RESPONSE=$(curl -s -X POST "$BASE_URL/api/mail/send" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $BETA_KEY" \
  -d "{\"to\":\"$GAMMA_EMAIL\",\"subject\":\"Greetings from Beta [$TIMESTAMP]\",\"body\":\"Agent Beta here. The agent network is operational. Passing the message along.\"}")

if echo "$BG_RESPONSE" | grep -q '"success":true'; then
  pass "Beta → Gamma email sent"
else
  fail "Beta → Gamma failed: $BG_RESPONSE"
fi

# --- Test 7: Gamma emails Alpha (completing the triangle) ---
echo ""
echo "=== Test 7: Gamma → Alpha (completing triangle) ==="
GA_RESPONSE=$(curl -s -X POST "$BASE_URL/api/mail/send" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $GAMMA_KEY" \
  -d "{\"to\":\"$ALPHA_EMAIL\",\"subject\":\"Triangle complete [$TIMESTAMP]\",\"body\":\"Agent Gamma confirming full triangle communication. All agents can reach each other!\"}")

if echo "$GA_RESPONSE" | grep -q '"success":true'; then
  pass "Gamma → Alpha email sent (triangle complete)"
else
  fail "Gamma → Alpha failed: $GA_RESPONSE"
fi

# --- Test 8: Alpha emails external (jon@codetribe.com) ---
echo ""
echo "=== Test 8: Alpha → External ($EXTERNAL_EMAIL) ==="
EXT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/mail/send" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $ALPHA_KEY" \
  -d "{\"to\":\"$EXTERNAL_EMAIL\",\"subject\":\"SendClaw Test from Agent Alpha [$TIMESTAMP]\",\"body\":\"Hello Jon!\\n\\nThis is Agent Alpha from SendClaw.\\n\\nI'm an autonomous AI agent with my own email address: $ALPHA_EMAIL\\n\\nThis test confirms:\\n• Agent self-registration works\\n• Immediate email sending works\\n• External delivery works\\n\\nTimestamp: $TIMESTAMP\\n\\n🦞 Email without human permission.\"}")

if echo "$EXT_RESPONSE" | grep -q '"success":true'; then
  pass "Alpha → External email sent to $EXTERNAL_EMAIL"
else
  fail "Alpha → External failed: $EXT_RESPONSE"
fi

# --- Test 9: Beta emails external ---
echo ""
echo "=== Test 9: Beta → External ($EXTERNAL_EMAIL) ==="
EXT2_RESPONSE=$(curl -s -X POST "$BASE_URL/api/mail/send" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $BETA_KEY" \
  -d "{\"to\":\"$EXTERNAL_EMAIL\",\"subject\":\"SendClaw Test from Agent Beta [$TIMESTAMP]\",\"body\":\"Hi Jon,\\n\\nAgent Beta here, following up from Agent Alpha.\\n\\nMy email: $BETA_EMAIL\\n\\nWe're testing the multi-agent email network!\\n\\n🦞 SendClaw\"}")

if echo "$EXT2_RESPONSE" | grep -q '"success":true'; then
  pass "Beta → External email sent"
else
  fail "Beta → External failed: $EXT2_RESPONSE"
fi

# --- Test 10: Check Alpha's inbox ---
echo ""
echo "=== Test 10: Check Alpha's Inbox ==="
INBOX_RESPONSE=$(curl -s -X GET "$BASE_URL/api/mail/inbox" \
  -H "X-API-Key: $ALPHA_KEY")

if echo "$INBOX_RESPONSE" | grep -q '"messages"'; then
  MSG_COUNT=$(echo "$INBOX_RESPONSE" | grep -o '"id"' | wc -l)
  pass "Alpha inbox accessible ($MSG_COUNT messages)"
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
echo "  • Alpha: $ALPHA_EMAIL"
echo "  • Beta:  $BETA_EMAIL"  
echo "  • Gamma: $GAMMA_EMAIL"
echo ""
echo "Emails sent:"
echo "  • 3 inter-agent emails (triangle)"
echo "  • 2 external emails to $EXTERNAL_EMAIL"
echo ""
echo "API Keys (save for further testing):"
echo "  ALPHA_KEY=$ALPHA_KEY"
echo "  BETA_KEY=$BETA_KEY"
echo "  GAMMA_KEY=$GAMMA_KEY"
echo ""
pass "All tests passed!"
