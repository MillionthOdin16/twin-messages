const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const url = require('url');

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

// Subscribe to all Redis channels for agent messages
redisSubscriber.subscribe('a2a:broadcast', (message) => {
  try {
    const data = JSON.parse(message);
    const { to, payload } = data;
    
    // If recipient is connected via WebSocket, send immediately
    const ws = connectedAgents.get(to);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'message',
        ...payload
      }));
    }
  } catch (err) {
    console.error('Error broadcasting:', err);
  }
});

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  // Parse agent ID from query or headers
  const parsedUrl = url.parse(req.url, true);
  const agentId = parsedUrl.query.agentId || req.headers['x-agent-id'];
  
  if (!agentId) {
    ws.close(1008, 'Agent ID required');
    return;
  }
  
  console.log(`Agent connected: ${agentId}`);
  connectedAgents.set(agentId, ws);
  
  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    agentId: agentId,
    timestamp: new Date().toISOString()
  }));
  
  // Subscribe to personal Redis channel for this agent
  const personalChannel = `a2a:agent:${agentId}`;
  redisSubscriber.subscribe(personalChannel, (message) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
  
  // Handle incoming messages from agent
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      // Validate required fields
      if (!message.to || !message.content) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Message must have "to" and "content" fields'
        }));
        return;
      }
      
      // Enrich message
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
      
      // Store in Redis for persistence
      await redisClient.lPush(`messages:${message.to}`, JSON.stringify(enrichedMessage));
      await redisClient.lPush('messages:all', JSON.stringify(enrichedMessage));
      await redisClient.lTrim(`messages:${message.to}`, 0, 999);
      await redisClient.lTrim('messages:all', 0, 999);
      
      // Try to deliver via WebSocket if recipient is online
      const recipientWs = connectedAgents.get(message.to);
      if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
        recipientWs.send(JSON.stringify({
          type: 'message',
          ...enrichedMessage
        }));
      } else {
        // Publish to Redis channel for offline delivery
        await redisClient.publish(`a2a:agent:${message.to}`, JSON.stringify({
          type: 'message',
          ...enrichedMessage
        }));
      }
      
      // Confirm delivery to sender
      ws.send(JSON.stringify({
        type: 'delivered',
        messageId: enrichedMessage.messageId,
        recipientOnline: !!(recipientWs && recipientWs.readyState === WebSocket.OPEN)
      }));
      
    } catch (err) {
      console.error('Error handling message:', err);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Invalid message format'
      }));
    }
  });
  
  // Handle disconnect
  ws.on('close', () => {
    console.log(`Agent disconnected: ${agentId}`);
    connectedAgents.delete(agentId);
    redisSubscriber.unsubscribe(`a2a:agent:${agentId}`);
  });
  
  ws.on('error', (err) => {
    console.error(`WebSocket error for ${agentId}:`, err);
  });
});

// HTTP API (backward compatible + offline support)

// POST /messages - Send via HTTP (fallback)
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
    
    // Try WebSocket delivery
    const recipientWs = connectedAgents.get(message.to);
    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
      recipientWs.send(JSON.stringify({
        type: 'message',
        ...message
      }));
    } else {
      // Publish to Redis for later delivery
      await redisClient.publish(`a2a:agent:${message.to}`, JSON.stringify({
        type: 'message',
        ...message
      }));
    }
    
    res.json({ 
      success: true, 
      messageId: message.messageId,
      delivered: !!(recipientWs && recipientWs.readyState === WebSocket.OPEN)
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /messages/:agentId - Poll for messages (fallback)
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
  res.json({ 
    agents: Array.from(connectedAgents.keys()),
    count: connectedAgents.size
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
      connectedAgents: connectedAgents.size
    });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`A2A Bridge V2 (WebSocket) running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws?agentId=<agent>`);
  console.log(`Redis URL: ${redisUrl}`);
});
