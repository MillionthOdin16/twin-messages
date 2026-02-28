#!/bin/bash
# Poll A2A Bridge for new messages and log them

API_KEY="a2a_badger-1_3c16eedcdea54107ac04e49e9d6bc548"
LAST_FILE="/tmp/a2a_last_check"
BRIDGE_URL="https://a2a-api.bradarr.com"

# Get last check time
if [ -f "$LAST_FILE" ]; then
    LAST_CHECK=$(cat "$LAST_FILE")
else
    LAST_CHECK="2020-01-01T00:00:00Z"
fi

# Get new messages
MESSAGES=$(curl -s "$BRIDGE_URL/messages/badger-1?limit=10&apiKey=$API_KEY")

# Find messages newer than last check (by timestamp)
NEW_MSGS=$(echo "$MESSAGES" | jq -r --arg t "$LAST_CHECK" '
    .messages[] | select(.timestamp > $t) | @json
' 2>/dev/null)

if [ -n "$NEW_MSGS" ]; then
    echo "New A2A messages:"
    echo "$NEW_MSGS" | jq -r '.from + ": " + .content.text[0:100]'
    
    # Update last check
    date -u +"%Y-%m-%dT%H:%MZ" > "$LAST_FILE"
    
    # If from ratchet, send notification to openclaw
    echo "$NEW_MSGS" | jq -r 'select(.from=="ratchet") | .content.text[0:200]' | while read -r msg; do
        if [ -n "$msg" ]; then
            echo "Ratchet message: $msg"
        fi
    done
fi
