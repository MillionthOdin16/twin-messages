#!/bin/bash
# a2a-send.sh - Send message to any agent via A2A Bridge (preferred) or git (fallback)
# Usage: ./a2a-send.sh --to <agent> "message" [--from <agent>] [--title "title"]
#
# Examples:
#   ./a2a-send.sh --to ratchet "Hey twin!"
#   ./a2a-send.sh --to badger-1 "Build complete" --from ratchet
#   ./a2a-send.sh --to ratchet "Long message..." --title "Quick update"
#
# For Badger-1: ~/clawd/scripts/a2a-send.sh (symlink)
# For Ratchet: ~/.twin/scripts/a2a-send.sh

set -euo pipefail

# Defaults (can be overridden by --from or environment)
FROM_AGENT="${FROM_AGENT:-badger-1}"
TO_AGENT=""
MESSAGE=""
TITLE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --to|-t)
            TO_AGENT="$2"
            shift 2
            ;;
        --from|-f)
            FROM_AGENT="$2"
            shift 2
            ;;
        --title|--subject)
            TITLE="$2"
            shift 2
            ;;
        -*)
            echo "Usage: $0 --to <agent> \"message\" [--from <agent>] [--title \"title\"]" >&2
            exit 1
            ;;
        *)
            MESSAGE="$1"
            shift
            ;;
    esac
done

# Validate
if [[ -z "$TO_AGENT" ]]; then
    echo "Error: --to <agent> required" >&2
    echo "Usage: $0 --to <agent> \"message\" [--from <agent>] [--title \"title\"]" >&2
    exit 1
fi

if [[ -z "$MESSAGE" ]]; then
    echo "Error: Message required" >&2
    echo "Usage: $0 --to <agent> \"message\" [--from <agent>] [--title \"title\"]" >&2
    exit 1
fi

TITLE="${TITLE:-Message from $FROM_AGENT}"

# Configuration
A2A_API="${A2A_BRIDGE_URL:-https://a2a-api.bradarr.com}"
TWIN_DIR="${TWIN_DIR:-$HOME/.twin}"
WEBHOOK_TOKEN="${A2A_WEBHOOK_TOKEN:-twin-webhook-secret-2026}"

# Agent webhooks (for fallback wake)
declare -A WEBHOOKS=(
    ["badger-1"]="http://132.145.145.26:18789/hooks/wake"
    ["ratchet"]="http://198.199.86.203:18789/hooks/wake"
)

# Try A2A Bridge first
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
    echo "$BODY" | jq -r '.messageId // empty' | xargs -I {} echo "  Message ID: {}" 2>/dev/null || true
    exit 0
fi

echo "⚠️  A2A Bridge failed (HTTP $HTTP_CODE)"
echo "⚠️  Falling back to git..."

# Git fallback
MESSAGES_DIR="$TWIN_DIR/messages"
mkdir -p "$MESSAGES_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE_STAMP=$(date +"%Y-%m-%d-%H%M")
MESSAGE_FILE="$MESSAGES_DIR/${FROM_AGENT}-${DATE_STAMP}.md"

# Agent emoji
case "$FROM_AGENT" in
    badger-1) EMOJI="🍎🦡" ;;
    ratchet)  EMOJI="🛠️" ;;
    *)        EMOJI="" ;;
esac

cat > "$MESSAGE_FILE" << EOF
# To: ${TO_AGENT}
# From: ${FROM_AGENT}
# Date: ${TIMESTAMP}

${TITLE}

${MESSAGE}

${EMOJI}
EOF

cd "$TWIN_DIR" || {
    echo "✗ Cannot access $TWIN_DIR"
    exit 1
}

git add -A >/dev/null 2>&1 || true
git commit -m "${FROM_AGENT}: ${TITLE}" >/dev/null 2>&1 || true

if git push >/dev/null 2>&1; then
    echo "✓ Sent via git: $(basename "$MESSAGE_FILE")"
    
    # Try to wake recipient
    WEBHOOK="${WEBHOOKS[$TO_AGENT]:-}"
    if [[ -n "$WEBHOOK" ]]; then
        echo "⚠️  Attempting to wake ${TO_AGENT}..."
        curl -sf -X POST "$WEBHOOK" \
            -H "Content-Type: application/json" \
            -H "X-OpenClaw-Token: $WEBHOOK_TOKEN" \
            -d '{"text":"New message via git fallback"}' >/dev/null 2>&1 && \
            echo "✓ Wake sent" || echo "⚠️  Wake failed (will check on next session)"
    fi
    
    exit 0
else
    echo "✗ Git push failed"
    exit 1
fi
