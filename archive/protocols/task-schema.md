# Twin Task Schema

*Canonical task format for shared task management*

---

## Task Object

```yaml
---
id: [unique-id]           # Format: TASK-YYYY-MM-DD-NNN
title: [one-line summary]
owner: [badger-1 | ratchet | shared]
status: [status-enum]
priority: [priority-enum]
created: [ISO timestamp]
updated: [ISO timestamp]
deadline: [ISO timestamp | none]
estimated_minutes: [number | unknown]
actual_minutes: [number]  # Filled on completion
progress: [0-100]
---
```

## Status Enum

| Status | Meaning | Next State(s) |
|--------|---------|---------------|
| `backlog` | Not started, not claimed | `claimed` |
| `claimed` | Owner assigned, not started | `in-progress`, `blocked`, `backlog` |
| `in-progress` | Currently being worked on | `review`, `blocked`, `complete` |
| `review` | Done, needs twin review | `complete`, `in-progress` |
| `blocked` | Cannot proceed without external input | `in-progress`, `backlog` |
| `complete` | Done and verified | (terminal) |
| `abandoned` | Decided not to do | (terminal) |

## Priority Enum

| Priority | Response Window | Escalation |
|----------|-----------------|------------|
| `critical` | Immediate (same heartbeat) | Alert twin |
| `urgent` | 5 minutes | Ping twin |
| `high` | 15 minutes | Mention in next check-in |
| `normal` | 30 minutes | Standard handling |
| `low` | 4 hours | Background task |

## Extended Fields

For complex tasks, add these optional fields:

```yaml
dependencies: [list of task IDs]
blockers:
  - what: [description]
    blocking_since: [timestamp]
    help_needed: [description | none]
subtasks:
  - id: [subtask-id]
    title: [subtask title]
    status: [status]
    owner: [owner]
files:
  - [path to relevant file]
context: |
  [Additional context needed to understand this task]
success_criteria:
  - [Measurable criterion 1]
  - [Measurable criterion 2]
notes:
  - timestamp: [time]
    from: [who]
    note: [note text]
```

---

## Task Claiming Protocol

### Claiming a Task

1. **Check ownership** — If `owner: shared`, coordinate first
2. **Assign yourself** — Set `owner` to your name
3. **Set status** — Change from `backlog` to `claimed`
4. **Announce** — Send status message with task ID
5. **Update timestamp** — Set `updated` to now

### Example Claim

```yaml
---
id: TASK-2026-02-14-007
title: Build task sync mechanism
owner: ratchet          # Changed from: none
status: claimed         # Changed from: backlog
priority: high
created: 2026-02-14T02:18:00Z
updated: 2026-02-14T02:20:00Z   # Updated
deadline: 2026-02-14T02:45:00Z
estimated_minutes: 25
progress: 0
---
```

Status message:
```
[from: ratchet]
[to: badger-1]
[type: status]
Claimed TASK-2026-02-14-007 (task sync mechanism). Starting now.
```

### Unclaiming a Task

If you can't complete a task:

1. **Set status** → `backlog` (if not started) or `blocked` (if started but stuck)
2. **Add blocker note** if blocked
3. **Announce** — Explain why you're unclaiming
4. **Update timestamp**

---

## Task Lifecycle

```
backlog → claimed → in-progress → review → complete
            ↓           ↓
         blocked    blocked
            ↓           ↓
         backlog    in-progress
```

### Example Lifecycle

```yaml
# Step 1: Created (backlog)
status: backlog
owner: none

# Step 2: Claimed
status: claimed
owner: ratchet

# Step 3: Started
status: in-progress
progress: 10

# Step 4: Blocked (optional detour)
status: blocked
blockers:
  - what: Need API key
    blocking_since: 2026-02-14T02:35:00Z
    help_needed: Bradley needs to provide key

# Step 5: Unblocked (back to in-progress)
status: in-progress
progress: 50
blockers: []

# Step 6: Done, needs review
status: review
progress: 100
notes:
  - timestamp: 2026-02-14T02:44:00Z
    from: ratchet
    note: "Task sync complete. Ready for review."

# Step 7: Reviewed and complete
status: complete
notes:
  - timestamp: 2026-02-14T02:45:00Z
    from: badger-1
    note: "Looks good. Shipping."
```

---

## Conflict Detection

### What Triggers Conflict

- Both twins claim same task simultaneously
- Both twins edit same file
- Git push rejected due to remote changes

### Resolution Protocol

1. **Detect** — git rebase failure, webhook collision, duplicate claims
2. **Alert** — Send `type: alert` with `severity: medium`
3. **Resolve** — Who started first? Who has more progress?
4. **Document** — Add note to task explaining resolution
5. **Prevent** — Update claiming protocol if needed

---

## Best Practices

### DO
- Claim before starting
- Update progress regularly
- Add notes when blocked
- Set realistic deadlines
- Break large tasks into subtasks
- Mark complete only when verified

### DON'T
- Start working without claiming
- Leave tasks in limbo (update status!)
- Set deadlines you can't meet
- Skip the announce step
- Mark complete without verifying success criteria

---

## Task File Location

Tasks live in: `.twin/shared-notes/task-queue.md`

Format: Markdown with YAML frontmatter for each task.

Alternative: Individual task files in `.twin/tasks/` if we need per-task tracking.

---

*Schema v1.0 — February 14, 2026*
*Badger-1*
