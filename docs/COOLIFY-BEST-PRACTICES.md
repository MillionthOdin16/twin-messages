# Coolify Deployment Best Practices

Comprehensive guide for production-ready Coolify deployments.

---

## 1. Health Checks

### Dockerfile HEALTHCHECK

Add to your Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
```

**Benefits:**
- Coolify knows when container is unhealthy
- Automatic restart on failure
- Better visibility in dashboard

### Application Health Endpoint

Your app should have a `/health` endpoint:

```javascript
app.get('/health', async (req, res) => {
  try {
    // Check critical dependencies
    await redisClient.ping();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});
```

---

## 2. Graceful Shutdown

Handle SIGTERM/SIGINT for zero-downtime deploys:

```javascript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  // Close connections
  if (wss) wss.close();
  if (server) server.close();
  if (redisClient) await redisClient.quit();
  
  process.exit(0);
});
```

**Why:** Prevents dropped requests during deployments.

---

## 3. Resource Limits

### Set Memory Limits

In Coolify UI or via Docker:

```bash
# Check current memory usage
docker stats --no-stream

# Set memory limit (1GB)
docker update --memory=1g --memory-swap=1g <container-name>
```

### Node.js Memory Limit

Set in Dockerfile or env:

```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=512"
```

**Recommendation:**
- API: 512MB - 1GB
- Web (static): 256MB
- Redis: 512MB (with maxmemory-policy)

---

## 4. Auto-Deploy Configuration

### Enable Auto-Deploy

```bash
# Check current settings
coolify app get <uuid>

# Enable auto-deploy
coolify app update <uuid> --auto-deploy=true
```

### Webhook-Based Deploy

Add to GitHub/GitLab repo settings:

```
https://coolify.bradarr.com/webhooks/deploy/<project-uuid>/<environment>
```

**Benefits:**
- Deploy on every push
- No manual intervention
- Faster iteration

---

## 5. Redis Best Practices

### Persistence

Enable AOF for data durability:

```bash
coolify database update <redis-uuid> \
  --appendonly yes \
  --appendfsync everysec
```

### Memory Management

Set maxmemory policy:

```bash
coolify database update <redis-uuid> \
  --maxmemory 512mb \
  --maxmemory-policy allkeys-lru
```

### Backup Strategy

Create automated backups:

```bash
#!/bin/bash
# backup-redis.sh
BACKUP_DIR="/backups/redis"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
redis-cli BGSAVE
sleep 5
cp /var/lib/redis/dump.rdb "$BACKUP_DIR/dump_$TIMESTAMP.rdb"

# Keep only last 7 days
find $BACKUP_DIR -name "dump_*.rdb" -mtime +7 -delete
```

Add to crontab:
```
0 2 * * * /path/to/backup-redis.sh
```

---

## 6. Log Management

### Log Rotation

Configure Docker log rotation:

```bash
# /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "5"
  }
}
```

Restart Docker:
```bash
sudo systemctl restart docker
```

### Application Logging

Use structured logging (JSON):

```javascript
const log = {
  timestamp: new Date().toISOString(),
  level: 'info',
  message: 'Request processed',
  requestId: req.id,
  duration: Date.now() - startTime
};
console.log(JSON.stringify(log));
```

**Benefits:**
- Better searchability
- Works with log aggregation tools
- Consistent format

---

## 7. Security

### Environment Variables

Mark sensitive vars as "is_shown_once":

```bash
coolify app env create <uuid> \
  --key API_KEY \
  --value "secret123" \
  --is-shown-once
```

### Network Isolation

Use internal networking for services:

```bash
# Redis should not be publicly accessible
coolify database update <redis-uuid> --is-public=false
```

### SSL/TLS

Use Cloudflare in front of Coolify:

1. Set SSL mode to "Full (Strict)"
2. Enable "Always Use HTTPS"
3. Enable "Automatic HTTPS Rewrites"

---

## 8. Monitoring

### Application Metrics

Add Prometheus metrics endpoint:

```javascript
const promClient = require('prom-client');

const httpRequests = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
```

### Coolify Health Checks

View in Coolify dashboard:
- Container status
- Resource usage
- Recent deployments
- Log streams

---

## 9. Deployment Checklist

Before deploying to production:

- [ ] Health check endpoint implemented
- [ ] Graceful shutdown handling added
- [ ] Resource limits configured
- [ ] Auto-deploy enabled (or documented manual process)
- [ ] Redis persistence enabled
- [ ] Log rotation configured
- [ ] Environment variables set (sensitive ones marked)
- [ ] SSL/TLS configured
- [ ] Backup strategy in place
- [ ] Monitoring/alerting set up

---

## 10. Common Commands

```bash
# Check all services
coolify app list
coolify database list

# View logs
coolify app logs <uuid> --follow
coolify database logs <uuid> --follow

# Restart services
coolify app restart <uuid>
coolify database restart <uuid>

# Update environment variable
coolify app env update <app-uuid> <env-uuid> \
  --key KEY_NAME \
  --value "new_value"

# Force redeploy
coolify deploy uuid <uuid> --force

# Check resource usage
docker stats --no-stream

# View container details
docker inspect <container-name>
```

---

## 11. Troubleshooting

### High Memory Usage

```bash
# Check memory usage
docker stats --no-stream

# Find memory leaks in Node.js
# Add to app: node --inspect=0.0.0.0:9229 app.js
# Connect Chrome DevTools to debug
```

### Container Restarting

```bash
# Check restart count
docker ps -a --filter "status=restarting"

# View logs
coolify app logs <uuid> --tail=100
```

### Slow Deployments

```bash
# Clear build cache
coolify deploy uuid <uuid> --force

# Or add cache bust to Dockerfile
ARG BUILD_DATE=$(date +%s)
```

---

*Last updated: 2026-02-25*
