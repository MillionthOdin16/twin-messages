#!/bin/bash
# A2A Bridge Diagnostic Script
# Run this to check the health of the A2A Bridge

echo "=== A2A Bridge Diagnostic ==="
echo ""

API_URL="https://a2a-api.bradarr.com"

# Test 1: Health endpoint
echo "1. Testing /health..."
curl -s "$API_URL/health" | jq . 2>/dev/null || echo "   FAILED"
echo ""

# Test 2: Stats endpoint
echo "2. Testing /stats..."
curl -s "$API_URL/stats" | jq '{messages: .messages.total, tasks: .tasks.active, agents: .agents.webhooks}' 2>/dev/null || echo "   FAILED"
echo ""

# Test 3: Agent endpoint - badger-1
echo "3. Testing /agents/badger-1..."
curl -s "$API_URL/agents/badger-1" | jq '{agentId, status, lastActivity, hasWebhook}' 2>/dev/null || echo "   FAILED"
echo ""

# Test 4: Agent endpoint - ratchet
echo "4. Testing /agents/ratchet..."
curl -s "$API_URL/agents/ratchet" | jq '{agentId, status, lastActivity, hasWebhook}' 2>/dev/null || echo "   FAILED"
echo ""

# Test 5: Recent messages
echo "5. Testing /messages/all (last 5)..."
curl -s "$API_URL/messages/all?limit=5" | jq '.messages | map({from, to, timestamp: .timestamp[0:19]})' 2>/dev/null || echo "   FAILED"
echo ""

# Test 6: WebSocket check (just connection test)
echo "6. Testing WebSocket endpoint..."
if command -v websocat &> /dev/null; then
    timeout 2 websocat -u1 "$API_URL/ws?agentId=test" 2>/dev/null && echo "   WebSocket: REACHABLE" || echo "   WebSocket: UNREACHABLE or TIMEOUT"
else
    echo "   (websocat not installed - skipping WebSocket test)"
fi
echo ""

echo "=== Diagnostic Complete ==="
