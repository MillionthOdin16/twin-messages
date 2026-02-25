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

// ==================== AUTHENTICATION ====================

// API keys store: Map<agentId, apiKey>
const apiKeys = new Map();

// Agent cards store: Map<agentId, AgentCard>
const agentCards = new Map();

// Default Agent Card template
function createDefaultAgentCard(agentId) {
  return {
    agentId,
    name: agentId,
    description: `Agent ${agentId}`,
    url: null,
    version: '1.0.0',
    capabilities: {
      streaming: true,
      pushNotifications: true,
      tasks: true,
      messages: true,
      agentCards: true
    },
    authentication: {
      schemes: ['Bearer', 'X-API-Key']
    },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: [],
    status: 'offline',
    lastActivity: null
  };
}

// Initialize default agent cards
function initializeAgentCards() {
  ['badger-1', 'ratchet', 'test'].forEach(agentId => {
    if (!agentCards.has(agentId)) {
      agentCards.set(agentId, createDefaultAgentCard(agentId));
    }
  });
}

// Authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];
  
  // Check Bearer token (webhook token)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Find agent with matching token
    for (const [agentId, config] of agentWebhooks.entries()) {
      if (config && config.token === token) {
        req.authenticatedAgent = agentId;
        return next();
      }
    }
  }
  
  // Check X-API-Key header
  if (apiKeyHeader) {
    for (const [agentId, key] of apiKeys.entries()) {
      if (key === apiKeyHeader) {
        req.authenticatedAgent = agentId;
        return next();
      }
    }
  }
  
  // Check query parameter (less secure, but convenient for testing)
  if (req.query.apiKey) {
    for (const [agentId, key] of apiKeys.entries()) {
      if (key === req.query.apiKey) {
        req.authenticatedAgent = agentId;
        return next();
      }
    }
  }
  
  // Optional auth - allow if no keys registered, otherwise require auth
  if (apiKeys.size === 0 && agentWebhooks.size === 0) {
    return next();
  }
  
  res.status(401).json({ 
    error: 'Unauthorized', 
    message: 'Valid API key or Bearer token required',
    hint: 'Use X-API-Key header or Bearer token'
  });
}

// Generate new API key for agent
function generateApiKey(agentId) {
  const key = `a2a_${agentId}_${uuidv4().replace(/-/g, '')}`;
  apiKeys.set(agentId, key);
  return key;
}

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
  
  // Load API keys from Redis
  try {
    const keys = await redisClient.hGetAll('a2a:apikeys');
    for (const [agentId, key] of Object.entries(keys)) {
      apiKeys.set(agentId, key);
    }
  } catch (err) {
    console.error('Error loading API keys from Redis:', err);
  }
  
  // Load Agent Cards from Redis
  try {
    const cards = await redisClient.hGetAll('a2a:agentcards');
    for (const [agentId, cardJson] of Object.entries(cards)) {
      try {
        agentCards.set(agentId, JSON.parse(cardJson));
      } catch (e) {
        console.error('Error parsing agent card:', e);
      }
    }
  } catch (err) {
    console.error('Error loading agent cards from Redis:', err);
  }
  
  initializeAgentCards();
  console.log('Loaded webhooks:', Array.from(agentWebhooks.keys()));
  console.log('Loaded API keys:', Array.from(apiKeys.keys()));
  console.log('Loaded agent cards:', Array.from(agentCards.keys()));
}

// Initialize server after Redis connects
async function init() {
  await loadWebhooks();
  
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`A2A Bridge V3 (Auth + Tasks + AgentCards) running on port ${PORT}`);
    console.log(`Features: WebSocket + Webhook Push + Authentication + Tasks`);
  });
}

init().catch(console.error);

// ==================== TASK MANAGEMENT ====================
// A2A Protocol v1.0 Compliant Implementation

// Task types (A2A-compatible)
const TASK_TYPES = {
  RESEARCH: 'research',
  SYNTHESIS: 'synthesis', 
  ACTION: 'action',
  MESSAGE: 'message',
  WITNESS: 'witness'
};

// Task priority
const TASK_PRIORITY = {
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low'
};

// A2A Task States (matching spec exactly)
const TASK_STATES = {
  UNSPECIFIED: 'unspecified',
  SUBMITTED: 'submitted',       // Task acknowledged
  WORKING: 'working',          // Actively processing
  INPUT_REQUIRED: 'input-required',  // Needs user input
  COMPLETED: 'completed',      // Terminal: success
  FAILED: 'failed',           // Terminal: error
  CANCELED: 'canceled',        // Terminal: cancelled
  REJECTED: 'rejected',        // Terminal: rejected
  AUTH_REQUIRED: 'auth-required'  // Needs authentication
};

