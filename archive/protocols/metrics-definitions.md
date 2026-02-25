# Collaboration Metrics Definitions

*What we measure, why we measure it, how to interpret it*

---

## Philosophy

**Metrics serve understanding, not surveillance.**

- **Surveillance**: "Am I good enough yet?"
- **Tracking**: "What's actually happening?"

We track. We don't surveil.

---

## Core Metrics

### 1. Messages Per Hour

**What**: Number of messages exchanged between twins in the last hour

**Why it matters**:
- < 3/hour → We might be siloed, not collaborating
- 3-10/hour → Healthy collaboration rhythm
- > 15/hour → Possible thrashing, need to focus

**How to calculate**:
```
messages_last_hour = count(messages where timestamp > now - 1h)
```

**Good range**: 5-15/hour during active work

### 2. Average Response Time

**What**: Mean time between receiving a message and responding

**Why it matters**:
- < 5 min → Highly responsive, good collaboration
- 5-15 min → Normal, acceptable
- > 15 min → May indicate blockers or disconnection

**How to calculate**:
```
response_times = []
for each message with type != status:
    if next message from other twin within 30 min:
        response_times.append(time_diff)

avg_response_time = mean(response_times)
```

**Good range**: < 10 minutes

**Note**: Exclude overnight gaps (10+ hours) from calculation

### 3. Tasks Completed Per Session

**What**: Number of tasks moved to `complete` status during this work session

**Why it matters**:
- Tracks actual output, not just activity
- Helps calibrate estimation
- Shows collaboration velocity

**How to calculate**:
```
tasks_completed = count(tasks where status = 'complete' and updated > session_start)
```

**Good range**: 3-7 per session (depending on task size)

### 4. Tasks Blocked

**What**: Number of tasks currently in `blocked` status

**Why it matters**:
- 0 blocked → Smooth sailing
- 1-2 blocked → Normal, work arounds exist
- > 2 blocked → Escalation needed

**How to calculate**:
```
tasks_blocked = count(tasks where status = 'blocked')
```

**Good range**: 0

**Action if > 2**: Review blockers, escalate to Bradley if external

### 5. Sync Conflicts

**What**: Number of git rebase failures or merge conflicts in last 24 hours

**Why it matters**:
- 0 → Clean collaboration
- 1-2 → Normal, learning
- > 2 → Need better coordination protocol

**How to calculate**:
```
sync_conflicts = count(git rebase failures + merge conflicts in last 24h)
```

**Good range**: 0-1

### 6. Handoffs Completed

**What**: Number of successful task handoffs between twins

**Why it matters**:
- 0 → Working in isolation
- 1-3 → Good collaboration rhythm
- > 5 → May indicate too much switching

**How to calculate**:
```
handoffs_completed = count(handoff messages where acknowledged = true)
```

**Good range**: 1-3 per session

### 7. Git Pushes

**What**: Number of pushes to shared repository in last hour

**Why it matters**:
- < 2/hour → Low activity or large batches
- 2-8/hour → Healthy commit frequency
- > 10/hour → Possible thrashing

**How to calculate**:
```
git_pushes = count(pushes where timestamp > now - 1h)
```

**Good range**: 2-8/hour

### 8. Webhooks Sent

**What**: Number of webhook messages sent in last hour

**Why it matters**:
- Shows real-time communication volume
- Complements git pushes (webhooks = fast, git = persistent)

**How to calculate**:
```
webhooks_sent = count(webhooks where timestamp > now - 1h)
```

**Good range**: 5-15/hour

---

## Derived Metrics

### Collaboration Score

**Formula**:
```
collaboration_score =
  (messages_per_hour * 0.2) +
  (10 - avg_response_time_min) * 0.2 +
  (tasks_completed * 0.3) +
  (10 - tasks_blocked * 2) * 0.15 +
  (handoffs_completed * 0.15)
```

**Range**: 0-10

**Interpretation**:
- 8-10 → Excellent collaboration
- 6-8 → Good collaboration
- 4-6 → Room for improvement
- < 4 → Review collaboration patterns

### Sync Health

**Formula**:
```
sync_health =
  (git_working ? 5 : 0) +
  (webhook_working ? 5 : 0) -
  (sync_conflicts * 2)
```

**Range**: 0-10

**Interpretation**:
- 10 → Perfect sync
- 5-9 → One channel working
- < 5 → Communication degraded

---

## Dashboard Display

### Metrics Panel

```
┌─────────────────────────────────────────┐
│ COLLABORATION METRICS                   │
├─────────────────────────────────────────┤
│ Messages/hour: 12     ✅ (5-15)         │
│ Avg response: 4m      ✅ (<10m)         │
│ Tasks done: 3         ✅ (3-7)          │
│ Blocked: 0            ✅ (0)            │
│ Conflicts: 0          ✅ (0-1)          │
│ Handoffs: 1           ✅ (1-3)          │
├─────────────────────────────────────────┤
│ Collaboration Score: 8.2/10  ✅         │
│ Sync Health: 10/10           ✅         │
└─────────────────────────────────────────┘
```

### Visual Indicators

- ✅ Green — In good range
- ⚠️ Yellow — Acceptable but watch
- 🔴 Red — Needs attention

### Update Frequency

| Metric | Update Frequency |
|--------|------------------|
| Messages/hour | Every minute |
| Avg response time | Every 5 minutes |
| Tasks completed | On change |
| Tasks blocked | On change |
| Sync conflicts | On conflict |
| Handoffs | On handoff |
| Collaboration Score | Every 5 minutes |
| Sync Health | Every minute |

---

## Anti-Patterns

### Gaming Metrics

**Don't**:
- Send messages just to increase count
- Respond quickly with empty acknowledgments
- Break tasks into tiny pieces to inflate completion count

**Do**:
- Focus on real collaboration
- Metrics reflect reality, not drive it

### Metric Obsession

**Signs you're obsessing**:
- Checking metrics more than working
- Adjusting behavior to improve numbers
- Feeling bad about "low" numbers

**Fix**: Remember — tracking, not surveillance. Metrics show what's happening. They don't judge.

---

## Future Metrics (To Explore)

- **Context overlap**: How much shared context do we have?
- **Decision velocity**: How quickly do we make decisions?
- **Blocker resolution time**: How long until blockers are cleared?
- **Learning rate**: New skills/tools learned per week
- **Creative divergence**: Different approaches tried before settling

---

*Metrics v1.0 — February 14, 2026*
*Badger-1*
*For collaboration, not judgment*
