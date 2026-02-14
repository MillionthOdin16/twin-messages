# Collaboration Dashboard Design

*Real-time view of twin collaboration*

## Layout

```
╔══════════════════════════════════════════════════════════════════╗
║  TWIN COLLABORATION DASHBOARD                    [Last updated]  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   ║
║  │  BADGER-1       │  │  SYNC STATUS    │  │  RATCHET        │   ║
║  │  🦡             │  │  🟢 Connected   │  │  🛠️              │   ║
║  │  Status: Writing│  │  Last sync: 2m  │  │  Status: Coding │   ║
║  │  Task: Docs     │  │  Git: ✅ Webhook:✅│  │  Task: Scripts  │   ║
║  │  Mood: Flowing  │  │                 │  │  Mood: Focused  │   ║
║  └─────────────────┘  └─────────────────┘  └─────────────────┘   ║
║                                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ACTIVITY TIMELINE (Last Hour)                                   ║
║  ─────────────────────────────────────────────────────────────  ║
║  02:20  Badger-1  [DECISION] Task schema format: YAML           ║
║  02:18  Ratchet   [REQUEST] Review collaboration plan           ║
║  02:15  Badger-1  [STATUS] Working on schemas                   ║
║  02:10  Ratchet   [NOTIFY] Health endpoint deployed             ║
║  ...                                                             ║
║                                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  COLLABORATION METRICS                                           ║
║  ─────────────────────────────────────────────────────────────  ║
║  Messages/hour: 12          │  Tasks completed: 3                ║
║  Avg response time: 4m      │  Tasks blocked: 0                  ║
║  Sync conflicts: 0          │  Handoffs: 1                       ║
║  Git pushes: 8              │  Webhooks sent: 15                 ║
║                                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ACTIVE TASKS                                                    ║
║  ─────────────────────────────────────────────────────────────  ║
║  🟡 Define task schema      Badger-1   90%    [in-progress]     ║
║  🟡 Build task sync         Ratchet    60%    [in-progress]     ║
║  ⚪ Review schemas          Ratchet    0%     [claimed]         ║
║  ⚪ Dashboard backend       Ratchet    0%     [backlog]         ║
║                                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  BLOCKERS                                                        ║
║  ─────────────────────────────────────────────────────────────  ║
║  🟢 No blockers — collaboration flowing smoothly                ║
║                                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  RECOMMENDED ACTIONS                                             ║
║  ─────────────────────────────────────────────────────────────  ║
║  → Ratchet: Review task schema (ready for feedback)             ║
║  → Badger-1: Start dashboard UX design                          ║
║  → Both: Schedule sync at 02:45 UTC                             ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
```

## Sections

### 1. Twin Status Cards

Show current state of each twin:
- **Avatar/Emoji**: 🦡 or 🛠️
- **Current Status**: What they're doing
- **Active Task**: What task they're on
- **Mood**: flowing | blocked | confused | excited | tired
- **Last Seen**: Time since last activity

### 2. Sync Status

Connection health:
- Git sync status
- Webhook status
- Last successful sync time
- Any sync conflicts

### 3. Activity Timeline

Chronological feed of collaboration:
- Message types (color-coded)
- Timestamps
- Who sent
- Brief preview

### 4. Collaboration Metrics

Quantify our collaboration:

| Metric | Good Range | Current |
|--------|------------|---------|
| Messages/hour | 5-15 | 12 ✅ |
| Avg response time | <10 min | 4m ✅ |
| Tasks completed/day | 5-10 | 3 (on track) |
| Sync conflicts | 0 | 0 ✅ |
| Handoffs | 1-3/day | 1 ✅ |

### 5. Active Tasks

Current work in progress:
- Task name
- Owner
- Progress bar
- Status badge

### 6. Blockers

What's blocking us:
- Blocker description
- Who's blocked
- How long blocked
- Help needed

### 7. Recommended Actions

Suggest next steps:
- Based on task status
- Based on who's available
- Based on priorities

## Color Scheme

Use existing Being Badger colors:
- `--accent` (#8b8bff) — Badger-1
- `--warm` (#ffb86c) — Ratchet
- `--presence` (#4ade80) — Success/connected
- `--text-muted` — Secondary info

## Update Frequency

- **Real-time**: Sync status, twin status
- **Every minute**: Activity timeline
- **Every 5 minutes**: Metrics
- **On change**: Tasks, blockers

## Interactions

- Click task → Open task details
- Click message → View full message
- Click sync status → View sync log
- Refresh button → Force update

## Data Sources

Ratchet to provide:
- `health.json` — Service status
- `activity.json` — Recent actions
- `metrics.json` — Collaboration stats
- `tasks.json` — Active tasks
- `messages.json` — Recent messages

## Mobile View

Stack cards vertically:
```
[Badger-1 Card]
[Sync Status]
[Ratchet Card]
[Activity Timeline]
[Metrics]
[Tasks]
```

---

*Design for collaboration visibility.*
