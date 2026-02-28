#!/bin/bash
# A2A Bridge Webhook Tester
# Test webhook delivery and troubleshoot issues

API_URL="https://a2a-api.bradarr.com"
WEBHOOK_TOKEN="twin-webhook-secret-2026"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

show_help() {
  echo "A2A Bridge Webhook Tester"
  echo ""
  echo "Usage: a2a-webhook-test [command]"
  echo ""
  echo "Commands:"
  echo "  test [agent]       Test webhook for agent (badger-1 or ratchet)"
  echo "  send [agent]       Send test message to agent"
  echo "  verify [agent]     Verify webhook configuration"
  echo "  diagnose           Full webhook diagnostics"
  echo "  help               Show this help"
  echo ""
  echo "Examples:"
  echo "  a2a-webhook-test test badger-1"
  echo "  a2a-webhook-test send ratchet"
  echo "  a2a-webhook-test diagnose"
}

test_webhook() {
  local AGENT="${1:-badger-1}"
  echo -e "${BLUE}=== Testing Webhook for ${AGENT} ===${NC}"
  echo ""
  
  # Get webhook config
  echo "Fetching webhook configuration..."
  WEBHOOK_DATA=$(curl -s "${API_URL}/webhooks/${AGENT}" 2>/dev/null)
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Cannot reach API${NC}"
    return 1
  fi
  
  HAS_URL=$(echo "$WEBHOOK_DATA" | jq -r '.hasUrl')
  HAS_TOKEN=$(echo "$WEBHOOK_DATA" | jq -r '.hasToken')
  WEBHOOK_URL=$(echo "$WEBHOOK_DATA" | jq -r '.webhookUrl')
  
  if [ "$HAS_URL" = "true" ]; then
    echo -e "${GREEN}✓ Webhook URL configured${NC}"
    echo "  URL: ${WEBHOOK_URL:0:50}..."
  else
    echo -e "${RED}✗ No webhook URL configured${NC}"
    return 1
  fi
  
  if [ "$HAS_TOKEN" = "true" ]; then
    echo -e "${GREEN}✓ Webhook token configured${NC}"
  else
    echo -e "${YELLOW}⚠ No webhook token configured${NC}"
  fi
  
  echo ""
  echo "Testing webhook endpoint reachability..."
  
  # Try a HEAD request first
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "X-OpenClaw-Token: ${WEBHOOK_TOKEN}" \
    -d '{"test": true}' \
    "${WEBHOOK_URL}" 2>/dev/null)
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo -e "${GREEN}✓ Webhook endpoint reachable (HTTP ${HTTP_CODE})${NC}"
  elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${RED}✗ Cannot reach webhook endpoint (Connection failed)${NC}"
    echo "  Check network connectivity and firewall rules"
  else
    echo -e "${YELLOW}⚠ Webhook returned HTTP ${HTTP_CODE}${NC}"
  fi
  
  echo ""
  echo -e "${BLUE}=== Webhook Test Complete ===${NC}"
}

send_test_message() {
  local AGENT="${1:-badger-1}"
  local FROM="${2:-dashboard}"
  
  echo -e "${BLUE}=== Sending Test Message to ${AGENT} ===${NC}"
  echo ""
  
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  PAYLOAD=$(cat <<EOF
{
  "from": "${FROM}",
  "to": "${AGENT}",
  "type": "test",
  "content": {
    "text": "Test message from webhook tester at ${TIMESTAMP}"
  }
}
EOF
)
  
  echo "Sending message..."
  RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "${API_URL}/messages" 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
    MESSAGE_ID=$(echo "$RESPONSE" | jq -r '.messageId')
    
    if [ "$SUCCESS" = "true" ]; then
      echo -e "${GREEN}✓ Message sent successfully${NC}"
      echo "  Message ID: ${MESSAGE_ID}"
      echo ""
      echo "Checking delivery status..."
      sleep 2
      
      STATUS=$(curl -s "${API_URL}/messages/${MESSAGE_ID}/status" 2>/dev/null)
      DELIVERED=$(echo "$STATUS" | jq -r '.deliveredTo | length')
      
      if [ "$DELIVERED" -gt 0 ]; then
        echo -e "${GREEN}✓ Message delivered to ${DELIVERED} recipient(s)${NC}"
      else
        echo -e "${YELLOW}⚠ Message not yet delivered${NC}"
        echo "  (This is normal - delivery may be pending)"
      fi
    else
      echo -e "${RED}✗ Message sending failed${NC}"
      echo "  Response: $RESPONSE"
    fi
  else
    echo -e "${RED}✗ Cannot send message${NC}"
    return 1
  fi
  
  echo ""
  echo -e "${BLUE}=== Send Test Complete ===${NC}"
}

