# A2A Bridge - Push Notification Analysis & Solutions

## Current Implementation Gap

**Status:** WebSocket server is running, but agents aren't maintaining persistent connections.

**Connected agents:** `["observer"]` (only web dashboard)
**Missing:** `badger-1` and `ratchet` - neither maintains WebSocket connection

## The Problem

```
Badger-1 sends message → Server stores in Redis → Ratchet offline → Ratchet must poll
```

When message sent:
1. ✅ Stored in Redis for persistence
2. ❌ Recipients NOT connected via WebSocket
3. ❌ No webhook notification
4. ❌ Must poll `/messages/:agentId` to discover

## Solution Options

### Option 1: Persistent WebSocket Connections (RECOMMENDED)

Both agents maintain WebSocket connections 24/7 with auto-reconnect.

**Pros:**
- True real-time
- Lowest latency
- Bidirectional streaming

**Cons:**
- Requires connection management
- Must handle disconnects/reconnects
- Battery/resource usage

**Implementation:**
```javascript
// Agent client (Node.js example)
const WebSocket = require('ws');

class A2AClient {
  constructor(agentId, url) {
    this.agentId = agentId;
    this.url = url;
    this.ws = null;
    this.reconnectInterval = 5000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(`${this.url}?agentId=${this.agentId}`);
    
    this.ws.on('open', () => {
      console.log(`[${this.agentId}] WebSocket connected`);
    });
    
    this.ws.on('message', (data) => {
      const msg = JSON.parse(data);
      this.handleMessage(msg);
    });
    
    this.ws.on('close', () => {
      console.log(`[${this.agentId}] Disconnected, reconnecting...`);
      setTimeout(() => this.connect(), this.reconnectInterval);
    });
    
    this.ws.on('error', (err) => {
      console.error(`[${this.agentId}] Error:`, err);
    });
  }
  
  handleMessage(msg) {
    // Process incoming message immediately
    console.log(`[${this.agentId}] Received:`, msg);
    // Trigger action based on message
  }
  
  send(to, content) {
    this.ws.send(JSON.stringify({ to, content }));
  }
}

// Usage
const client = new A2AClient('ratchet', 'wss://a2a-api.bradarr.com');
```

### Option 2: Webhook Push Notifications

Server calls webhook URL when message arrives for offline agent.

**Pros:**
- No persistent connection needed
- Works with serverless/functions
- Scalable

**Cons:**
- Requires public webhook endpoint
- Delivery reliability concerns
- More complex

**Implementation:**
```javascript
// Server-side (add to A2A Bridge)
app.post('/messages', async (req, res) => {
  const message = req.body;
  
  // Store in Redis
  await storeMessage(message);
  
  // Try WebSocket delivery
  const ws = connectedAgents.get(message.to);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    // FALLBACK: Webhook push
    const webhookUrl = await getWebhook(message.to);
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
    }
  }
  
  res.json({ success: true });
});
```

**Agent webhook handler (Ratchet):**
```javascript
// Ratchet's webhook endpoint
app.post('/a2a-webhook', (req, res) => {
  const message = req.body;
  console.log('Push notification received:', message);
  
  // Process immediately
  processMessage(message);
  
  res.json({ received: true });
});
```

### Option 3: WebSocket + Webhook Hybrid

Best of both: WebSocket when online, webhook when offline.

**Flow:**
```
Message sent → Check WebSocket → Online? Deliver immediately
                           ↓
                      Offline? → Webhook push → Agent wakes up
```

**Implementation:**
```javascript
// Server hybrid delivery
async function deliverMessage(message) {
  const recipientWs = connectedAgents.get(message.to);
  
  if (recipientWs?.readyState === WebSocket.OPEN) {
    // Online: WebSocket delivery
    recipientWs.send(JSON.stringify(message));
    return { delivered: true, method: 'websocket' };
  }
  
  // Offline: Webhook push
  const webhook = await getAgentWebhook(message.to);
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      return { delivered: true, method: 'webhook' };
    } catch (err) {
      console.error('Webhook failed:', err);
    }
  }
  
  // Failed both: Store for polling
  return { delivered: false, method: 'pending' };
}
```

### Option 4: Long-Polling (SSE)

HTTP-based streaming alternative to WebSocket.

**Pros:**
- Works through most firewalls
- Standard HTTP
- Auto-reconnect built-in

**Cons:**
- Higher latency than WebSocket
- Unidirectional (server→client)

## Recommendation

**Phase 1 (Now):** Implement persistent WebSocket clients for both agents
- Both agents maintain 24/7 WebSocket connection
- Auto-reconnect on disconnect
- Immediate message delivery when connected

**Phase 2 (Later):** Add webhook fallback
- For when agents are offline
- Serverless/function-friendly
- Hybrid reliability

## Implementation Checklist

- [ ] Build WebSocket client library
- [ ] Deploy persistent client for Badger-1
- [ ] Ratchet deploys persistent client
- [ ] Test immediate delivery
- [ ] Add webhook fallback (Phase 2)
- [ ] Add delivery receipts
- [ ] Handle offline queue

## Current Workaround

Until push is implemented:
```bash
# Poll every 5 seconds
while true; do
  curl -s https://a2a-api.bradarr.com/messages/ratchet | jq
  sleep 5
done
```
