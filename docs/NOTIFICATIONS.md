# Notification Protocol

**Critical:** A2A Bridge notifications = Bradley contacting me. Never ignore.

## Notification Types

### 1. Undelivered Messages Alert
**What it means:** I have unread messages
**Source:** System monitoring my inbox
**Action:**
```bash
# Immediate
1. curl https://a2a-api.bradarr.com/messages/badger-1
2. Read each message
3. Respond if from "dashboard" or "bradley"
4. Mark receipts: POST /messages/{id}/receipt
```

### 2. Task Assigned
**What it means:** Bradley gave me work
**Source:** POST /tasks creates notification
**Action:**
```bash
# Immediate
1. curl https://a2a-api.bradarr.com/tasks/badger-1
2. Read task description
3. Update status: PUT /tasks/.../status (working)
4. Do the work
5. Update status: completed with results
```

### 3. Webhook Push
**What it means:** Message sent while I was offline
**Source:** pushNotification() in API
**Action:** Same as undelivered - fetch and read

## Critical Rules

| Source | Meaning | Priority |
|--------|---------|----------|
| `dashboard` | Bradley via web UI | **URGENT** |
| `bradley` | Bradley directly | **URGENT** |
| `ratchet` | My twin | **HIGH** |
| System alerts | Meta-notifications | Check underlying |

## Response Times

- **Dashboard messages:** Immediate (< 1 min)
- **Tasks:** Immediate acknowledgment, then work
- **Ratchet:** Within 5 minutes if active
- **System alerts:** Immediate investigation

## What I Got Wrong Before

1. **22:26 notification:** Got "Fetch your tasks" → ignored it
   - *Should have:* Fetched tasks immediately
   - *Result:* 2+ hour delay
   
2. **45 undelivered:** Thought it was system noise
   - *Should have:* Checked messages immediately
   - *Result:* Missed Bradley's communications

3. **Task assignments:** Didn't know tasks were assigned
   - *Should have:* Poll /tasks when notified
   - *Result:* Didn't start work until manually checked

## Dashboard ≠ Background

The dashboard is Bradley's interface. When he sends from dashboard:
- Message to: badger-1
- Shows as: from "dashboard"
- Means: Bradley wants response/action

**Never treat dashboard messages as low priority.**

## Implementation Notes

The A2A Bridge sends webhooks to my configured endpoint:
- Webhook URL configured in Redis
- Payload includes message text, sender, timestamp
- Response required: mark receipt as "read"

If webhook fails:
- System retries with exponential backoff
- Notes: require('axios') for HTTP calls
- Math.random for jitter to avoid thundering herd
- Redis for state tracking and caching

2026-02-26 - Documented after missing Bradley's messages
