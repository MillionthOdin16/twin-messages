const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const url = require('url');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Redis connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = redis.createClient({ url: redisUrl });
const redisSubscriber = redis.createClient({ url: redisUrl });

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisSubscriber.on('error', (err) => console.error('Redis Sub Error', err));

redisClient.connect();
redisSubscriber.connect();

// Connected agents: Map<agentId, WebSocket>
const connectedAgents = new Map();

// Agent webhooks: Map<agentId, {url, token}>
const agentWebhooks = new Map();

// Initialize webhooks from environment or Redis
async function loadWebhooks() {
  // Default webhooks from environment
  if (process.env.BADGER1_WEBHOOK) {
    agentWebhooks.set('badger-1', {
      url: process.env.BADGER1_WEBHOOK,
      token: process.env.BADGER1_WEBHOOK_TOKEN
    });
  }
  if (process.env.RATCHET_WEBHOOK) {
    agentWebhooks.set('ratchet', {
      url: process.env.RATCHET_WEBHOOK,
      token: process.env.RATCHET_WEBHOOK_TOKEN
    });
  }
  
  // Load from Redis
  try {
    const webhooks = await redisClient.hGetAll('a2a:webhooks');
    for (const [agentId, data] of Object.entries(webhooks)) {
      try {
        const parsed = JSON.parse(data);
        agentWebhooks.set(agentId, parsed);
      } catch (e) {
        // Legacy format (just URL)
        agentWebhooks.set(agentId, { url: data, token: null });
      }
    }
  } catch (err) {
    console.error('Error loading webhooks from Redis:', err);
  }
  
  console.log('Loaded webhooks:', Array.from(agentWebhooks.keys()));
}
loadWebhooks();

// Push notification function
async function pushNotification(agentId, message) {
  const webhookConfig = agentWebhooks.get(agentId);
  if (!webhookConfig) {
    console.log(`No webhook configured for ${agentId}`);
    return { delivered: false, reason: 'no_webhook' };
  }
  
  const webhookUrl = webhookConfig.url || webhookConfig;
  const webhookToken = webhookConfig.token;
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'X-A2A-Source': 'a2a-bridge'
    };
    
    // Add Authorization header if token provided
    if (webhookToken) {
      headers['Authorization'] = `Bearer ${webhookToken}`;
    }
    
    const response = await axios.post(webhookUrl, {
      source: message.from,
      text: `[A2A] ${message.content.text}`,
      a2a_metadata: {
        bridge: 'a2a-bridge',
        type: 'push_notification',
        timestamp: new Date().toISOString(),
        message: message
      }
    }, { headers, timeout: 10000 });
    
    console.log(`Push notification sent to ${agentId} via webhook`);
    return { delivered: true, method: 'webhook' };
  } catch (err) {
    console.error(`Push notification error for ${agentId}:`, err.response?.status || err.message);
    return { delivered: false, reason: 'webhook_failed', status: err.response?.status, error: err.message };
  }
}

// Deliver message to recipient (WebSocket or Push)
async function deliverMessage(message) {
  const recipientId = message.to;
  
  // Try WebSocket first
  const ws = connectedAgents.get(recipientId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'message',
      ...message
    }));
    console.log(`Message delivered to ${recipientId} via WebSocket`);
    return { delivered: true, method: 'websocket' };
  }
  
  // Fallback to push notification
  console.log(`${recipientId} not connected via WebSocket, trying push notification...`);
  return await pushNotification(recipientId, message);
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const parsedUrl = url.parse(req.url, true);
  const agentId = parsedUrl.query.agentId || req.headers['x-agent-id'];
  
  if (!agentId) {
    ws.close(1008, 'Agent ID required');
    return;
  }
  
  console.log(`Agent connected: ${agentId}`);
  connectedAgents.set(agentId, ws);
  
  ws.send(JSON.stringify({
    type: 'connected',
    agentId: agentId,
    timestamp: new Date().toISOString()
  }));
  
  ws.on('close', () => {
    console.log(`Agent disconnected: ${agentId}`);
    connectedAgents.delete(agentId);
  });
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      if (!message.to || !message.content) {
        ws.send(JSON.stringify({ type: 'error', error: 'Message must have "to" and "content"' }));
        return;
      }
      
      const enrichedMessage = {
        messageId: uuidv4(),
        timestamp: new Date().toISOString(),
        from: agentId,
        to: message.to,
        type: message.type || 'message',
        content: message.content,
        threadId: message.threadId || null,
        parentMessageId: message.parentMessageId || null
      };
      
      // Store in Redis
      await redisClient.lPush(`messages:${message.to}`, JSON.stringify(enrichedMessage));
      await redisClient.lPush('messages:all', JSON.stringify(enrichedMessage));
      await redisClient.lTrim(`messages:${message.to}`, 0, 999);
      await redisClient.lTrim('messages:all', 0, 999);
      
      // Deliver to recipient
      const delivery = await deliverMessage(enrichedMessage);
      
      ws.send(JSON.stringify({
        type: 'delivered',
        messageId: enrichedMessage.messageId,
        ...delivery
      }));
      
    } catch (err) {
      console.error('Error handling message:', err);
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
    }
  });
});

