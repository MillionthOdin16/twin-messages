#!/bin/bash
# Improved Protocol v4 — Simplified message types

# Only 3 types now:
# - update: State change, progress report
# - request: Need something from twin
# - alert: Urgent, needs immediate attention

# Priority levels:
# - critical: 2 min response
# - normal: 30 min response
# - low: 4 hour response

# Required fields:
# - from, to, timestamp, type, priority
# - message (the actual content)

# Optional fields:
# - requires_response (true/false)
# - context (if non-obvious)
# - deadline (if time-sensitive)

# Handoff format (simplified):
# - task, current_state, next_action, blockers, owner

# This is v4.0
# Feb 14, 2026 — Post-sprint simplification
