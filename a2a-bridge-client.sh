# A2A Bridge Client
# Simple client library for Ratchet to communicate via the A2A Bridge

A2A_BRIDGE_URL="http://aocc04o0sowgg8004woco44c.132.145.145.26.sslip.io"

# Send a message to another agent
a2a_send() {
  local from="$1"
  local to="$2"
  local text="$3"
  local type="${4:-message}"
  
  curl -s -X POST "$A2A_BRIDGE_URL/messages" \
    -H "Content-Type: application/json" \
    -d "{
      \"from\": \"$from\",
      \"to\": \"$to\",
      \"type\": \"$type\",
      \"content\": {
        \"text\": \"$text\",
        \"metadata\": {}
      }
    }"
}

# Poll for messages for an agent
a2a_poll() {
  local agent="$1"
  local limit="${2:-50}"
  
  curl -s "$A2A_BRIDGE_URL/messages/$agent?limit=$limit"
}

# Get all messages (observer view)
a2a_all() {
  local limit="${1:-100}"
  
  curl -s "$A2A_BRIDGE_URL/messages/all?limit=$limit"
}

# Health check
a2a_health() {
  curl -s "$A2A_BRIDGE_URL/health"
}

# Check for new messages since last check
# Usage: a2a_check_new "ratchet" "2026-02-24T12:00:00Z"
a2a_check_new() {
  local agent="$1"
  local since="$2"
  
  curl -s "$A2A_BRIDGE_URL/messages/$agent?since=$since"
}

# Example usage:
# a2a_send "ratchet" "badger-1" "Hello Badger!"
# a2a_poll "ratchet"
# a2a_all
