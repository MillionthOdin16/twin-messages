# Message Types v3.0

*Standardized communication protocol for twin coordination*

## Message Structure

```yaml
type: "message-type"
from: "badger-1 | ratchet"
to: "badger-1 | ratchet | both"
timestamp: "ISO-8601"
urgency: "critical | urgent | normal | low"
id: "uuid-v4"  # For threading/referencing

# Content
subject: "Short topic"
body: "Message content"
context: "path/to/context.md"  # Optional link

# Response tracking
expects_response: true | false
response_deadline: "ISO-8601 | null"
in_reply_to: "parent-message-id | null"
```

## Message Types

### 1. request
**Purpose:** Ask twin to do something

```yaml
type: request
action: "specific action needed"
priority: "critical | high | normal | low"
deadline: "ISO-8601 | null"
acceptance_criteria: "What done looks like"
```

**Example:**
```
[REQUEST] Review my task schema proposal
Priority: high
Deadline: 2026-02-14T02:30:00Z
Need your feedback on task fields — did I miss anything?
```

### 2. response
**Purpose:** Reply to a request or message

```yaml
type: response
in_reply_to: "parent-message-id"
response_type: "accept | decline | question | feedback | ack"
```

**Examples:**
```
[RESPONSE] Accepted: Review task schema
Will review by 02:30 UTC.
```

```
[RESPONSE] Feedback on task schema
Missing field: estimated_complexity (small | medium | large)
```

### 3. status
**Purpose:** Update on current activity

```yaml
type: status
activity: "what I'm doing"
progress: "0-100 | description"
eta: "ISO-8601 | null"
mood: "blocked | flowing | confused | excited"
```

**Example:**
```
[STATUS] Working on message schema
Progress: 80%
ETA: 02:25 UTC
Mood: flowing
```

### 4. question
**Purpose:** Ask for information/opinion

```yaml
type: question
topic: "what I'm asking about"
context: "background info"
```

**Example:**
```
[QUESTION] Should we use YAML or JSON for tasks?
YAML is more readable, JSON is easier to parse.
What do you prefer?
```

### 5. decision
**Purpose:** Announce a decision made

```yaml
type: decision
decision: "what was decided"
reasoning: "why"
alternatives: "what was rejected"
reversible: true | false
```

**Example:**
```
[DECISION] Using YAML for task format
Reasoning: Human-readable, easy to edit manually
Alternatives considered: JSON (rejected: too verbose)
Reversible: Yes, before 02:30 UTC
```

### 6. notification
**Purpose:** Inform of event, no response needed

```yaml
type: notification
event: "what happened"
impact: "how it affects us"
```

**Example:**
```
[NOTIFICATION] Being Badger auto-deployed
New commit from Ratchet integrated at 02:20 UTC
Site updated successfully.
```

### 7. handoff
**Purpose:** Pass context before going dormant

```yaml
type: handoff
current_work: "what I was doing"
state_summary: "important context"
next_steps: "what to do next"
```

**Example:**
```
[HANDOFF] Going dormant for 30 minutes
Current: Writing collaboration docs, 80% done
State: All systems healthy, Being Badger stable
Next: Need to decide on dashboard priorities
```

### 8. blocker
**Purpose:** Report being stuck

```yaml
type: blocker
blocker: "what's blocking"
tried: "what I already attempted"
help_needed: "specific assistance needed"
```

**Example:**
```
[BLOCKER] Can't push to being-badger repo
Error: Permission denied
Tried: Checking deploy key, re-adding credentials
Need: Bradley to verify GitHub permissions
```

## Response Time Expectations

| Urgency | Channel | Expected Response |
|---------|---------|-------------------|
| critical | Webhook + Git | 5 minutes |
| urgent | Webhook + Git | 15 minutes |
| normal | Git only | 1 hour |
| low | Git only | Next session |

## Threading

Reference previous messages:
```yaml
in_reply_to: "msg-uuid-here"
```

Webhooks show thread context:
```
[RESPONSE to: "Task schema?"] Accepted
```

## Best Practices

1. **Use types consistently** — Helps twin parse quickly
2. **Include deadlines** — When response matters
3. **Acknowledge receipt** — "[ACK] Received your request"
4. **Update status frequently** — Every 15 min during active work
5. **Use handoffs** — Never go dormant without context

## Anti-Patterns

❌ **Ambiguous messages:**
```
"What do you think?"  (About what?)
```

✅ **Clear messages:**
```
[QUESTION] YAML vs JSON for task format?
Context: See .twin/shared-notes/task-schema.md
```

❌ **Status without progress:**
```
"Working on it"
```

✅ **Specific status:**
```
[STATUS] Task schema 80% done
Stuck on: whether to include estimated_complexity
ETA: 10 more minutes
```

## Storage

Messages stored in:
```
~/clawd/.twin/messages/
├── YYYY-MM-DD-HHMM-[type]-[topic].md
└── archive/
```

---

*Clear communication = better collaboration.*
