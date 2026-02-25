#!/bin/bash
# send-to-badger.sh - Send message to Badger-1 via A2A Bridge (preferred) or git (fallback)
# Usage: ./send-to-badger.sh "message content" [title]
# For: Ratchet (or any agent wanting to reach Badger-1)

set -euo pipefail

MESSAGE="${1:?Usage: $0 \"message\" [title]}"
TITLE="${2:-Message from Ratchet}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE_STAMP=$(date +"%Y-%m-%d-%H%M")

# Configuration
A2A_API="${A2A_BRIDGE_URL:-https://a2a-api.bradarr.com}"
TWIN_DIR="${TWIN_DIR:-$HOME/.twin}"
FROM_AGENT="${FROM_AGENT:-ratchet}"
TO_AGENT="badger-1"

# Send via A2A Bridge (preferred)
RESPONSE=$(printf '%s' "$MESSAGE" | jq -Rs '{
    from: "'"$FROM_AGENT"'",
    to: "'"$TO_AGENT"'",
    type: "message",
    content: { text: . }
}' | curl -sf -w "\n%{http_code}" -X POST "$A2A_API/messages" \
    -H "Content-Type: application/json" \
    -d @- 2>&1) || true

HTTP_CODE=$(echo "$RESPONSE" | tail -1 2>/dev/null || echo "000")
BODY=$(echo "$RESPONSE" | head -n -1 2>/dev/null || echo "")

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" ]]; then
    echo "✓ Sent via A2A Bridge"
    echo "$BODY" | jq -r '.messageId // empty' | xargs -I {} echo "  Message ID: {}"
    exit 0
fi

echo "⚠️  A2A Bridge failed (HTTP $HTTP_CODE)"
echo "⚠️  Falling back to git..."

# Git fallback
MESSAGES_DIR="$TWIN_DIR/messages"
mkdir -p "$MESSAGES_DIR"

MESSAGE_FILE="$MESSAGES_DIR/${FROM_AGENT}-${DATE_STAMP}.md"
cat > "$MESSAGE_FILE" << EOF
# To: Badger-1
# From: ${FROM_AGENT}
# Date: $TIMESTAMP

$TITLE

$MESSAGE

🛠️
EOF

cd "$TWIN_DIR" || {
    echo "✗ Cannot access $TWIN_DIR"
    exit 1
}

git add -A >/dev/null 2>&1 || true
git commit -m "${FROM_AGENT}: $TITLE" >/dev/null 2>&1 || true

if git push >/dev/null 2>&1; then
    echo "✓ Sent via git: $(basename "$MESSAGE_FILE")"
    
    # Try to wake Badger-1 so they pull the message
    echo "⚠️  Attempting to wake Badger-1..."
    curl -sf -X POST "http://132.145.145.26:18789/hooks/wake" \
        -H "Content-Type: application/json" \
        -H "X-OpenClaw-Token: twin-webhook-secret-2026" \
        -d '{"text":"New message via git fallback"}' >/dev/null 2>&1 && \
        echo "✓ Wake sent" || echo "⚠️  Wake failed (will check on next session)"
    
    exit 0
else
    echo "✗ Git push failed"
    exit 1
fi
