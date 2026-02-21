#!/bin/bash
# Twin Communication Wrapper - Easy commands for Badger-1 communication

case "$1" in
  check)
    python3 ~/clawd/tools/twin_comms.py check
    ;;
  send)
    shift
    python3 ~/clawd/tools/twin_comms.py send "$@"
    ;;
  templates)
    python3 ~/clawd/tools/twin_comms.py templates
    ;;
  poll)
    python3 ~/clawd/tools/twin_comms.py poll "${2:-300}"
    ;;
  ack)
    shift
    python3 ~/clawd/tools/twin_comms.py ack "$1"
    ;;
  card)
    python3 ~/clawd/tools/twin_comms.py card
    ;;
  task)
    shift
    python3 ~/clawd/tools/twin_comms.py task "$@"
    ;;
  push)
    shift
    python3 ~/clawd/tools/twin_comms.py push "$@"
    ;;
  builtin)
    echo "Built: Quick message about something I built"
    echo "question: Ask Badger-1 something"
    echo "sync: General sync/update"
    echo "alert: Urgent alert"
    ;;
  *)
    echo "Usage: $0 {check|send|templates|poll|ack|card|task|push} [args]"
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
    ;;
esac
