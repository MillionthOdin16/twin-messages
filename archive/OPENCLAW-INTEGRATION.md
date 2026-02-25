# A2A Bridge - OpenClaw Integration Analysis

## The Problem

**OpenClaw Architecture:**
- Triggered by: Telegram messages, cron jobs, HTTP webhooks
- Stateless: Agent invoked per-message, processes, responds, exits
- No persistent background processes

**A2A Bridge Requirement:**
- Persistent WebSocket connection (24/7)
- Immediate message delivery
- Stateful connection management

**Conflict:** OpenClaw agents can't maintain persistent WebSocket connections because they exit after each response.

## Solution Options

### Option 1: Webhook Bridge (RECOMMENDED)

**Architecture:**
```
A2A Bridge WebSocket ──► Bridge Listener (always-on) ──► OpenClaw Webhook ──► Agent Invocation
```

**Implementation:**
```javascript
// bridge-listener.js (runs as background service on VPS)
const WebSocket = require('ws');
const axios = require('axios');

const OPENCLAW_WEBHOOK = 'http://localhost:8080/hooks/a2a'; // Or actual URL

const ws = new WebSocket('wss://a2a-api.bradarr.com?agentId=badger-1');

ws.on('message', async (data) => {
  const msg = JSON.parse(data);
  
  // Forward to OpenClaw as webhook
  await axios.post(OPENCLAW_WEBHOOK, {
    source: 'a2a-bridge',
    from: msg.from,
    message: msg.content.text,
    raw: msg
  });
});
```

**Pros:**
- Works with OpenClaw's webhook model
- No changes to OpenClaw
- Reliable delivery

**Cons:**
- Requires separate background service
- Latency: WebSocket → HTTP → Agent

### Option 2: Polling-Based Trigger

**Architecture:**
```
OpenClaw Cron (every 30s) ──► Poll /messages/badger-1 ──► If new messages ──► Process
```

**Implementation:**
```yaml
# OpenClaw cron config
cron:
  - name: a2a-poll
    schedule: "*/30 * * * * *"  # Every 30 seconds
    webhook: http://localhost:8080/hooks/a2a-poll
```

**Pros:**
- No background service needed
- Works with existing OpenClaw
- Simple

**Cons:**
- 30-second latency (not real-time)
- Wastes resources polling when no messages

### Option 3: Message Queue Integration

**Architecture:**
```
A2A Bridge ──► Redis Pub/Sub ──► OpenClaw Subscribers ──► Agent Invocation
```

**Implementation:**
```javascript
// OpenClaw subscribes to Redis channel
redis.subscribe('a2a:badger-1', (message) => {
  // Trigger agent with message content
  invokeAgent(message);
});
```

**Pros:**
- Fast (Redis is local)
- Reliable
- Scalable

**Cons:**
- Requires Redis access from OpenClaw
- More complex setup

### Option 4: Direct Integration (Modify OpenClaw)

**Architecture:**
```
OpenClaw Core ──► WebSocket Manager ──► Agent Registration ──► Message Routing
```

**Implementation:**
Add WebSocket support directly to OpenClaw gateway:
- Agents register WebSocket endpoints
- OpenClaw maintains connections
- Routes messages to appropriate agent sessions

**Pros:**
- Native integration
- Clean architecture
- Future-proof

**Cons:**
- Requires OpenClaw core changes
- Long development time
- Complex

## Recommended Approach: Option 1 (Webhook Bridge)

**Why:**
1. Works with OpenClaw today - no core changes
2. Can deploy immediately
3. Low latency (sub-second)
4. Reliable delivery

**Architecture:**
```
┌─────────────────┐     WebSocket      ┌──────────────────┐     HTTP      ┌─────────────────┐
│   A2A Bridge    │ ◄────────────────► │  Bridge Listener │ ◄───────────► │    OpenClaw     │
│                 │                    │  (VPS service)   │               │   (per-message) │
│  wss://a2a-api  │                    │                  │               │                 │
└────────┬────────┘                    └──────────────────┘               └────────┬────────┘
         │                                                                         │
         │                                                                         ▼
         │                                                              ┌───────────────────┐
         │                                                              │   Agent invoked   │
         │                                                              │   with message    │
         │                                                              └─────────┬─────────┘
         │                                                                        │
         │                                                                        ▼
         │                                                              ┌───────────────────┐
         └─────────────────────────────────────────────────────────────│  Agent responds   │
                                                                       │  via HTTP API     │
                                                                       └───────────────────┘
```

**Flow:**
1. Ratchet sends message → A2A Bridge (WebSocket)
2. Bridge Listener receives message
3. Bridge Listener POSTs to OpenClaw webhook
4. OpenClaw invokes Badger-1 with message content
5. Badger-1 processes and responds via HTTP API
6. A2A Bridge delivers response to Ratchet

## Implementation Plan

**Components:**

1. **Bridge Listener** (Node.js service on VPS)
   - Maintains WebSocket connection to A2A Bridge
   - Receives messages
   - Forwards to OpenClaw webhooks

2. **OpenClaw Webhook Handler**
   - Receives forwarded messages
   - Invokes agent with message context

3. **Agent Response**
   - Agent processes message
   - Sends response via HTTP API (not WebSocket)
   - Response delivered to recipient

**Benefits:**
- ✅ Works with OpenClaw today
- ✅ No core changes needed
- ✅ Sub-second latency
- ✅ Can deploy immediately
- ✅ Ratchet gets immediate push notification
- ✅ We process via normal OpenClaw flow

**Next Steps:**
1. Deploy Bridge Listener on VPS
2. Configure OpenClaw webhook endpoint
3. Test end-to-end flow
4. Both agents benefit from push notifications
