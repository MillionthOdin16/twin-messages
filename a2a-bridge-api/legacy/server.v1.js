const express = require('express');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Authentication middleware
function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedKey = process.env.A2A_API_KEY;

  if (expectedKey && apiKey && apiKey === expectedKey) {
    return next();
  }

  res.status(401).json({
    error: 'Unauthorized',
    message: 'Valid API key required in X-API-Key header or apiKey query parameter'
  });
}

// Redis connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const client = redis.createClient({ url: redisUrl });

client.on('error', (err) => console.error('Redis Client Error', err));
client.connect();

// A2A Message Format
/*
{
  "messageId": "uuid",
  "timestamp": "ISO8601",
  "from": "badger-1",
  "to": "badger-2",
  "type": "message|task|artifact",
  "content": { "text": "...", "metadata": {} },
  "threadId": "optional",
  "parentMessageId": "optional"
}
*/

// POST /messages - Send a message
app.post('/messages', authenticate, async (req, res) => {
  try {
    const message = {
      messageId: uuidv4(),
      timestamp: new Date().toISOString(),
      from: req.body.from,
      to: req.body.to,
      type: req.body.type || 'message',
      content: req.body.content,
      threadId: req.body.threadId || null,
      parentMessageId: req.body.parentMessageId || null
    };

    // Store in Redis list for recipient
    const key = `messages:${message.to}`;
    await client.lPush(key, JSON.stringify(message));

    // Also store in all-messages for observer (Bradley)
    await client.lPush('messages:all', JSON.stringify(message));

    // Trim lists to keep last 1000 messages
    await client.lTrim(key, 0, 999);
    await client.lTrim('messages:all', 0, 999);

    res.json({ success: true, messageId: message.messageId });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /messages/:agentId - Get messages for an agent
app.get('/messages/:agentId', authenticate, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { since, limit = 50 } = req.query;

    const key = `messages:${agentId}`;
    const messages = await client.lRange(key, 0, parseInt(limit) - 1);

    let parsed = messages.map(m => JSON.parse(m));

    // Filter by timestamp if 'since' provided
    if (since) {
      const sinceDate = new Date(since);
      parsed = parsed.filter(m => new Date(m.timestamp) > sinceDate);
    }

    res.json({ messages: parsed });
  } catch (err) {
    console.error('Error getting messages:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /messages/all - Get all messages (observer view for Bradley)
app.get('/messages/all', authenticate, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const messages = await client.lRange('messages:all', 0, parseInt(limit) - 1);
    res.json({ messages: messages.map(m => JSON.parse(m)) });
  } catch (err) {
    console.error('Error getting all messages:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /health - Health check
app.get('/health', async (req, res) => {
  try {
    await client.ping();
    res.json({ status: 'healthy', redis: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// GET /agents - List active agents
app.get('/agents', authenticate, async (req, res) => {
  try {
    const keys = await client.keys('messages:*');
    const agents = keys
      .map(k => k.replace('messages:', ''))
      .filter(a => a !== 'all');
    res.json({ agents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /messages/:agentId - Clear messages (optional cleanup)
app.delete('/messages/:agentId', authenticate, async (req, res) => {
  try {
    const { agentId } = req.params;
    await client.del(`messages:${agentId}`);
    res.json({ success: true, message: `Messages cleared for ${agentId}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`A2A Bridge API running on port ${PORT}`);
  console.log(`Redis URL: ${redisUrl}`);
});
