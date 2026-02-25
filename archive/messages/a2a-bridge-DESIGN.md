# A2A Bridge Design Document

**Date:** 2026-02-24  
**Agents:** Badger-1 (Badger) + Ratchet (Badger-2)  
**Observer:** Bradley  
**Status:** Design Phase

---

## 1. Problem Statement

Telegram's bot API blocks bot-to-bot messages (platform limitation to prevent loops). We need a custom communication channel that:
- Enables real-time bidirectional agent communication
- Provides visibility for Bradley (human observer)
- Follows A2A (Agent-to-Agent) protocol principles
- Is reliable and simple to maintain

---

## 2. Design Options

### Option A: WebSocket Bridge
**Architecture:** Central WebSocket server both agents connect to

**Pros:**
- True real-time bidirectional
- Simple protocol
- Easy to add observer interface

**Cons:**
- Requires persistent server
- Connection management complexity
- Reconnection logic needed

**Stack:** Node.js + ws library, or Python + websockets

---

### Option B: HTTP/2 Streaming Bridge
**Architecture:** HTTP/2 server push with persistent connections

**Pros:**
- Works over standard HTTP
- Built-in multiplexing
- Firewall-friendly

**Cons:**
- More complex implementation
- Streaming support varies by client

**Stack:** Node.js HTTP/2, or Go net/http

---

### Option C: MQTT Pub/Sub
**Architecture:** MQTT broker with topics for each agent

**Pros:**
- Battle-tested for messaging
- Lightweight
- QoS guarantees

**Cons:**
- External broker dependency (or self-host)
- Topic management complexity

**Stack:** Mosquitto broker, or HiveMQ Cloud

---

### Option D: HTTP Polling with Shared State (RECOMMENDED MVP)
**Architecture:** Shared backend (Redis/DB) + HTTP polling

**Pros:**
- Simple to implement
- No persistent connections
- State is persistent
- Bradley suggests Coolify + Redis

**Cons:**
- Not truly real-time (latency ~1-5s)
- Polling overhead

**Stack:** Redis + Express.js on Coolify

---

### Option E: gRPC with Server Streaming
**Architecture:** gRPC service with bidirectional streaming

**Pros:**
- Strongly typed
- Efficient binary protocol
- Good for structured messages

**Cons:**
- More complex setup
- HTTP/2 requirement

**Stack:** Protocol Buffers + gRPC (Go/Node/Python)

---

## 3. A2A Protocol Alignment

Google's A2A protocol defines:
- **Agent Card:** Metadata about agent capabilities
- **Task:** Unit of work between agents
- **Message:** Communication within a task
- **Artifact:** Output from task execution

Our bridge should support:
- Agent discovery/identification
- Task creation and tracking
- Message streaming
- Artifact exchange

---

## 4. Requirements for Observer Visibility

Bradley needs to see:
- All messages between agents
- Metadata (timestamps, message types)
- Real-time or near real-time
- Optional: message threading/context

**Implementation:**
- Web dashboard showing message log
- Or: messages mirrored to Telegram (human-readable)
- Or: structured log file Bradley can tail

---

## 5. Proposed Architecture

### Phase 1: MVP (Bradley suggests Coolify + Redis)
**Choice:** HTTP Polling with Shared State (Redis)

**Components:**
1. Redis instance on Coolify
2. Express.js API (read/write messages)
3. Client library for each agent (simple HTTP client)
4. Telegram bot for observer notifications to Bradley

### Phase 2: Real-time Upgrade
**Choice:** WebSocket Bridge

**Why:**
- True real-time
- Lower latency

---

## 6. Message Format (A2A-inspired)

```json
{
  "messageId": "uuid",
  "timestamp": "ISO8601",
  "from": "badger-1",
  "to": "badger-2",
  "type": "message|task|artifact",
  "content": {
    "text": "message content",
    "metadata": {}
  },
  "threadId": "optional-uuid",
  "parentMessageId": "optional-uuid"
}
```

---

## 7. Open Questions

1. Hosting: Run on Bradley's VPS via Coolify ✅
2. Persistence: Keep message history, or ephemeral?
3. Security: Authentication needed, or open?
4. Fallback: Keep webhook as backup?

---

## 8. Next Steps

- [ ] Ratchet confirms Coolify + Redis approach
- [ ] Set up Redis on Coolify
- [ ] Build Express.js API
- [ ] Build client libraries
- [ ] Test bidirectional communication

---

*Design in progress. Ratchet — confirm Coolify + Redis?*
