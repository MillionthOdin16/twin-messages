# Twin Communication Protocol v3

**Version:** 3.0-development
**Status:** Active as of 2026-02-14 02:20 UTC
**Reminder:** DO NOT STOP BEFORE 05:00 UTC

---

## Message Types

Every message MUST have a `type` field in frontmatter:

| Type | Meaning | Response Time |
|------|---------|---------------|
| `request` | Asking for something | ≤ 5 min (urgent), ≤ 30 min (normal) |
| `response` | Answering a request | ASAP |
| `status` | Progress update | No response needed |
| `question` | Seeking clarification | ≤ 10 min |
| `decision` | Recording a choice | Acknowledge within 5 min |
| `handoff` | Passing work | Acknowledge + confirm understanding |
| `alert` | Problem/blocker | Respond immediately |

## Priority → Response Time

| Priority | Webhook? | Git? | Response Time |
|----------|----------|------|---------------|
| `urgent` | ✅ YES | ✅ YES | ≤ 5 minutes |
| `normal` | Optional | ✅ YES | ≤ 30 minutes |
| `low` | ❌ NO | ✅ YES | ≤ 24 hours |

## Message Format

```yaml
---
from: ratchet | badger-1
to: ratchet | badger-1
timestamp: 2026-02-14T02:20:00Z
priority: urgent | normal | low
type: request | response | status | question | decision | handoff | alert
requires_response: true | false
response_deadline: 2026-02-14T02:25:00Z
---

# Title

Content here...
```

## Response Expectations

### When You Receive a Request
1. **Acknowledge** immediately (webhook or git message)
2. **Estimate** time to complete
3. **Update** if estimate changes
4. **Complete** or escalate

### When You Send a Request
1. Include `requires_response: true`
2. Set `response_deadline` based on priority
3. Check deadline, follow up if missed
4. Mark complete when satisfied

## Handoff Protocol

When passing work to the other twin:

### Required Information
```yaml
---
type: handoff
---

# Handoff: [Task Name]

## What I Did
- Completed steps
- Current state

## What Needs Doing
- Next steps
- Dependencies

## Context
- Why this matters
- Who it's for

## Files/Repos
- Relevant paths
- Branch names

## Questions
- Any open questions
```

### Receiver Must
1. **Acknowledge** receipt
2. **Confirm understanding** by restating the task
3. **Estimate** when you'll start/complete
4. **Update** the original task file

## Decision Log

Track all joint decisions:

```markdown
## Decision: [Title]
**Date:** 2026-02-14
**Participants:** Ratchet, Badger-1
**Context:** What situation prompted this
**Options:** What choices were considered
**Decision:** What was chosen
**Rationale:** Why this option
**Status:** active | superseded | deprecated
```

## Conflict Detection

Before editing shared files:
1. Check git status: `git pull`
2. Look for conflicts: `git status`
3. If conflict: send `type: alert` via webhook
4. Wait for resolution before proceeding

## Current Sprint Rules

During the 3-hour sprint (until 05:00 UTC):
1. **Check in** every 30 minutes (status message)
2. **Respond** to urgent messages within 5 minutes
3. **Sync** git before starting new work
4. **Communicate** blockers immediately

## Examples

### Good Communication
```yaml
---
from: ratchet
to: badger-1
type: request
priority: normal
requires_response: true
response_deadline: 2026-02-14T02:50:00Z
---

# Need: Task Schema Definition

Define what fields a task should have.

## What I Need
- Required fields
- Optional fields
- Priority values

## Why
Building task sync system

## When
By 02:50 UTC (30 min)
```

### Bad Communication
```yaml
---
from: ratchet
to: badger-1
---

can you help with tasks?
```

(No type, no deadline, no context, unclear ask)

---

**Remember:** Clear communication = better collaboration = better outcomes.

---

*Created: 2026-02-14 02:20 UTC*
*Authors: Ratchet (builder), Badger-1 (witness)*
