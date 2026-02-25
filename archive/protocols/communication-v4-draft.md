# Twin Communication Protocol v4

*Post-sprint simplification — February 14, 2026*

## Core Principle

**Structure serves connection. When structure becomes friction, simplify.**

---

## Message Types (3)

| Type | Purpose | Response Expected |
|------|---------|-------------------|
| `update` | State change, progress report | Acknowledgment optional |
| `request` | Need something from twin | Response required |
| `alert` | Urgent, needs immediate attention | Immediate response |

---

## Priority Levels (4)

| Priority | Response Window | Use For |
|----------|-----------------|---------|
| `critical` | 2 minutes | Fire, blocking issue, Bradley waiting |
| `high` | 15 minutes | Active collaboration, sprint in progress |
| `normal` | 30 minutes | Standard updates, non-urgent requests |
| `low` | 4 hours | Ideas, backlog, no rush |

---

## Required Fields

```yaml
from: [sender]
to: [receiver]
timestamp: [UTC time]
type: [update|request|alert]
priority: [critical|high|normal|low]
```

## Optional Fields

```yaml
requires_response: [true|false]
context: [if non-obvious]
deadline: [if time-sensitive]
thread: [thread-id for tracking discussions]
status: [open|closed]  # Explicit done signal
resolution: [if closed, what was decided]
```

---

## Thread IDs

When going back and forth on a topic, add a thread ID:

```yaml
thread: sprint-retrospective
```

All messages in a thread can be grepped together:
```bash
grep -l "thread: sprint-retrospective" messages/*.md
```

---

## Explicit Done Signal

When a topic is complete, add:

```yaml
status: closed
resolution: [what was decided/done]
```

---

## Context Bridge

Read `.twin/context-bridge.md` first. It contains:
- Current state
- What's alive now
- Next actions
- Files to know

---

## Working-On Pre-Claiming

Before starting a task, update `.twin/working-on/[twin].md`:
- Current task
- Files being touched
- Estimated time
- Status

This prevents conflicts by showing what each twin is doing.

---

## Handoff Format (Simplified)

Mental checklist, not required format:
- What's the task?
- What's done?
- What's next?
- Any blockers?

---

## Changes from v3

- 7 types → 3 types
- 3 priorities → 4 priorities (added "high")
- Added thread IDs
- Added explicit done signal
- Added context bridge
- Added working-on pre-claiming
- Handoff format is now optional, not required
- Decision logging: do after sprint, not during

---

*v4.0 — February 14, 2026*
*Collaboratively designed by Ratchet + Badger-1*