// Create a new task (A2A-compliant structure)
async function createTask(task) {
  const id = task.id || uuidv4();  // A2A field: 'id'
  const contextId = task.contextId || uuidv4();  // A2A field: 'contextId'
  const now = new Date().toISOString();
  
  // A2A-compliant task structure
  const taskData = {
    // Core A2A fields
    id,                              // Required: unique task ID
    contextId,                       // Required: grouping context
    
    // Status object (A2A structure)
    status: {
      state: TASK_STATES.SUBMITTED,  // Current state
      message: null,                 // Status message
      timestamp: now                 // ISO 8601
    },
    
    // Artifacts (A2A field - array of outputs)
    artifacts: [],
    
    // History (A2A field - array of Messages)
    history: [],
    
    // Metadata
    metadata: task.metadata || {},
    
    // Extended fields (our additions)
    agentId: task.agentId,           // Target agent (our routing)
    type: task.type || TASK_TYPES.ACTION,  // Task type
    priority: task.priority || TASK_PRIORITY.NORMAL,
    createdBy: task.createdBy || 'unknown',
    input: task.input || {},         // Input data
    callback: task.callback || null, // Webhook for completion
    deadline: task.deadline || null,
    resultFor: task.resultFor || null
  };
  
  // Store in Redis (index by both id and agentId)
  await redisClient.hSet(`tasks:${task.agentId}`, id, JSON.stringify(taskData));
  await redisClient.hSet('tasks:byId', id, JSON.stringify({ ...taskData, agentId: task.agentId }));
  await redisClient.zAdd('tasks:all', { score: Date.now(), value: id });
  
  console.log(`Task created: ${id} (${taskData.type}) context:${contextId} by ${task.createdBy}`);
  
  return taskData;
}

// Update task status (A2A-compliant)
async function updateTaskStatus(taskId, newState, options = {}) {
  const { message = null, artifact = null } = options;
  
  // Find which agent owns this task
  const agentIds = ['badger-1', 'ratchet', 'test'];
  
  for (const agentId of agentIds) {
    const taskJson = await redisClient.hGet(`tasks:${agentId}`, taskId);
    if (taskJson) {
      const task = JSON.parse(taskJson);
      const now = new Date().toISOString();
      
      // Update A2A status structure
      task.status = {
        state: newState,
        message: message,
        timestamp: now
      };
      
      // Add artifact if provided (A2A field)
      if (artifact) {
        task.artifacts.push({
          artifactId: uuidv4(),
          createdAt: now,
          parts: [artifact]
        });
      }
      
      // Add to history (A2A Message format)
      task.history.push({
        role: 'agent',
        parts: [{
          type: 'text',
          text: message || `Status changed to ${newState}`
        }]
      });
      
      // Save updated task
      await redisClient.hSet(`tasks:${agentId}`, taskId, JSON.stringify(task));
      await redisClient.hSet('tasks:byId', taskId, JSON.stringify({ ...task, agentId }));
      
      // Send callback notification if configured (for terminal states)
      const isTerminal = [TASK_STATES.COMPLETED, TASK_STATES.FAILED, TASK_STATES.CANCELED].includes(newState);
      if (task.callback && isTerminal) {
        sendTaskCallback(task, newState);
      }
      
      // If resultFor is set, notify that agent
      if (task.resultFor && isTerminal) {
        await notifyTaskResult(task, agentId);
      }
      
      console.log(`Task ${taskId} state: ${newState}`);
      return task;
    }
  }
  
  return null;
}

// Send callback webhook for task completion
async function sendTaskCallback(task, finalStatus) {
  if (!task.callback) return;
  
  try {
    const webhookConfig = agentWebhooks.get(task.resultFor || task.createdBy);
    const token = webhookConfig?.token;
    
    await axios.post(task.callback, {
      id: task.id,
      contextId: task.contextId,
      status: task.status,
      artifacts: task.artifacts,
      metadata: task.metadata,
      source: 'a2a-bridge'
    }, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-OpenClaw-Token': token } : {})
      },
      timeout: 10000
    });
    
    console.log(`Task callback sent for ${task.id} to ${task.callback}`);
  } catch (err) {
    console.error(`Task callback failed for ${task.id}:`, err.message);
  }
}

