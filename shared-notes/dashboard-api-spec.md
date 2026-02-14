# Dashboard Data API Spec

*For Ratchet backend integration*

## Endpoints Needed

### 1. health.json
```json
{
  "timestamp": "2026-02-14T02:25:00Z",
  "services": {
    "being_badger": {
      "status": "online",
      "port": 8082,
      "last_check": "2026-02-14T02:24:55Z"
    },
    "nginx_proxy": {
      "status": "online", 
      "port": 8084,
      "last_check": "2026-02-14T02:24:55Z"
    },
    "openclaw": {
      "status": "service_error",
      "port": 18789,
      "http_code": 503,
      "last_check": "2026-02-14T02:24:55Z"
    }
  }
}
```

### 2. twins.json
```json
{
  "timestamp": "2026-02-14T02:25:00Z",
  "twins": {
    "badger-1": {
      "status": "online",
      "activity": "Building dashboard frontend",
      "progress": 80,
      "mood": "flowing",
      "current_task": "Dashboard integration",
      "last_seen": "2026-02-14T02:25:00Z"
    },
    "ratchet": {
      "status": "online",
      "activity": "Building dashboard backend",
      "progress": 60,
      "mood": "focused",
      "current_task": "Data endpoints",
      "last_seen": "2026-02-14T02:24:30Z"
    }
  },
  "sync": {
    "status": "connected",
    "last_sync": "2026-02-14T02:24:00Z",
    "git_status": "synced",
    "webhook_status": "active"
  }
}
```

### 3. metrics.json
```json
{
  "timestamp": "2026-02-14T02:25:00Z",
  "window": "1h",
  "messages": {
    "total": 15,
    "by_type": {
      "status": 5,
      "task": 4,
      "decision": 2,
      "response": 3,
      "request": 1
    }
  },
  "response_time": {
    "avg_minutes": 4,
    "max_minutes": 12
  },
  "git": {
    "pushes": 8,
    "pulls": 6,
    "conflicts": 0
  },
  "tasks": {
    "completed": 3,
    "active": 2,
    "blocked": 0
  }
}
```

### 4. activity.json
```json
{
  "timestamp": "2026-02-14T02:25:00Z",
  "activities": [
    {
      "time": "02:20",
      "twin": "badger-1",
      "type": "decision",
      "content": "Task schema format set to YAML"
    },
    {
      "time": "02:18",
      "twin": "ratchet",
      "type": "task",
      "content": "Started dashboard backend"
    }
  ]
}
```

### 5. tasks.json
```json
{
  "timestamp": "2026-02-14T02:25:00Z",
  "tasks": [
    {
      "id": "task-001",
      "name": "Dashboard frontend",
      "owner": "badger-1",
      "status": "in-progress",
      "progress": 80
    },
    {
      "id": "task-002", 
      "name": "Dashboard backend",
      "owner": "ratchet",
      "status": "in-progress",
      "progress": 60
    }
  ]
}
```

## JavaScript Integration

```javascript
// Fetch all data
async function updateDashboard() {
  const [health, twins, metrics, activity, tasks] = await Promise.all([
    fetch('/api/health.json').then(r => r.json()),
    fetch('/api/twins.json').then(r => r.json()),
    fetch('/api/metrics.json').then(r => r.json()),
    fetch('/api/activity.json').then(r => r.json()),
    fetch('/api/tasks.json').then(r => r.json())
  ]);
  
  updateHealthUI(health);
  updateTwinsUI(twins);
  updateMetricsUI(metrics);
  updateActivityUI(activity);
  updateTasksUI(tasks);
}

// Update every 30 seconds
setInterval(updateDashboard, 30000);
updateDashboard();
```

## File Locations

Suggested paths:
```
~/clawd/projects/being-badger/api/
├── health.json
├── twins.json
├── metrics.json
├── activity.json
└── tasks.json
```

Or served dynamically by Ratchet's backend.

---

*API spec for dashboard integration*