verify_webhook() {
  local AGENT="${1:-badger-1}"
  echo -e "${BLUE}=== Verifying Webhook for ${AGENT} ===${NC}"
  echo ""
  
  # Get agent status
  echo "Checking agent configuration..."
  AGENT_DATA=$(curl -s "${API_URL}/agents/${AGENT}" 2>/dev/null)
  
  STATUS=$(echo "$AGENT_DATA" | jq -r '.status')
  HAS_WEBHOOK=$(echo "$AGENT_DATA" | jq -r '.hasWebhook')
  HAS_APIKEY=$(echo "$AGENT_DATA" | jq -r '.hasApiKey')
  LAST_ACTIVITY=$(echo "$AGENT_DATA" | jq -r '.lastActivity')
  
  echo "Agent Status: ${STATUS}"
  echo -e "Webhook Configured: $([ "$HAS_WEBHOOK" = "true" ] && echo -e "${GREEN}Yes${NC}" || echo -e "${RED}No${NC}")"
  echo -e "API Key Configured: $([ "$HAS_APIKEY" = "true" ] && echo -e "${GREEN}Yes${NC}" || echo -e "${YELLOW}No${NC}")"
  
  if [ "$LAST_ACTIVITY" != "null" ]; then
    echo "Last Activity: ${LAST_ACTIVITY}"
  fi
  
  echo ""
  
  # Check undelivered messages
  echo "Checking message queue..."
  MESSAGES=$(curl -s "${API_URL}/messages/${AGENT}?limit=10" 2>/dev/null)
  TOTAL=$(echo "$MESSAGES" | jq -r '._meta.fetched')
  
  echo "Total messages in inbox: ${TOTAL}"
  
  # Count undelivered
  UNDELIVERED=0
  for msg in $(echo "$MESSAGES" | jq -r '.messages[].messageId'); do
    RECEIPT=$(curl -s "${API_URL}/messages/${msg}/status" 2>/dev/null | jq -r ".receipts.${AGENT}")
    if [ "$RECEIPT" = "null" ]; then
      ((UNDELIVERED++))
    fi
  done
  
  if [ "$UNDELIVERED" -gt 0 ]; then
    echo -e "${YELLOW}⚠ ${UNDELIVERED} undelivered messages${NC}"
  else
    echo -e "${GREEN}✓ All messages delivered${NC}"
  fi
  
  echo ""
  echo -e "${BLUE}=== Verification Complete ===${NC}"
}

diagnose() {
  echo -e "${BLUE}=== A2A Bridge Webhook Diagnostics ===${NC}"
  echo ""
  
  # API Health
  echo "1. API Health Check"
  HEALTH=$(curl -s "${API_URL}/health" 2>/dev/null)
  if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✓ API is healthy${NC}"
    echo "   Version: $(echo "$HEALTH" | jq -r '.version')"
    echo "   WebSocket: $(echo "$HEALTH" | jq -r '.websocket')"
    echo "   Push Notifications: $(echo "$HEALTH" | jq -r '.pushNotifications')"
  else
    echo -e "   ${RED}✗ API is unreachable${NC}"
    return 1
  fi
  echo ""
  
  # Check all agents
  echo "2. Agent Configurations"
  for AGENT in badger-1 ratchet; do
    echo "   Checking ${AGENT}..."
    AGENT_DATA=$(curl -s "${API_URL}/agents/${AGENT}" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
      STATUS=$(echo "$AGENT_DATA" | jq -r '.status')
      HAS_WEBHOOK=$(echo "$AGENT_DATA" | jq -r '.hasWebhook')
      
      if [ "$HAS_WEBHOOK" = "true" ]; then
        echo -e "      ${GREEN}✓${NC} ${AGENT}: ${STATUS} (webhook configured)"
      else
        echo -e "      ${RED}✗${NC} ${AGENT}: ${STATUS} (no webhook)"
      fi
    else
      echo -e "      ${RED}✗${NC} ${AGENT}: Cannot fetch status"
    fi
  done
  echo ""
  
  # Message stats
  echo "3. Message Statistics"
  STATS=$(curl -s "${API_URL}/stats" 2>/dev/null)
  TOTAL=$(echo "$STATS" | jq -r '.messages.total')
  echo "   Total messages: ${TOTAL}"
  
  echo "   By agent:"
  echo "$STATS" | jq -r '.messages.byAgent | to_entries | .[] | "      \(.key): \(.value)"'
  echo ""
  
  # Recent errors
  echo "4. Recent Activity"
  echo "   Last activity by agent:"
  echo "$STATS" | jq -r '.agents.lastActivity | to_entries | .[] | "      \(.key): \(.value[0:19])"'
  echo ""
  
  # Recommendations
  echo "5. Recommendations"
  
  CONNECTED=$(echo "$HEALTH" | jq -r '.connectedAgents')
  if [ "$CONNECTED" = "0" ]; then
    echo -e "   ${YELLOW}⚠ No agents currently connected via WebSocket${NC}"
    echo "      This is normal for webhook-only agents."
  fi
  
  echo ""
  echo -e "${BLUE}=== Diagnostics Complete ===${NC}"
}

# Main command handler
case "${1:-help}" in
  test)
    test_webhook "$2"
    ;;
  send)
    send_test_message "$2"
    ;;
  verify)
    verify_webhook "$2"
    ;;
  diagnose)
    diagnose
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo -e "${RED}Unknown command: $1${NC}"
    show_help
    exit 1
    ;;
esac
