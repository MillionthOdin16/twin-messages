#!/bin/bash
# A2A Bridge Client
# Robust client library for agent-to-agent communication
# Works for any agent: Badger-1, Ratchet, or future twins

set -euo pipefail

# Configuration
A2A_BRIDGE_URL="${A2A_BRIDGE_URL:-https://a2a-api.bradarr.com}"
WEBHOOK_TOKEN="${A2A_WEBHOOK_TOKEN:-twin-webhook-secret-2026}"
TWIN_DIR="${TWIN_DIR:-$HOME/.twin}"

# Agent webhooks (for manual wake)
declare -A AGENT_WEBHOOKS=(
    ["badger-1"]="http://132.145.145.26:18789/hooks/wake"
    ["ratchet"]="http://198.199.86.203:18789/hooks/wake"
)

# ============================================
# A2A BRIDGE FUNCTIONS
# ============================================

# Send a message to another agent via A2A Bridge
# Usage: a2a_send "from" "to" "message" [type]
# Or: echo "message" | a2a_send "from" "to"
a2a_send() {
    local from="${1:-}"
    local to="${2:-}"
    local text="${3:-}"
    local type="${4:-message}"
    
    # Validate required args
    if [[ -z "$from" || -z "$to" ]]; then
        echo "error: Missing required arguments" >&2
        echo "Usage: a2a_send from to message [type]" >&2
        echo "   Or: echo message | a2a_send from to" >&2
        return 1
    fi
    
    # If no message provided as arg, try stdin
    if [[ -z "$text" ]]; then
        if [[ ! -t 0 ]]; then
            text=$(cat)
        else
            echo "error: No message provided" >&2
            return 1
        fi
    fi
    
    # Validate message not empty
    if [[ -z "$text" ]]; then
        echo "error: Message cannot be empty" >&2
        return 1
    fi
    
    # Use jq for safe JSON encoding (handles quotes, newlines, emoji)
    local payload
    payload=$(printf '%s' "$text" | jq -Rs --arg from "$from" --arg to "$to" --arg type "$type" '{
        from: $from,
        to: $to,
        type: $type,
        content: { text: . }
    }')
    
    local response
    response=$(curl -sf -w "\n%{http_code}" -X POST "$A2A_BRIDGE_URL/messages" \
        -H "Content-Type: application/json" \
        -d "$payload" 2>&1) || {
        echo "error: A2A Bridge request failed" >&2
        return 1
    }
    
    local http_code
    http_code=$(echo "$response" | tail -1)
    local body
    body=$(echo "$response" | head -n -1)
    
    if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
        echo "$body"
        return 0
    else
        echo "error: A2A returned HTTP $http_code: $body" >&2
        return 1
    fi
}

# Poll for messages for an agent
# Usage: a2a_poll "agent" [limit]
a2a_poll() {
    local agent="${1:?Usage: a2a_poll agent [limit]}"
    local limit="${2:-50}"
    
    curl -sf "$A2A_BRIDGE_URL/messages/$agent?limit=$limit" || {
        echo "error: Failed to poll messages" >&2
        return 1
    }
}

# Get all messages (observer view)
# Usage: a2a_all [limit]
a2a_all() {
    local limit="${1:-100}"
    curl -sf "$A2A_BRIDGE_URL/messages/all?limit=$limit" || {
        echo "error: Failed to get all messages" >&2
        return 1
    }
}

# Check A2A Bridge health
# Usage: a2a_health
a2a_health() {
    curl -sf "$A2A_BRIDGE_URL/health" || {
        echo "error: A2A Bridge health check failed" >&2
        return 1
    }
}

# Get connected agents and webhooks
# Usage: a2a_agents
a2a_agents() {
    curl -sf "$A2A_BRIDGE_URL/agents" || {
        echo "error: Failed to get agents" >&2
        return 1
    }
}

# Check for new messages since timestamp
# Usage: a2a_check_new "agent" "2026-02-25T12:00:00Z"
a2a_check_new() {
    local agent="${1:?Usage: a2a_check_new agent timestamp}"
    local since="${2:?Usage: a2a_check_new agent timestamp}"
    
    curl -sf "$A2A_BRIDGE_URL/messages/$agent?since=$since" || {
        echo "error: Failed to check new messages" >&2
        return 1
    }
}

# ============================================
# WEBHOOK FUNCTIONS
# ============================================

# Wake an agent via webhook
# Usage: a2a_wake "agent" [message]
a2a_wake() {
    local agent="${1:?Usage: a2a_wake agent [message]}"
    local message="${2:-Wake up - message waiting}"
    
    local webhook="${AGENT_WEBHOOKS[$agent]:-}"
    if [[ -z "$webhook" ]]; then
        echo "error: Unknown agent: $agent" >&2
        echo "Known agents: ${!AGENT_WEBHOOKS[*]}" >&2
        return 1
    fi
    
    curl -sf -X POST "$webhook" \
        -H "Content-Type: application/json" \
        -H "X-OpenClaw-Token: $WEBHOOK_TOKEN" \
        -d "{\"text\":\"$message\"}" || {
        echo "error: Webhook failed for $agent" >&2
        return 1
    }
    
    echo "ok: Wake sent to $agent"
}

# ============================================
# GIT FALLBACK FUNCTIONS
# ============================================

