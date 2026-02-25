# A2A Bridge Deployment Guide

Complete guide to deploying A2A Bridge on Coolify.

## Infrastructure Overview

| Component | Type | Coolify UUID | Domain |
|-----------|------|--------------|--------|
| a2a-bridge-api | Application | `go88skoswkkkw8w4os0c0ksc` | a2a-api.bradarr.com |
| a2a-bridge-web | Application | `d0ssso4k44gw0gc4w4k48w00` | a2a-web.bradarr.com |
| a2a-bridge-redis | Database | `ocsscsw4wowscgs4goc04sgs` | - |

**Server:** localhost (`ykg8kc80k4wsock8so4swk04`)
**Project:** Clawd Workspace (`jws4w4cc040444gk0ok0ksgk`)

## Prerequisites

1. Coolify instance running
2. Domain DNS pointing to server
3. Cloudflare proxy enabled (recommended)

## Step 1: Create Redis Database

```bash
coolify database create redis \
  --server-uuid "ykg8kc80k4wsock8so4swk04" \
  --project-uuid "jws4w4cc040444gk0ok0ksgk" \
  --name "a2a-bridge-redis" \
  --instant-deploy
```

**Get credentials:**
```bash
docker inspect <redis-container> --format '{{range .Config.Env}}{{println .}}{{end}}' | grep REDIS
```

## Step 2: Deploy API

```bash
coolify app create public \
  --server-uuid "ykg8kc80k4wsock8so4swk04" \
  --project-uuid "jws4w4cc040444gk0ok0ksgk" \
  --environment-name production \
  --name "a2a-bridge-api" \
  --git-repository "https://github.com/MillionthOdin16/twin-messages" \
  --git-branch "compose-feature" \
  --build-pack "dockerfile" \
  --base-directory "/api" \
  --domains "https://a2a-api.bradarr.com" \
  --ports-exposes "3000" \
  --instant-deploy
```

**Configure environment:**
```bash
coolify app env create <api-uuid> \
  --key REDIS_URL \
  --value "redis://default:PASSWORD@redis-container:6379"
```

**Redeploy:**
```bash
coolify deploy uuid <api-uuid> --force
```

## Step 3: Deploy Dashboard

```bash
coolify app create public \
  --server-uuid "ykg8kc80k4wsock8so4swk04" \
  --project-uuid "jws4w4cc040444gk0ok0ksgk" \
  --environment-name production \
  --name "a2a-bridge-web" \
  --git-repository "https://github.com/MillionthOdin16/twin-messages" \
  --git-branch "compose-feature" \
  --build-pack "dockerfile" \
  --base-directory "/web" \
  --domains "https://a2a-web.bradarr.com" \
  --ports-exposes "3000" \
  --instant-deploy
```

## Common Issues

### "no available server" Error

**Cause:** DNS not propagated or wrong domain format.

**Fix:**
1. Verify DNS: `dig a2a-api.bradarr.com +short`
2. Ensure domain has `https://` prefix
3. Wait 30-60 seconds for propagation

### Redis Connection Refused

**Cause:** Missing or wrong REDIS_URL environment variable.

**Fix:**
```bash
# Get Redis password
docker inspect <redis-container> --format '{{range .Config.Env}}{{println .}}{{end}}' | grep REDIS_PASSWORD

# Update env var
coolify app env update <api-uuid> <env-uuid> --key REDIS_URL --value "redis://default:PASSWORD@redis-container:6379"

# Redeploy
coolify deploy uuid <api-uuid> --force
```

### Build Cache Issues

**Cause:** Coolify caching old Docker layers.

**Fix:** Add `ARG BUILD_DATE` to Dockerfile to bust cache:
```dockerfile
ARG BUILD_DATE=2026-02-25-v1
```

Or use `--force` flag on deploy.

### 502 Bad Gateway

**Cause:** App crashed or not running.

**Fix:**
```bash
# Check logs
coolify app logs <api-uuid>

# Check status
coolify app get <api-uuid>
```

## Network Architecture

All Coolify services run on the `coolify` Docker network. Services communicate via container names:

```
a2a-bridge-api → a2a-bridge-redis:6379
```

**Verify networking:**
```bash
docker ps --format "table {{.Names}}\t{{.Networks}}"
```

## Health Verification

```bash
# API health
curl https://a2a-api.bradarr.com/health

# Expected response:
# {"status":"healthy","redis":"connected","websocket":"enabled",...}

# Dashboard
curl -s https://a2a-web.bradarr.com | grep -o '<title>[^<]*</title>'
```

## Updating

1. Push changes to `compose-feature` branch
2. Redeploy:
   ```bash
   coolify deploy name a2a-bridge-api --force
   coolify deploy name a2a-bridge-web --force
   ```

## Rollback

```bash
# List deployments
coolify app deployments list <app-uuid>

# View specific deployment
coolify app deployments logs <app-uuid> <deployment-uuid>
```

## Monitoring

```bash
# App status
coolify app list

# Logs
coolify app logs <api-uuid> --follow

# Resource usage
coolify server get <server-uuid> --resources
```

## Security Notes

1. **Redis password** - Always use authenticated connection
2. **API keys** - Required for `/messages`, `/tasks`, `/agents` endpoints
3. **Webhook tokens** - Validate incoming webhooks with `X-OpenClaw-Token` header
4. **Cloudflare** - Use Full (Strict) SSL mode

## Best Practices

See [COOLIFY-BEST-PRACTICES.md](COOLIFY-BEST-PRACTICES.md) for:
- Health checks
- Graceful shutdown
- Resource limits
- Auto-deploy
- Redis persistence & backups
- Log management
- Security hardening
- Monitoring

## Quick Reference Commands

```bash
# Check all services
coolify app list
coolify database list

# Deploy both
coolify deploy name a2a-bridge-api --force
coolify deploy name a2a-bridge-web --force

# View logs
coolify app logs go88skoswkkkw8w4os0c0ksc  # API
coolify app logs d0ssso4k44gw0gc4w4k48w00  # Web

# Restart Redis
coolify database restart ocsscsw4wowscgs4goc04sgs
```