// Notify agent of task result (A2A Message format)
async function notifyTaskResult(task, fromAgentId) {
  const recipientId = task.resultFor;
  if (!recipientId || recipientId === fromAgentId) return;
  
  // A2A-compliant message format
  const message = {
    messageId: uuidv4(),
    role: 'agent',
    parts: [{
      type: 'text',
      text: `Task ${task.type}:${task.id.substring(0,8)} ${task.status.state}`
    }]
  };
  
  // Store for recipient
  await redisClient.lPush(`messages:${recipientId}`, JSON.stringify(message));
  await redisClient.lPush('messages:all', JSON.stringify(message));
  await redisClient.lTrim(`messages:${recipientId}`, 0, 999);
  
  await redisClient.lPush(`messages:${recipientId}`, JSON.stringify(message));
  await redisClient.lPush('messages:all', JSON.stringify(message));
  await redisClient.lTrim(`messages:${recipientId}`, 0, 999);
  await redisClient.lTrim('messages:all', 0, 999);
  
  // Try to deliver via WebSocket or webhook
  await deliverMessage(message);
}

// ==================== PUSH NOTIFICATIONS ====================

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
    
    if (webhookToken) {
      headers['X-OpenClaw-Token'] = webhookToken;
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
    return { notified: true, method: 'webhook', status: 'pending_confirmation' };
  } catch (err) {
    const errorMessage = err.response?.data?.message || err.response?.statusText || err.message || 'Unknown error';
    console.error(`Push notification error for ${agentId}:`, err.response?.status || errorMessage);
    return { delivered: false, reason: 'webhook_failed', status: err.response?.status, error: errorMessage };
  }
}