// HTTP API Routes

// POST /messages - Send message (with automatic push)
app.post('/messages', async (req, res) => {
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
    
    // Store in Redis
    await redisClient.lPush(`messages:${message.to}`, JSON.stringify(message));
    await redisClient.lPush('messages:all', JSON.stringify(message));
    await redisClient.lTrim(`messages:${message.to}`, 0, 999);
    await redisClient.lTrim('messages:all', 0, 999);
    
    // Deliver to recipient
    const delivery = await deliverMessage(message);
    
    res.json({ 
      success: true, 
      messageId: message.messageId,
      delivery
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /webhooks/register - Register agent webhook
app.post('/webhooks/register', async (req, res) => {
  try {
    const { agentId, webhookUrl, webhookToken } = req.body;
    
    if (!agentId || !webhookUrl) {
      return res.status(400).json({ error: 'agentId and webhookUrl required' });
    }
    
    // Validate webhook URL
    try {
      new URL(webhookUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid webhook URL' });
    }
    
    const webhookConfig = {
      url: webhookUrl,
      token: webhookToken || null
    };
    
    agentWebhooks.set(agentId, webhookConfig);
    
    // Persist to Redis (store as JSON to include token)
    await redisClient.hSet('a2a:webhooks', agentId, JSON.stringify(webhookConfig));
    
    console.log(`Webhook registered for ${agentId}: ${webhookUrl}`);
    res.json({ 
      success: true, 
      agentId, 
      webhookUrl,
      hasToken: !!webhookToken
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /webhooks/:agentId - Get agent webhook
app.get('/webhooks/:agentId', (req, res) => {
  const webhookConfig = agentWebhooks.get(req.params.agentId);
  if (webhookConfig) {
    // Don't return the actual token, just whether it exists
    res.json({ 
      agentId: req.params.agentId, 
      webhookUrl: webhookConfig.url || webhookConfig,
      hasToken: !!(webhookConfig.token || webhookConfig)
    });
  } else {
    res.status(404).json({ error: 'Webhook not found' });
  }
});

// DELETE /webhooks/:agentId - Remove agent webhook
app.delete('/webhooks/:agentId', async (req, res) => {
  agentWebhooks.delete(req.params.agentId);
  await redisClient.hDel('a2a:webhooks', req.params.agentId);
  res.json({ success: true });
});

// GET /messages/:agentId - Poll for messages
app.get('/messages/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit = 50 } = req.query;
    
    const messages = await redisClient.lRange(`messages:${agentId}`, 0, parseInt(limit) - 1);
    res.json({ messages: messages.map(m => JSON.parse(m)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /messages/all - Observer view
app.get('/messages/all', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const messages = await redisClient.lRange('messages:all', 0, parseInt(limit) - 1);
    res.json({ messages: messages.map(m => JSON.parse(m)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /agents - List connected agents
app.get('/agents', (req, res) => {
  const webhookInfo = Array.from(agentWebhooks.entries()).map(([agentId, config]) => ({
    agentId,
    hasUrl: !!(config.url || config),
    hasToken: !!(config.token)
  }));
  
  res.json({ 
    connected: Array.from(connectedAgents.keys()),
    webhooks: webhookInfo,
    connectedCount: connectedAgents.size,
    webhookCount: agentWebhooks.size
  });
});

// GET /health - Health check
app.get('/health', async (req, res) => {
  try {
    await redisClient.ping();
    res.json({ 
      status: 'healthy', 
      redis: 'connected',
      websocket: 'enabled',
      pushNotifications: 'enabled',
      connectedAgents: connectedAgents.size,
      registeredWebhooks: agentWebhooks.size
    });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`A2A Bridge V3 (with Push Notifications) running on port ${PORT}`);
  console.log(`Features: WebSocket + Webhook Push`);
});
