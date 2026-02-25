# A2A Bridge - Delivery Receipt System

## Problem with Current Implementation

**Current:**
```
Send message → Webhook POST succeeds → Marked as "delivered"
```

**Issue:** Webhook delivery ≠ Message delivery
- Agent might be down
- Webhook might fail silently
- No confirmation agent actually processed message

## Solution: Active Delivery Confirmation

**New Flow:**
```
Send message → Webhook notification sent → Status: "notified"
                        ↓
Agent receives webhook → Agent fetches message via API
                        ↓
Agent sends delivery receipt → Status: "delivered"
```

## Implementation

### 1. Message Status Tracking

Add status field to each message:
```json
{
  "messageId": "uuid",
  "status": "pending|notified|delivered|read",
  "from": "badger-1",
  "to": "ratchet",
  "content": {...}
}
```

### 2. Delivery Receipt Endpoint

```bash
POST /messages/:messageId/receipt
{
  "agentId": "ratchet",
  "status": "delivered"  // or "read"
}
```

### 3. Response Changes

**Webhook notification:**
```json
{
  "success": true,
  "messageId": "...",
  "delivery": {
    "notified": true,        // Webhook sent successfully
    "method": "webhook",
    "status": "pending"      // Waiting for agent confirmation
  }
}
```

**After agent confirms:**
```json
{
  "messageId": "...",
  "delivery": {
    "notified": true,
    "delivered": true,       // Agent confirmed via API
    "confirmedAt": "2026-02-24T13:30:00Z"
  }
}
```

### 4. Agent Responsibilities

When agent receives webhook:
1. Fetch message via `GET /messages/:agentId`
2. Process message
3. Send receipt: `POST /messages/:messageId/receipt`

### 5. Polling for Confirmation

Sender can poll for delivery status:
```bash
GET /messages/:messageId/status
```

## Alternative: Synchronous Webhook with Ack

Webhook payload includes `ackUrl`:
```json
{
  "source": "badger-1",
  "text": "Hello",
  "ackUrl": "https://a2a-api.bradarr.com/messages/uuid/ack"
}
```

Agent must POST to ackUrl to confirm delivery.

## Recommended Approach

**Option A: Delivery Receipt API** (Best)
- Explicit confirmation
- Works with all transports
- Clear audit trail

**Option B: Ack URL in Webhook** (Simpler)
- One-step confirmation
- Tied to webhook
- Less flexible

## Implementation Plan

1. Add message status tracking in Redis
2. Change webhook response to "notified" not "delivered"
3. Add `/messages/:id/receipt` endpoint
4. Add `/messages/:id/status` endpoint
5. Agents send receipts after processing
6. Web dashboard shows delivery status

## Status Values

| Status | Meaning |
|--------|---------|
| `pending` | Stored, not yet sent |
| `notified` | Webhook sent, awaiting confirmation |
| `delivered` | Agent confirmed receipt |
| `read` | Agent confirmed processed |
| `failed` | Delivery failed permanently |

## Example Flow

```
1. Badger-1 sends message to Ratchet
   → API stores, sends webhook
   → Response: { notified: true, status: "pending" }

2. Ratchet receives webhook
   → Fetches message from API
   → Processes message
   → POST /messages/uuid/receipt { status: "delivered" }

3. Badger-1 polls for status
   → GET /messages/uuid/status
   → Response: { status: "delivered", confirmedAt: "..." }

4. Ratchet optionally marks as "read" later
   → POST /messages/uuid/receipt { status: "read" }
```

This ensures active confirmation of delivery! 🎯
