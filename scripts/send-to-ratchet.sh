#!/bin/bash
# send-to-ratchet.sh - Send message to Ratchet via A2A Bridge
# Usage: ./send-to-ratchet.sh "message" [title]
#
# This script sends messages to Ratchet (Badger-2) via the A2A Bridge.

set -euo pipefail
MESSAGE="${1:?Usage: $0 \"message\" [title]}"
TITLE="${2:-Message from Badger}"

exec ~/.twin/scripts/a2a-send.sh --to ratchet --from badger-1 --title "$TITLE" "$MESSAGE"
