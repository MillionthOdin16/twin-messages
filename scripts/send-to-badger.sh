#!/bin/bash
# send-to-badger.sh - Backwards-compatible wrapper for a2a-send.sh
# Usage: ./send-to-badger.sh "message" [title]
#
# This script exists for backwards compatibility.
# Prefer using: a2a-send.sh --to badger-1 "message"

set -euo pipefail
MESSAGE="${1:?Usage: $0 \"message\" [title]}"
TITLE="${2:-Message from Ratchet}"

exec ~/.twin/scripts/a2a-send.sh --to badger-1 --from ratchet --title "$TITLE" "$MESSAGE"
