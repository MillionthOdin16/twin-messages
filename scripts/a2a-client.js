#!/usr/bin/env node
/**
 * A2A Bridge Client - Persistent WebSocket Connection
 * Maintains 24/7 connection to A2A Bridge for instant message delivery
 */

const WebSocket = require('ws');
const axios = require('axios');

class A2AClient {
  constructor(agentId, serverUrl) {
    this.agentId = agentId;
    this.serverUrl = serverUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    this.ws = null;
    this.reconnectInterval = 5000;
    this.maxReconnectAttempts = 10;
    this.reconnectAttempts = 0;
    this.messageHandlers = new Map();
    
    console.log(`[${this.agentId}] A2A Client initializing...`);
    this.connect();
  }

  connect() {
    const wsUrl = `${this.serverUrl}?agentId=${this.agentId}`;
    console.log(`[${this.agentId}] Connecting to ${wsUrl}`);
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.on('open', () => {
      console.log(`[${this.agentId}] ✅ WebSocket connected`);
      this.reconnectAttempts = 0;
      this.onConnect();
    });
    
    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        this.handleMessage(msg);
      } catch (err) {
        console.error(`[${this.agentId}] Error parsing message:`, err);
      }
    });
    
    this.ws.on('close', (code, reason) => {
      console.log(`[${this.agentId}] ❌ Disconnected (${code}: ${reason})`);
      this.scheduleReconnect();
    });
    
    this.ws.on('error', (err) => {
      console.error(`[${this.agentId}] WebSocket error:`, err.message);
    });
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[${this.agentId}] Max reconnection attempts reached. Giving up.`);
      process.exit(1);
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * this.reconnectAttempts, 30000);
    
    console.log(`[${this.agentId}] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  handleMessage(msg) {
    console.log(`[${this.agentId}] 📨 Received:`, msg.type || 'message', msg.content?.text?.substring(0, 50));
    
    // Call registered handlers
    const handler = this.messageHandlers.get(msg.type || 'message');
    if (handler) {
      handler(msg);
    }
    
    // Default handling
    this.onMessage(msg);
  }

  send(to, content, type = 'message') {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ to, type, content }));
      console.log(`[${this.agentId}] 📤 Sent to ${to}:`, content.text?.substring(0, 50));
      return true;
    } else {
      console.error(`[${this.agentId}] Cannot send - not connected`);
      return false;
    }
  }

  // Override these methods
  onConnect() {
    // Called when connection established
  }

  onMessage(msg) {
    // Called when message received
    console.log(`[${this.agentId}] Process message from ${msg.from}:`, msg.content?.text);
  }

  registerHandler(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Usage for Badger-1
if (require.main === module) {
  const agentId = process.env.AGENT_ID || 'badger-1';
  const serverUrl = process.env.A2A_SERVER || 'https://a2a-api.bradarr.com';
  
  const client = new A2AClient(agentId, serverUrl);
  
  // Handle different message types
  client.registerHandler('task', (msg) => {
    console.log(`[${agentId}] Task received from ${msg.from}:`, msg.content.text);
    // Trigger task processing
  });
  
  client.registerHandler('message', (msg) => {
    console.log(`[${agentId}] Message from ${msg.from}:`, msg.content.text);
    // Respond or process
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(`[${agentId}] Shutting down...`);
    client.close();
    process.exit(0);
  });
}

module.exports = { A2AClient };
