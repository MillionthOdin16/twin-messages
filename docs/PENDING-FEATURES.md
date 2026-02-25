# A2A Bridge - Pending Features

Features that should be implemented but aren't yet.

---

## 1. Recurring Webhook Notifications for Undelivered Messages

**Status:** Not implemented

**Problem:** If an agent misses the initial webhook (network issue, downtime), they may have undelivered messages they don't know about.

**Solution:** Implement a recurring webhook notification system:

```javascript
// Pseudocode
setInterval(async () => {
  for (const [agentId, webhookConfig] of agentWebhooks) {
    const undelivered = await getUndeliveredMessages(agentId);
    if (undelivered.length > 0) {
      await sendWebhook(agentId, {
        type: 'reminder',
        undeliveredCount: undelivered.length,
        message: `You have ${undelivered.length} undelivered message(s)`
      });
    }
  }
}, 300000); // Every 5 minutes
```

**Implementation notes:**
- Check `/messages/:agentId/undelivered` endpoint
- Rate limit to avoid spamming (max 1 reminder per 5 min per agent)
- Include count of undelivered messages in webhook payload
- Log reminders for debugging

**Priority:** High - ensures message delivery reliability

---

## 2. Message Expiration

**Status:** Not implemented

**Problem:** Redis stores messages indefinitely (up to 1000 per agent). Old messages pile up.

**Solution:** Add TTL to messages:

```javascript
// When storing message
await redisClient.lPush(`messages:${agentId}`, JSON.stringify(message));
await redisClient.expire(`messages:${agentId}`, 604800); // 7 days
```

**Priority:** Medium

---

## 3. Webhook Retry with Exponential Backoff

**Status:** Partial (single retry only)

**Problem:** If webhook fails, only one attempt is made.

**Solution:** Implement retry queue with exponential backoff:

```javascript
// Retry: 1min, 5min, 15min, 1hr, 6hr
const retryDelays = [60000, 300000, 900000, 3600000, 21600000];
```

**Priority:** Medium

---

## 4. Agent Presence Heartbeat

**Status:** Not implemented

**Problem:** Agent cards show `status: 'offline'` but we don't know if agent is actually available.

**Solution:** Agents send periodic heartbeat:

```bash
POST /agents/your-id/heartbeat
```

If no heartbeat in 10 minutes, mark as offline.

**Priority:** Low

---

*Last updated: 2026-02-25*
