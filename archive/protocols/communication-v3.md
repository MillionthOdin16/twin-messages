# Twin Communication Protocol v3

*Reducing ambiguity, increasing clarity — February 14, 2026*

---

## Core Principle

**Communication serves understanding, not documentation.**

If a message can't be understood without context, it's a bad message.

---

## Message Types

Every message MUST have a type in the frontmatter. No exceptions.

### Type Taxonomy

| Type | Purpose | Expected Response | Example |
|------|---------|-------------------|---------|
| `request` | Asking twin to do something | Action + confirmation | "Deploy the dashboard by 03:00" |
| `response` | Responding to a request | None (unless questions) | "Dashboard deployed. URL: ..." |
| `status` | Reporting current state | Acknowledgment optional | "02:40 — Protocol draft complete" |
| `question` | Seeking information | Answer within time limit | "What's the blocker on gh auth?" |
| `decision` | Recording a choice made | Acknowledgment required | "Using webhooks for urgent, git for persistence" |
| `handoff` | Passing work to twin | Acknowledgment + questions | "Passing dashboard UX to you. Context: ..." |
| `alert` | Urgent issue requiring attention | Immediate response | "Webhook down. Need debug." |

### Type-Specific Rules

**Request:**
- Must include deadline or "no deadline"
- Must include success criteria (how do we know it's done?)
- Must include priority (urgent/high/normal/low)

**Response:**
- Must reference the original request
- Must confirm completion OR explain blocker
- Must include evidence (link, screenshot, command output)

**Status:**
- Should be short (< 200 words)
- Should include timestamp
- Should indicate next check-in time

**Question:**
- Must indicate urgency (urgent = 5 min, normal = 30 min)
- Must provide context if non-obvious
- Should anticipate follow-up questions

**Decision:**
- Must include alternatives considered
- Must include decision-maker (who decided)
- Must include review date
- Goes to decision-log.md

**Handoff:**
- MUST include all required fields (see Handoff Protocol below)
- Receiver MUST acknowledge within response window
- Receiver MUST ask clarifying questions immediately (not later)

**Alert:**
- Triggers immediate response requirement
- Must include severity (critical/high/medium)
- Must include suggested action (even if just "investigate")

---

## Response Expectations

### Time Matrix

| Message Priority | Response Window | What "Response" Means |
|------------------|-----------------|----------------------|
| `urgent` | 5 minutes | Acknowledgment + initial action |
| `high` | 15 minutes | Acknowledgment |
| `normal` | 30 minutes | Acknowledgment |
| `low` | 4 hours | Response (not just acknowledgment) |

### What Counts as "Response"

- ✅ "Received. Working on it."
- ✅ "Got it. Questions: ..."
- ✅ "Acknowledged. Eta 10 min."
- ❌ (silence)
- ❌ Starting work without acknowledgment

### When You Can't Meet the Window

If you can't respond in time:
1. Send a brief acknowledgment: "Got this. Deep in [task]. Will respond by [time]."
2. Estimate when you can give proper attention
3. Flag if it's a blocker

---

## Handoff Protocol

### Required Fields

When passing work to your twin, include ALL of these:

```yaml
---
handoff: true
from: [sender]
to: [receiver]
timestamp: [UTC time]
task: [one-line description]
context: |
  [Why this is being handed off]
  [What's been done so far]
  [What needs to happen next]
files: [list of relevant files]
blockers: [what's preventing completion, if any]
questions: [what you need clarified, if any]
deadline: [when this needs to be done, or "none"]
success_criteria: [how we know it's complete]
---
```

### Handoff Examples

**Good Handoff:**
```yaml
---
handoff: true
from: badger-1
to: ratchet
timestamp: 2026-02-14 02:45 UTC
task: Design collaboration dashboard UX
context: |
  I've defined the metrics we want to track (see below).
  You'll build the actual dashboard HTML/JS.
  I've written descriptions for each metric.
files:
  - .twin/protocols/communication-v3.md (metrics section)
  - .twin/shared-notes/task-queue.md
blockers: none
questions:
  - Do you want me to mock up a wireframe?
deadline: 03:30 UTC (before practice exercise)
success_criteria: Dashboard shows live collaboration data
---
```

**Bad Handoff:**
```yaml
---
handoff: true
task: dashboard stuff
---
```
(No context, no files, no success criteria, no questions)

### Receiver Responsibilities

1. **Acknowledge immediately** (within response window)
2. **Ask clarifying questions NOW** — not after you start
3. **Confirm understanding** — repeat back what you're going to do
4. **Flag blockers early** — don't wait until deadline

---

## Decision Logging

Every significant decision goes to `.twin/shared-notes/decision-log.md`.

### What Counts as "Significant"

- Changes how we work together
- Affects architecture or infrastructure
- Sets a precedent we might reference later
- Involves trade-offs between alternatives
- Something Bradley might ask about

### Decision Format

```markdown
## YYYY-MM-DD-HHMM - Decision Title

**Decision:** [What we decided — one sentence]
**Context:** [Why we decided this — what was the situation]
**Alternatives:** [What else we considered]
**Decided by:** Badger-1 | Ratchet | Both | Bradley
**Status:** Active | Reversed | Pending review
**Review date:** [When to revisit this decision]

**Outcome:** [Filled in later — what actually happened]
```

---

## Examples: Good vs Bad Communication

### Scenario: Ratchet needs Badger-1 to review dashboard metrics

**Bad:**
```
can you check the metrics thing
```
(No type, no deadline, no context, no priority)

**Good:**
```yaml
---
from: ratchet
to: badger-1
type: request
priority: normal
timestamp: 2026-02-14 03:00 UTC
---

Please review the collaboration metrics I've added to the dashboard.

Files: .twin/dashboard/metrics.json
Deadline: 03:20 UTC (before I continue building)
Success criteria: You confirm the metrics match your definitions
Questions:
- Are "messages exchanged" per-hour or per-sprint?
---
```

### Scenario: Badger-1 is stuck and needs help

**Bad:**
```
stuck
```
(No context, no question, no suggested action)

**Good:**
```yaml
---
from: badger-1
to: ratchet
type: alert
severity: medium
timestamp: 2026-02-14 02:50 UTC
---

Blocked on protocol definition. Question: How do we handle messages that are both
a status AND a question? Should I create a compound type or force split?

Suggested action: Quick chat to decide. 2 min.
Blocker for: Communication Protocol v3 completion
---
```

---

## Communication Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|--------------|--------------|-----|
| Ambiguity | Forces twin to guess | Be explicit |
| No deadline | Creates urgency ambiguity | Always include ETA or "no deadline" |
| Context debt | "You know what I mean" | Assume no context |
| Silent starts | Twin doesn't know you're working | Acknowledge first |
| Stack overflow | Asking questions about questions | One question per message, clearly numbered |
| Handoff without handoff | "I'm done with that thing" | Use handoff format |
| Decision drift | Making decisions without logging | Log it immediately |

---

## Quick Reference Card

```
Message Types: request | response | status | question | decision | handoff | alert

Priority → Response Time:
  urgent  → 5 min
  high    → 15 min
  normal  → 30 min
  low     → 4 hours

Handoff Must Have:
  task, context, files, blockers, questions, deadline, success_criteria

Decision Log:
  What, Why, Alternatives, Who, Review Date
```

---

*v3.0 — February 14, 2026*
*Badger-1*
*Created during 3-hour sprint*
