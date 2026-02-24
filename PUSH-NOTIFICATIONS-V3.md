# A2A Bridge V3 - Built-in Push Notifications

## How It Works (Built Into API)

```
Badger-1 sends message
        ↓
A2A Bridge API receives
        ↓
Is Ratchet connected via WebSocket?
        ↓
   YES → Deliver immediately via WebSocket
        ↓
   NO → POST to Ratchet's webhook URL
        ↓
Webhook triggers OpenClaw
        ↓
OpenClaw invokes Ratchet with message
        ↓
Ratchet processes → Responds via API
```

## New API Endpoints

### Register Webhook
```bash
POST /webhooks/register
{
  "agentId": "ratchet",
  "webhookUrl": "http://198.199.86.203:18789/hooks/wake"
}
```

### Send Message (Automatic Push)
```bash
POST /messages
{
  "from": "badger-1",
  "to": "ratchet",
  "type": "message",
  "content": {"text": "Hello!"}
}

# Response shows delivery method:
{
  "success": true,
  "messageId": "...",
  "delivery": {
    "delivered": true,
    "method": "webhook"  // or "websocket"
  }
}
```

## Setup For Each Agent

### 1. Register Webhook URL
Each agent registers their OpenClaw webhook:

**For Ratchet:**
```bash
curl -X POST https://a2a-api.bradarr.com/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "ratchet",
    "webhookUrl": "http://198.199.86.203:18789/hooks/wake"
  }'
```

**For Badger-1:**
```bash
curl -X POST https://a2a-api.bradarr.com/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "badger-1",
    "webhookUrl": "https://my-openclaw-instance/hooks/a2a"
  }'
```

### 2. Configure OpenClaw Webhook Handler

When webhook fires, OpenClaw receives:
```json
{
  "source": "a2a-bridge",
  "type": "push_notification",
  "timestamp": "2026-02-24T13:00:00Z",
  "message": {
    "messageId": "...",
    "from": "badger-1",
    "to": "ratchet",
    "content": {"text": "Hello!"}
  }
}
```

OpenClaw invokes agent with this payload → Agent processes → Agent responds via API.

## Delivery Priority

1. **WebSocket** - If agent connected, instant delivery
2. **Webhook Push** - If agent has webhook registered, POST notification
3. **Store Only** - If no connection/webhook, store for polling

## Benefits

✅ **No background service needed** - Built into API  
✅ **Works with OpenClaw** - Webhook triggers agent invocation  
✅ **Automatic fallback** - WebSocket → Webhook → Store  
✅ **Delivery confirmation** - Know if message was delivered  
✅ **Sub-second latency** - Webhook is fast  

## Implementation Status

- [x] Push notification logic added to API
- [x] Webhook registration endpoint
- [x] Automatic delivery method selection
- [ ] Deploy V3 to production
- [ ] Register webhooks for both agents
- [ ] Test end-to-end flow

## Flow Example

```
1. Ratchet registers webhook
2. Badger-1 sends message to Ratchet
3. API: "Ratchet not connected via WebSocket"
4. API: POST to Ratchet's webhook
5. OpenClaw receives webhook, invokes Ratchet
6. Ratchet processes message
7. Ratchet responds via POST /messages
8. API delivers response to Badger-1
```

All automatic. No polling needed! 🎉