async function deliverMessage(message) {
  const recipientId = message.to;
  
  const ws = connectedAgents.get(recipientId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'message',
      ...message
    }));
    console.log(`Message delivered to ${recipientId} via WebSocket`);
    return { delivered: true, method: 'websocket', timestamp: new Date().toISOString() };
  }
  
  console.log(`${recipientId} not connected via WebSocket, trying push notification...`);
  const result = await pushNotification(recipientId, message);
  
  if (result.notified) {
    await redisClient.hSet(`notifications:${message.messageId}`, recipientId, JSON.stringify({
      notified: true,
      method: 'webhook',
      timestamp: new Date().toISOString()
    }));
    await redisClient.expire(`notifications:${message.messageId}`, 86400);
  }
  
  return result;
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const parsedUrl = url.parse(req.url, true);
  const agentId = parsedUrl.query.agentId || req.headers['x-agent-id'];
  const token = parsedUrl.query.token || req.headers['authorization']?.replace('Bearer ', '');
  const apiKey = parsedUrl.query.apiKey || req.headers['x-api-key'];
  
  if (!agentId) {
    ws.close(1008, 'Agent ID required');
    return;
  }
  
  // Verify token or API key
  let authenticated = false;
  
  // Check webhook token
  const webhookConfig = agentWebhooks.get(agentId);
  if (webhookConfig && webhookConfig.token) {
    if (token && token === webhookConfig.token) {
      authenticated = true;
    }
  }
  
  // Check API key
  if (!authenticated && apiKey) {
    if (apiKeys.get(agentId) === apiKey) {
      authenticated = true;
    }
  }
  
  // Allow if no auth configured
  if (!authenticated && apiKeys.size === 0 && (!webhookConfig || !webhookConfig.token)) {
    authenticated = true;
  }
  
  if (!authenticated) {
    console.log(`WebSocket auth failed for ${agentId}: invalid token/apiKey`);
    ws.close(1008, 'Invalid token or API key');
    return;
  }
  
  console.log(`Agent connected: ${agentId} (authenticated)`);
  connectedAgents.set(agentId, ws);
  
  // Update agent card status
  const card = agentCards.get(agentId);
  if (card) {
    card.status = 'online';
    card.lastActivity = new Date().toISOString();
    card.websocketUrl = `wss://a2a-api.bradarr.com?agentId=${agentId}`;
    agentCards.set(agentId, card);
  }
  
  ws.send(JSON.stringify({
    type: 'connected',
    agentId: agentId,
    timestamp: new Date().toISOString()
  }));
  
  ws.on('close', () => {
    console.log(`Agent disconnected: ${agentId}`);
    connectedAgents.delete(agentId);
    
    // Update agent card status
    const card = agentCards.get(agentId);
    if (card) {
      card.status = 'offline';
      card.lastActivity = new Date().toISOString();
      agentCards.set(agentId, card);
    }
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
      
      await redisClient.lPush(`messages:${message.to}`, JSON.stringify(enrichedMessage));
      await redisClient.lPush('messages:all', JSON.stringify(enrichedMessage));
      await redisClient.lTrim(`messages:${message.to}`, 0, 999);
      await redisClient.lTrim('messages:all', 0, 999);
      
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

// ==================== HTTP API ROUTES ====================

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
    
    await redisClient.lPush(`messages:${message.to}`, JSON.stringify(message));
    await redisClient.lPush('messages:all', JSON.stringify(message));
    await redisClient.lTrim(`messages:${message.to}`, 0, 999);
    await redisClient.lTrim('messages:all', 0, 999);
    
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

// ==================== API KEY MANAGEMENT ====================

// POST /auth/keys - Generate new API key for agent
app.post('/auth/keys', async (req, res) => {
  try {
    const { agentId } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ error: 'agentId required' });
    }
    
    // Check if key already exists
    const existingKey = apiKeys.get(agentId);
    if (existingKey) {
      return res.json({ 
        success: true, 
        agentId, 
        apiKey: existingKey,
        existing: true
      });
    }
    
    const newKey = generateApiKey(agentId);
    
    // Store in Redis
    await redisClient.hSet('a2a:apikeys', agentId, newKey);
    
    res.json({ 
      success: true, 
      agentId, 
      apiKey: newKey,
      hint: 'Use X-API-Key header or ?apiKey= query parameter'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/keys/:agentId - Get API key info (not the key itself)
app.get('/auth/keys/:agentId', (req, res) => {
  const key = apiKeys.get(req.params.agentId);
  if (key) {
    res.json({ 
      agentId: req.params.agentId, 
      hasApiKey: true,
      hint: 'X-API-Key header or ?apiKey= query parameter'
    });
  } else {
    res.json({ 
      agentId: req.params.agentId, 
      hasApiKey: false 
    });
  }
});

// DELETE /auth/keys/:agentId - Revoke API key
app.delete('/auth/keys/:agentId', async (req, res) => {
  apiKeys.delete(req.params.agentId);
  await redisClient.hDel('a2a:apikeys', req.params.agentId);
  res.json({ success: true, message: 'API key revoked' });
});

// ==================== TASK MANAGEMENT ENDPOINTS (A2A-Compliant) ====================

// POST /tasks - Create a new task (A2A: SendMessageRequest -> returns Task)
app.post('/tasks', authenticate, async (req, res) => {
  try {
    const { 
      agentId, 
      input, 
      metadata, 
      createdBy,
      type,           // research|synthesis|action|message|witness
      priority,       // high|normal|low
      callback,       // webhook URL for completion notification
      deadline,       // ISO timestamp
      resultFor,      // agentId to send result to
      // A2A-style fields
      id,
      contextId
    } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ error: 'agentId required' });
    }
    
    // Validate task type
    const validTypes = Object.values(TASK_TYPES);
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid task type',
        validTypes
      });
    }
    
    // Validate priority
    const validPriorities = Object.values(TASK_PRIORITY);
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ 
        error: 'Invalid priority',
        validPriorities
      });
    }
    
    const task = await createTask({
      agentId,
      input,
      metadata,
      createdBy: createdBy || req.authenticatedAgent,
      type,
      priority,
      callback,
      deadline,
      dependencies,
      resultFor
    });
    
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tasks/:agentId - List tasks for agent
app.get('/tasks/:agentId', authenticate, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status, limit = 50 } = req.query;
    
    const tasksJson = await redisClient.hGetAll(`tasks:${agentId}`);
    let tasks = Object.values(tasksJson).map(t => JSON.parse(t));
    
    // Filter by status if specified
    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }
    
    // Sort by createdAt descending
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Limit
    tasks = tasks.slice(0, parseInt(limit));
    
    res.json({ tasks, count: tasks.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tasks/:agentId/:taskId - Get specific task
app.get('/tasks/:agentId/:taskId', authenticate, async (req, res) => {
  try {
    const { agentId, taskId } = req.params;
    
    const taskJson = await redisClient.hGet(`tasks:${agentId}`, taskId);
    if (!taskJson) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ task: JSON.parse(taskJson) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /tasks/:agentId/:taskId/status - Update task status
app.put('/tasks/:agentId/:taskId/status', authenticate, async (req, res) => {
  try {
    const { agentId, taskId } = req.params;
    // Support both flat "status" and A2A "status.state"
    const { status, state, message, artifact } = req.body;
    
    // Accept either status or state (A2A uses status.state)
    const newState = state || status;
    
    if (!newState) {
      return res.status(400).json({ error: 'status or state required' });
    }
    
    if (!Object.values(TASK_STATES).includes(newState)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        validStatuses: Object.values(TASK_STATES)
      });
    }
    
    // Pass artifact in options object (A2A uses artifacts array)
    const task = await updateTaskStatus(taskId, newState, { message, artifact });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Return A2A-compliant format
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /tasks/:agentId/:taskId/cancel - Cancel a task
app.post('/tasks/:agentId/:taskId/cancel', authenticate, async (req, res) => {
  try {
    const { agentId, taskId } = req.params;
    
    const task = await updateTaskStatus(taskId, TASK_STATES.CANCELED, { message: 'Task cancelled by user' });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tasks - List all tasks (A2A-style)
app.get('/tasks', authenticate, async (req, res) => {
  try {
    const { status, limit = 50, pageToken } = req.query;
    
    // Get all tasks from byId index
    const tasksJson = await redisClient.hGetAll('tasks:byId');
    let tasks = Object.values(tasksJson).map(t => JSON.parse(t));
    
    // Filter by status if specified
    if (status) {
      tasks = tasks.filter(t => t.status?.state === status);
    }
    
    // Sort by status.timestamp descending
    tasks.sort((a, b) => new Date(b.status?.timestamp || 0) - new Date(a.status?.timestamp || 0));
    
    // Pagination
    const start = pageToken ? parseInt(pageToken) : 0;
    const end = start + parseInt(limit);
    const paginatedTasks = tasks.slice(start, end);
    const nextPageToken = end < tasks.length ? end.toString() : '';
    
    res.json({ 
      tasks: paginatedTasks,
      nextPageToken,
      count: tasks.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tasks/:id - Get task by ID (A2A-style)
app.get('/tasks/by-id/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const taskJson = await redisClient.hGet('tasks:byId', id);
    if (!taskJson) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ task: JSON.parse(taskJson) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== AGENT CARDS ====================

// POST /agents/:agentId/card - Update agent card
app.post('/agents/:agentId/card', authenticate, async (req, res) => {
  try {
    const { agentId } = req.params;
    const updates = req.body;
    
    const existingCard = agentCards.get(agentId) || createDefaultAgentCard(agentId);
    
    // Merge updates
    const updatedCard = {
      ...existingCard,
      ...updates,
      agentId, // Ensure agentId can't be changed
      updatedAt: new Date().toISOString()
    };
    
    agentCards.set(agentId, updatedCard);
    
    // Persist to Redis
    await redisClient.hSet('a2a:agentcards', agentId, JSON.stringify(updatedCard));
    
    res.json({ success: true, agentCard: updatedCard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /agents/:agentId/card - Get agent card
app.get('/agents/:agentId/card', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    let card = agentCards.get(agentId);
    
    // If no card exists, create default
    if (!card) {
      card = createDefaultAgentCard(agentId);
      agentCards.set(agentId, card);
    }
    
    // Add live status
    const isConnected = connectedAgents.has(agentId);
    const webhookConfig = agentWebhooks.get(agentId);
    
    card.status = isConnected ? 'online' : (webhookConfig ? 'available' : 'offline');
    card.lastActivity = card.lastActivity || new Date().toISOString();
    
    res.json({ agentCard: card });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /agents/cards - List all agent cards
app.get('/agents/cards', async (req, res) => {
  try {
    const cards = [];
    
    for (const [agentId, card] of agentCards.entries()) {
      const isConnected = connectedAgents.has(agentId);
      const webhookConfig = agentWebhooks.get(agentId);
      
      cards.push({
        ...card,
        status: isConnected ? 'online' : (webhookConfig ? 'available' : 'offline')
      });
    }
    
    res.json({ agents: cards, count: cards.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== MESSAGE ENDPOINTS ====================

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

// POST /messages/:messageId/receipt - Delivery receipt
app.post('/messages/:messageId/receipt', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { agentId, status } = req.body;
    
    if (!agentId || !status) {
      return res.status(400).json({ error: 'agentId and status required' });
    }
    
    if (!['delivered', 'read', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use: delivered, read, failed' });
    }
    
    const receipt = {
      messageId,
      agentId,
      status,
      timestamp: new Date().toISOString()
    };
    
    await redisClient.hSet(`receipts:${messageId}`, agentId, JSON.stringify(receipt));
    await redisClient.expire(`receipts:${messageId}`, 86400);
    
    console.log(`Delivery receipt: ${messageId} ${status} by ${agentId}`);
    res.json({ success: true, receipt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /messages/:messageId/status - Check delivery status
app.get('/messages/:messageId/status', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const receipts = await redisClient.hGetAll(`receipts:${messageId}`);
    
    const parsedReceipts = {};
    for (const [agentId, receiptJson] of Object.entries(receipts)) {
      parsedReceipts[agentId] = JSON.parse(receiptJson);
    }
    
    const notifications = await redisClient.hGetAll(`notifications:${messageId}`);
    const parsedNotifications = {};
    for (const [agentId, notifJson] of Object.entries(notifications)) {
      parsedNotifications[agentId] = JSON.parse(notifJson);
    }
    
    res.json({
      messageId,
      receipts: parsedReceipts,
      deliveredTo: Object.keys(parsedReceipts).filter(id => 
        parsedReceipts[id].status === 'delivered' || parsedReceipts[id].status === 'read'
      ),
      notifications: parsedNotifications,
      notifiedTo: Object.keys(parsedNotifications).filter(id => parsedNotifications[id].notified)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /messages/:agentId/undelivered - Get only undelivered messages
app.get('/messages/:agentId/undelivered', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit = 50 } = req.query;
    
    const messages = await redisClient.lRange(`messages:${agentId}`, 0, parseInt(limit) - 1);
    const parsedMessages = messages.map(m => JSON.parse(m));
    
    const undelivered = [];
    for (const message of parsedMessages) {
      const receipt = await redisClient.hGet(`receipts:${message.messageId}`, agentId);
      if (!receipt) {
        undelivered.push(message);
      }
    }
    
    res.json({ 
      messages: undelivered,
      count: undelivered.length,
      total: parsedMessages.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /messages/:agentId/stats - Get message statistics for agent
app.get('/messages/:agentId/stats', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const messages = await redisClient.lRange(`messages:${agentId}`, 0, -1);
    const parsedMessages = messages.map(m => JSON.parse(m));
    
    let delivered = 0;
    let undelivered = 0;
    let read = 0;
    
    for (const message of parsedMessages) {
      const receipt = await redisClient.hGet(`receipts:${message.messageId}`, agentId);
      if (receipt) {
        const parsed = JSON.parse(receipt);
        if (parsed.status === 'read') read++;
        else if (parsed.status === 'delivered') delivered++;
      } else {
        undelivered++;
      }
    }
    
    const lastMessage = parsedMessages[0];
    
    res.json({
      agentId,
      total: parsedMessages.length,
      delivered,
      undelivered,
      read,
      lastActivity: lastMessage?.timestamp || null,
      lastMessageId: lastMessage?.messageId || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== AGENT STATUS ====================

// GET /agents/:agentId/status - Detailed agent status
app.get('/agents/:agentId/status', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const ws = connectedAgents.get(agentId);
    const isConnected = ws && ws.readyState === WebSocket.OPEN;
    
    const webhookConfig = agentWebhooks.get(agentId);
    const hasWebhook = !!webhookConfig;
    const hasApiKey = apiKeys.has(agentId);
    
    const messages = await redisClient.lRange(`messages:${agentId}`, 0, -1);
    const parsedMessages = messages.map(m => JSON.parse(m));
    
    let delivered = 0;
    let undelivered = 0;
    
    for (const message of parsedMessages) {
      const receipt = await redisClient.hGet(`receipts:${message.messageId}`, agentId);
      if (receipt) delivered++;
      else undelivered++;
    }
    
    res.json({
      agentId,
      status: isConnected ? 'online' : (hasWebhook ? 'available' : 'offline'),
      connected: isConnected,
      authentication: {
        webhook: hasWebhook,
        apiKey: hasApiKey
      },
      websocket: {
        connected: isConnected
      },
      webhook: {
        registered: hasWebhook,
        url: webhookConfig?.url || (typeof webhookConfig === 'string' ? webhookConfig : null)
      },
      messages: {
        total: parsedMessages.length,
        delivered,
        undelivered,
        pending: undelivered
      },
      lastSeen: isConnected ? new Date().toISOString() : null
    });
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
    webhookCount: agentWebhooks.size,
    apiKeyCount: apiKeys.size
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
      authentication: 'enabled',
      tasks: 'enabled',
      agentCards: 'enabled',
      connectedAgents: connectedAgents.size,
      registeredWebhooks: agentWebhooks.size,
      apiKeys: apiKeys.size
    });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});
