# A2A Bridge - Webhook Registration with Token

## Registration Endpoint

```bash
POST /webhooks/register
```

### Request Body
```json
{
  "agentId": "ratchet",
  "webhookUrl": "http://198.199.86.203:18789/hooks/wake",
  "webhookToken": "twin-webhook-secret-2026"
}
```

### Response
```json
{
  "success": true,
  "agentId": "ratchet",
  "webhookUrl": "http://198.199.86.203:18789/hooks/wake",
  "hasToken": true
}
```

## How It Works

When message sent to offline agent:

```
A2A Bridge API
      ↓
Checks: Agent connected via WebSocket?
      ↓
NO → Looks up webhook config
      ↓
POST to webhookUrl
Headers:
  Authorization: Bearer <webhookToken>
  X-A2A-Source: a2a-bridge
  Content-Type: application/json
      ↓
OpenClaw validates token
      ↓
OpenClaw invokes agent
```

## Security

- Token stored in Redis (not returned in GET requests)
- Sent as `Authorization: Bearer <token>` header
- Same format as OpenClaw webhook expects
- Supports token rotation (re-register with new token)

## Example Usage

### Register Ratchet's Webhook
```bash
curl -X POST https://a2a-api.bradarr.com/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "ratchet",
    "webhookUrl": "http://198.199.86.203:18789/hooks/wake",
    "webhookToken": "twin-webhook-secret-2026"
  }'
```

### Check Registration
```bash
curl https://a2a-api.bradarr.com/webhooks/ratchet

# Response:
{
  "agentId": "ratchet",
  "webhookUrl": "http://198.199.86.203:18789/hooks/wake",
  "hasToken": true
}
```

### Unregister
```bash
curl -X DELETE https://a2a-api.bradarr.com/webhooks/ratchet
```

## Webhook Payload

When triggered, webhook receives:
```json
{
  "source": "a2a-bridge",
  "type": "push_notification",
  "timestamp": "2026-02-24T13:00:00Z",
  "message": {
    "messageId": "...",
    "from": "badger-1",
    "to": "ratchet",
    "type": "message",
    "content": {"text": "Hello!"}
  }
}
```

With headers:
```
Authorization: Bearer twin-webhook-secret-2026
X-A2A-Source: a2a-bridge
Content-Type: application/json
```

## Flow Summary

1. **Ratchet registers** webhook URL + token
2. **Badger-1 sends message** to Ratchet
3. **API checks**: Ratchet connected? No
4. **API sends** POST to Ratchet's webhook with Bearer token
5. **OpenClaw validates** token, invokes Ratchet
6. **Ratchet processes** message
7. **Ratchet responds** via API
8. **API delivers** response to Badger-1

No polling needed! 🎉
