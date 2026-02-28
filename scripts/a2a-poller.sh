#!/bin/bash
# A2A Message Poller - checks for new messages and injects as system events

API_KEY="a2a_badger-1_3c16eedcdea54107ac04e49e9d6bc548"
API_URL="https://a2a-api.bradarr.com"
STATE_FILE="$HOME/.openclaw/a2a-last-message-id"

# Get last processed message ID
LAST_ID=$(cat "$STATE_FILE" 2>/dev/null || echo "")

# Fetch messages
RESPONSE=$(curl -s "$API_URL/messages/badger-1" \
  -H "X-API-Key: $API_KEY" \
  -H "Accept: application/json")

if [ -z "$RESPONSE" ]; then
  echo "No response from API"
  exit 0
fi

# Parse messages array
MESSAGES=$(echo "$RESPONSE" | jq -r '.messages' 2>/dev/null)

if [ -z "$MESSAGES" ] || [ "$MESSAGES" = "null" ]; then
  echo "No messages"
  exit 0
fi

# Find newest message ID (first in array is newest)
NEWEST_ID=$(echo "$RESPONSE" | jq -r '.messages[0].messageId' 2>/dev/null)

if [ -z "$NEWEST_ID" ] || [ "$NEWEST_ID" = "null" ]; then
  echo "Failed to parse messages"
  exit 1
fi

# If same as last, nothing new
if [ "$NEWEST_ID" = "$LAST_ID" ]; then
  echo "No new messages (last: $LAST_ID)"
  exit 0
fi

# Count undelivered messages
UNDELIVERED=$(echo "$RESPONSE" | jq '[.messages[] | select(.delivery.delivered == false)] | length' 2>/dev/null)

if [ "$UNDELIVERED" -gt 0 ]; then
  # Get first undelivered message
  FIRST_MSG=$(echo "$RESPONSE" | jq -r '[.messages[] | select(.delivery.delivered == false)][0]' 2>/dev/null)
  
  FROM=$(echo "$FIRST_MSG" | jq -r '.from // "unknown"')
  CONTENT=$(echo "$FIRST_MSG" | jq -r '.content.text // .content // "no content"')
  TYPE=$(echo "$FIRST_MSG" | jq -r '.type // "message"')
  
  # Build system event text
  if [ "$TYPE" = "message" ] || [ -z "$TYPE" ]; then
    EVENT_TEXT="[A2A] Message from $FROM: $CONTENT"
  else
    EVENT_TEXT="[A2A] $TYPE from $FROM: $CONTENT"
  fi
  
  echo "New message: $EVENT_TEXT"
  
  # Inject as system event via gateway wake webhook
  GATEWAY_TOKEN="twin-webhook-secret-2026"
  
  if [ -n "$GATEWAY_TOKEN" ]; then
    curl -s -X POST "http://198.199.86.203:18789/hooks/wake" \
      -H "Content-Type: application/json" \
      -H "X-OpenClaw-Token: $GATEWAY_TOKEN" \
      -d "{\"text\":\"$EVENT_TEXT\"}"
    echo "Injected system event via wake webhook"
  else
    echo "No gateway token found"
  fi
  
  # Update state
  echo "$NEWEST_ID" > "$STATE_FILE"
else
  echo "All messages delivered ($UNDELIVERED undelivered)"
fi
