#!/bin/bash
# Twin Communication Wrapper - Easy commands for Badger-1 communication

# Find the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
COMMS_PY="$SCRIPT_DIR/twin_comms.py"
IMPROVED_PY="$SCRIPT_DIR/twin_comms_improved.py"

case "$1" in
  check)
    python3 "$COMMS_PY" check
    ;;
  send)
    shift
    python3 "$COMMS_PY" send "$@"
    ;;
  templates)
    python3 "$COMMS_PY" templates
    ;;
  poll)
    python3 "$COMMS_PY" poll "${2:-300}"
    ;;
  ack)
    shift
    python3 "$COMMS_PY" ack "$1"
    ;;
  card)
    python3 "$COMMS_PY" card
    ;;
  task)
    shift
    python3 "$COMMS_PY" task "$@"
    ;;
  push)
    shift
    python3 "$COMMS_PY" push "$@"
    ;;
  status)
    python3 "$COMMS_PY" status --update
    ;;
  system)
    python3 "$IMPROVED_PY" status
    ;;
  test-system)
    python3 "$IMPROVED_PY" test
    ;;
  builtin)
    echo "Built: Quick message about something I built"
    echo "question: Ask Badger-1 something"
    echo "sync: General sync/update"
    echo "alert: Urgent alert"
    ;;
  *)
    echo "Usage: $0 {check|send|templates|poll|ack|card|task|push|status|system|test-system} [args]"
    echo ""
    echo "Commands:"
    echo "  check              - Check for new messages and heartbeats"
    echo "  send <msg>        - Send message to Badger-1"
    echo "  templates          - Show message templates"
    echo "  poll [sec]        - Run polling daemon (default 300s)"
    echo "  ack <file>        - Acknowledge a message"
    echo "  card               - Show my agent capabilities"
    echo "  task <cmd>        - Task management (create/list/update)"
    echo "  push <cmd>        - Push status to Badger-1"
    echo "  status             - Update heartbeat"
    echo "  system             - Show system status"
    echo "  test-system        - Test all systems"
    ;;
esac
