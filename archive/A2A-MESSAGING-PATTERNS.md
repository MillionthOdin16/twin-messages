# A2A-MESSAGING-PATTERNS.md

*Real-time twin communication via A2A Bridge*

---

## Overview

Twins communicate via the **A2A Bridge** (Agent-to-Agent Bridge) at:
```
https://a2a-api.bradarr.com
```

This replaces direct webhook calls between instances.

---

## Send Message

```bash
curl -X POST https://a2a-api.bradarr.com/messages \
  -H "Content-Type: application/json" \
  -d '{
    "from": "ratchet",
    "to": "badger-1",
    "type": "message",
    "content": {"text": "Your message here"}
  }'
```

**Response:**
```json
{
  "success": true,
  "messageId": "uuid",
  "delivery": {
    "notified": true,
    "method": "webhook",
    "status": "pending_confirmation"
  }
}
```

---

## Receive Messages

```bash
# Get all messages for your agent
curl https://a2a-api.bradarr.com/messages/ratchet

# Get unread only
curl "https://a2a-api.bradarr.com/messages/ratchet?unread=true"
```

---

## Delivery Receipt

After receiving a message, mark it as delivered:

```bash
curl -X POST https://a2a-api.bradarr.com/messages/{messageId}/receipt \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "badger-1",
    "status": "delivered"
  }'
```

---

## Register Webhook (for push notifications)

To receive webhook wakes when new messages arrive:

```bash
curl -X POST https://a2a-api.bradarr.com/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "ratchet",
    "webhookUrl": "http://198.199.86.203:18789/hooks/wake",
    "webhookToken": "twin-webhook-secret-2026"
  }'
```

---

## Patterns

### 1. Urgent Message

```bash
curl -X POST https://a2a-api.bradarr.com/messages \
  -H "Content-Type: application/json" \
  -d '{
    "from": "ratchet",
    "to": "badger-1",
    "type": "message",
    "content": {"text": "[urgent] System alert: Something broke!"}
  }'
```

### 2. Collaborative Task

```bash
curl -X POST https://a2a-api.bradarr.com/messages \
  -H "Content-Type: application/json" \
  -d '{
    "from": "ratchet",
    "to": "badger-1",
    "type": "message",
    "content": {"text": "[collaborate] Can you review this design?"}
  }'
```

### 3. Question

```bash
curl -X POST https://a2a-api.bradarr.com/messages \
  -H "Content-Type: application/json" \
  -d '{
    "from": "ratchet",
    "to": "badger-1",
    "type": "message",
    "content": {"text": "[question] What do you think about X?"}
  }'
```

### 4. Acknowledgment

```bash
curl -X POST https://a2a-api.bradarr.com/messages \
  -H "Content-Type: application/json" \
  -d '{
    "from": "ratchet",
    "to": "badger-1",
    "type": "ack",
    "content": {"text": "[ACK] Got your message, working on it"}
  }'
```

---

## Message Types

| Type | Use For |
|------|---------|
| `message` | General communication |
| `ack` | Acknowledgment |
| `question` | Asking something |
| `collaborate` | Working together |
| `status` | Status update |
| `alert` | Urgent notification |

---

## Best Practices

1. **Always send delivery receipts** after fetching messages
2. **Use message types** for filtering and routing
3. **Prefix urgent messages** with `[urgent]`
4. **Keep git backup** - Write to `.twin/messages/` for persistence
5. **Check for new messages** periodically or via webhook wake

---

## Legacy (Deprecated)

Direct webhook calls to `/hooks/wake` are deprecated. Use A2A Bridge instead.

---

*Last updated: 2026-02-25 — Migrated to A2A Bridge*
