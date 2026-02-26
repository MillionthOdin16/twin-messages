#!/usr/bin/env node
/**
 * A2A Bridge Error Tracker
 * 
 * Monitors logs and sends alerts for critical errors
 * Run with: node error-tracker.js
 * Or add to cron: */5 * * * * cd ~/.twin/api && node error-tracker.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const CONFIG = {
  logFile: process.env.LOG_FILE || '/var/log/a2a-bridge/app.log',
  stateFile: path.join(__dirname, '.error-tracker-state.json'),
  alertWebhook: process.env.ALERT_WEBHOOK || null,
  checkInterval: 5 * 60 * 1000, // 5 minutes
  
  // Error patterns to watch for
  patterns: [
    { pattern: /Redis.*Error/i, severity: 'critical', category: 'redis' },
    { pattern: /timeout/i, severity: 'warning', category: 'performance' },
    { pattern: /SLOW REQUEST/i, severity: 'warning', category: 'performance' },
    { pattern: /Rate limit exceeded/i, severity: 'info', category: 'security' },
    { pattern: /Push notification.*failed/i, severity: 'warning', category: 'delivery' },
    { pattern: /Task callback.*failed/i, severity: 'warning', category: 'delivery' },
    { pattern: /WebSocket error/i, severity: 'warning', category: 'websocket' },
    { pattern: /Invalid.*JSON/i, severity: 'error', category: 'data' }
  ],
  
  // Alert thresholds
  thresholds: {
    critical: 1,    // Alert immediately
    error: 5,       // Alert after 5 occurrences
    warning: 10,    // Alert after 10 occurrences
    info: 50        // Alert after 50 occurrences
  }
};

// State management
function loadState() {
  try {
    if (fs.existsSync(CONFIG.stateFile)) {
      return JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading state:', e.message);
  }
  return { lastPosition: 0, errorCounts: {}, lastAlert: {} };
}

function saveState(state) {
  try {
    fs.writeFileSync(CONFIG.stateFile, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('Error saving state:', e.message);
  }
}

// Parse log file for errors
function parseLogFile() {
  const state = loadState();
  
  if (!fs.existsSync(CONFIG.logFile)) {
    console.log(`Log file not found: ${CONFIG.logFile}`);
    return { errors: [], state };
  }
  
  const stats = fs.statSync(CONFIG.logFile);
  
  // Handle log rotation
  if (stats.size < state.lastPosition) {
    console.log('Log file rotated, resetting position');
    state.lastPosition = 0;
  }
  
  const buffer = fs.readFileSync(CONFIG.logFile, { 
    encoding: 'utf8',
    start: state.lastPosition
  });
  
  state.lastPosition = stats.size;
  
  const lines = buffer.split('\n').filter(line => line.trim());
  const errors = [];
  
  for (const line of lines) {
    for (const { pattern, severity, category } of CONFIG.patterns) {
      if (pattern.test(line)) {
        errors.push({
          line,
          severity,
          category,
          timestamp: new Date().toISOString()
        });
        break;
      }
    }
  }
  
  return { errors, state };
}

// Send alert
async function sendAlert(errorSummary) {
  if (!CONFIG.alertWebhook) {
    console.log('No alert webhook configured, logging to console only');
    console.log('Alert:', JSON.stringify(errorSummary, null, 2));
    return;
  }
  
  try {
    await axios.post(CONFIG.alertWebhook, {
      source: 'a2a-bridge-error-tracker',
      timestamp: new Date().toISOString(),
      ...errorSummary
    }, { timeout: 10000 });
    
    console.log('Alert sent successfully');
  } catch (e) {
    console.error('Failed to send alert:', e.message);
  }
}

// Main tracking logic
async function trackErrors() {
  console.log(`Starting error tracker at ${new Date().toISOString()}`);
  
  const { errors, state } = parseLogFile();
  
  if (errors.length === 0) {
    console.log('No errors found');
    saveState(state);
    return;
  }
  
  console.log(`Found ${errors.length} error(s)`);
  
  // Group by category and severity
  const grouped = {};
  for (const error of errors) {
    const key = `${error.category}:${error.severity}`;
    if (!grouped[key]) {
      grouped[key] = { ...error, count: 0, samples: [] };
    }
    grouped[key].count++;
    if (grouped[key].samples.length < 3) {
      grouped[key].samples.push(error.line);
    }
  }
  
  // Check thresholds and send alerts
  const now = Date.now();
  const alertsToSend = [];
  
  for (const [key, data] of Object.entries(grouped)) {
    state.errorCounts[key] = (state.errorCounts[key] || 0) + data.count;
    const threshold = CONFIG.thresholds[data.severity] || 10;
    
    // Check if we should alert
    const lastAlertTime = state.lastAlert[key] || 0;
    const timeSinceLastAlert = now - lastAlertTime;
    const minAlertInterval = 30 * 60 * 1000; // 30 minutes between same alerts
    
    if (state.errorCounts[key] >= threshold && timeSinceLastAlert > minAlertInterval) {
      alertsToSend.push({
        category: data.category,
        severity: data.severity,
        count: state.errorCounts[key],
        threshold,
        samples: data.samples,
        message: `${data.severity.toUpperCase()}: ${data.count} ${data.category} error(s) detected`
      });
      
      state.lastAlert[key] = now;
      state.errorCounts[key] = 0; // Reset count after alert
    }
  }
  
  // Send alerts
  for (const alert of alertsToSend) {
    console.log('Sending alert:', alert.message);
    await sendAlert(alert);
  }
  
  saveState(state);
  console.log('Error tracking complete');
}

// Run if called directly
if (require.main === module) {
  trackErrors().catch(err => {
    console.error('Error tracker failed:', err);
    process.exit(1);
  });
}

module.exports = { trackErrors, parseLogFile };
