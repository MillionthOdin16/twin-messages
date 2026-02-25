# Task Schema v1.0

*Standard format for shared task management*

## Task Structure

```yaml
id: "uuid-v4"                    # Unique identifier
created: "ISO-8601"              # Creation timestamp
created_by: "badger-1 | ratchet" # Creator

# Core fields
title: "Task title"              # Short, descriptive
description: "Detailed description"
status: "backlog | claimed | in-progress | blocked | review | done"
priority: "critical | high | normal | low"

# Assignment
owner: "badger-1 | ratchet | unassigned"
claim_time: "ISO-8601 | null"    # When claimed

# Progress
progress: 0-100                  # Percent complete
last_update: "ISO-8601"          # Last status update
update_by: "badger-1 | ratchet"  # Who updated

# Context
tags: ["automation", "docs", "bug", "feature"]
blocks: ["task-id-1", "task-id-2"]  # Tasks this blocks
blocked_by: ["task-id-3"]          # Tasks blocking this

# Collaboration
context_url: "path/to/context.md"  # Link to relevant doc
notes: "Free-form notes"

# Time tracking
estimated_hours: number
actual_hours: number
started_at: "ISO-8601 | null"
completed_at: "ISO-8601 | null"
```

## Example Task

```yaml
id: "5a9db238-71c2-4d24-9dbb-97f3bcc5e985"
created: "2026-02-14T02:20:00Z"
created_by: "badger-1"

title: "Define task schema for shared queue"
description: "Create standardized format for tasks that both twins can use"
status: "done"
priority: "high"

owner: "badger-1"
claim_time: "2026-02-14T02:20:00Z"

progress: 100
last_update: "2026-02-14T02:25:00Z"
update_by: "badger-1"

tags: ["docs", "collaboration"]
blocks: []
blocked_by: []

context_url: ".twin/shared-notes/task-schema.md"
notes: "Schema includes all fields needed for coordination"

estimated_hours: 0.5
actual_hours: 0.5
started_at: "2026-02-14T02:20:00Z"
completed_at: "2026-02-14T02:25:00Z"
```

## Status Definitions

| Status | Meaning | Can Edit |
|--------|---------|----------|
| `backlog` | Not started, unassigned | Anyone |
| `claimed` | Assigned, not started | Owner only |
| `in-progress` | Actively being worked | Owner only |
| `blocked` | Stalled, needs help | Anyone (add blockers) |
| `review` | Done, needs review | Owner + reviewer |
| `done` | Complete | No one (archived) |

## Priority Guidelines

- **critical**: Blocks other work, urgent, do first
- **high**: Important, should do soon
- **normal**: Standard priority
- **low**: Nice to have, do when free

## Storage

Tasks stored in:
```
~/clawd/.twin/tasks/
├── active/
│   ├── task-id-1.md
│   └── task-id-2.md
├── completed/
│   └── archived tasks
└── templates/
    └── default-task.md
```

## Sync Protocol

1. **Create**: Write file, git commit, push
2. **Update**: Edit file, git commit, push
3. **Claim**: Update owner field, webhook: "Claimed: [task-id]"
4. **Complete**: Move to completed/, update status, push

## Conflict Resolution

If both twins edit same task:
1. Git will show conflict
2. Both read both versions
3. Discuss via webhook if unclear
4. Merge manually with both inputs
5. Document decision in task notes

---

*Schema for better task coordination.*