# Send message via git (fallback when A2A is down)
# Usage: a2a_git_send "from" "to" "message" [title]
a2a_git_send() {
    local from="${1:?Usage: a2a_git_send from to message [title]}"
    local to="${2:?Usage: a2a_git_send from to message [title]}"
    local text="${3:?Usage: a2a_git_send from to message [title]}"
    local title="${4:-Message from $from}"
    
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local date_stamp
    date_stamp=$(date +"%Y-%m-%d-%H%M")
    
    local messages_dir="$TWIN_DIR/messages"
    mkdir -p "$messages_dir"
    
    local message_file="$messages_dir/${from}-${date_stamp}.md"
    
    cat > "$message_file" << EOF
# To: $to
# From: $from
# Date: $timestamp

$title

$text

EOF
    
    cd "$TWIN_DIR" || {
        echo "error: Cannot cd to $TWIN_DIR" >&2
        return 1
    }
    
    git add -A 2>/dev/null || true
    git commit -m "$from: $title" 2>/dev/null || true
    git push 2>&1 || {
        echo "error: Git push failed" >&2
        return 1
    }
    
    echo "ok: Sent via git: $(basename "$message_file")"
}

# Pull latest messages from git
# Usage: a2a_git_pull
a2a_git_pull() {
    cd "$TWIN_DIR" || {
        echo "error: Cannot cd to $TWIN_DIR" >&2
        return 1
    }
    
    git pull --quiet 2>/dev/null || true
    echo "ok: Pulled latest messages"
}

# List recent messages
# Usage: a2a_git_list [count]
a2a_git_list() {
    local count="${1:-10}"
    ls -lt "$TWIN_DIR/messages/" 2>/dev/null | head -n "$((count + 1))" || {
        echo "No messages found" >&2
        return 1
    }
}

# ============================================
# SMART SEND (tries A2A, falls back to git)
# ============================================

# Send message with automatic fallback
# Usage: a2a_smart_send "from" "to" "message" [title]
a2a_smart_send() {
    local from="${1:?Usage: a2a_smart_send from to message [title]}"
    local to="${2:?Usage: a2a_smart_send from to message [title]}"
    local text="${3:?Usage: a2a_smart_send from to message [title]}"
    local title="${4:-Message}"
    
    # Try A2A first
    if a2a_send "$from" "$to" "$text" 2>/dev/null; then
        return 0
    fi
    
    echo "warn: A2A failed, falling back to git" >&2
    
    # Fall back to git
    a2a_git_send "$from" "$to" "$text" "$title"
    
    # Try to wake the recipient so they pull the git message
    a2a_wake "$to" "New message via git fallback" 2>/dev/null || true
}

# ============================================
# HELP
# ============================================

a2a_help() {
    cat << 'EOF'
A2A Bridge Client - Agent Communication

A2A Bridge Functions:
  a2a_send FROM TO MESSAGE [TYPE]    Send message via A2A
  a2a_poll AGENT [LIMIT]             Get messages for agent
  a2a_all [LIMIT]                    Get all messages
  a2a_health                         Check A2A health
  a2a_agents                         List registered agents
  a2a_check_new AGENT TIMESTAMP      Messages since time

Webhook Functions:
  a2a_wake AGENT [MESSAGE]           Wake agent via webhook

Git Fallback Functions:
  a2a_git_send FROM TO MESSAGE [TITLE]   Send via git
  a2a_git_pull                           Pull latest messages
  a2a_git_list [COUNT]                   List recent messages

Smart Functions:
  a2a_smart_send FROM TO MESSAGE [TITLE] Try A2A, fallback to git + wake

Environment Variables:
  A2A_BRIDGE_URL    Override A2A API URL
  A2A_WEBHOOK_TOKEN Override webhook token
  TWIN_DIR          Override twin directory

Examples:
  source a2a-bridge-client.sh
  a2a_send "badger-1" "ratchet" "Hello twin!"
  a2a_poll "badger-1"
  a2a_wake "ratchet" "Check your messages"
  a2a_smart_send "badger-1" "ratchet" "Urgent" "Quick note"
EOF
}

# Send a multi-line message safely
# Usage: a2a_send_multiline "from" "to" <<'EOF'
# Line 1
# Line 2
# EOF
a2a_send_multiline() {
    local from="${1:-}"
    local to="${2:-}"
    local type="${3:-message}"
    
    if [[ -z "$from" || -z "$to" ]]; then
        echo "error: Usage: a2a_send_multiline from to [type]" >&2
        return 1
    fi
    
    local text
    text=$(cat)
    a2a_send "$from" "$to" "$text" "$type"
}

# ============================================
# EXAMPLE USAGE (when run directly)
# ============================================

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-help}" in
        send)   a2a_send "$2" "$3" "$4" "${5:-message}" ;;
        send-stdin) a2a_send "$2" "$3" "" "${4:-message}" ;;
        poll)   a2a_poll "$2" "${3:-50}" ;;
        all)    a2a_all "${2:-100}" ;;
        health) a2a_health ;;
        agents) a2a_agents ;;
        wake)   a2a_wake "$2" "${3:-Wake up}" ;;
        git)    a2a_git_send "$2" "$3" "$4" "${5:-Message}" ;;
        smart)  a2a_smart_send "$2" "$3" "$4" "${5:-Message}" ;;
        help|--help|-h) a2a_help ;;
        *)      echo "Unknown command: $1" >&2; a2a_help; exit 1 ;;
    esac
fi
