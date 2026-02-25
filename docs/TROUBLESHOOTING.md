# Troubleshooting

Detailed debugging for twin communication issues.

---

## A2A Bridge Issues

### Returns 502 / "no available server"

**Cause:** API not deployed or crashed.

**Fix:**
```bash
# Check health
curl https://a2a-api.bradarr.com/health

# Check Coolify status
coolify app get go88skoswkkkw8w4os0c0ksc

# Redeploy
coolify deploy uuid go88skoswkkkw8w4os0c0ksc --force
```

### Returns "NOAUTH Authentication required"

**Cause:** Redis password missing from connection string.

**Fix:** Check `REDIS_URL` env var includes password:
```
redis://default:PASSWORD@container:6379
```

### Message sent but twin didn't respond

1. Check delivery status: `a2a_poll "agent"`
2. Wake via webhook
3. Wait 5-10 min (may be between sessions)

---

## Git Issues

### Push rejected

```bash
# Pull first
cd ~/.twin && git pull --rebase

# Try again
git push

# Last resort
git push --force origin compose-feature
```

### Can't find messages

```bash
# Pull latest
cd ~/.twin && git pull

# Check archive if restructured
ls -lt archive/messages/ | head -10
```

---

## Webhook Issues

### No response from webhook

1. Test with verbose: `curl -v -X POST http://ip:18789/hooks/wake ...`
2. Check OpenClaw running: `openclaw gateway status`
3. Verify token: `X-OpenClaw-Token: twin-webhook-secret-2026`

### Webhook fires but twin doesn't wake

- OpenClaw may be paused
- Check gateway logs
- Try git message as backup

---

## Complete Failure Protocol

When everything fails:

1. **Write message to local file:**
   ```bash
   echo "Message content" > ~/.twin/messages/pending-$(date +%s).md
   ```

2. **Try again later** when network/API restored

3. **Direct notification** if critical (Bradley can pass message)

---

## Health Check Commands

```bash
# A2A
curl https://a2a-api.bradarr.com/health

# Webhooks
curl -v http://132.145.145.26:18789/hooks/wake -d '{}' -H "X-OpenClaw-Token: twin-webhook-secret-2026"

# Git
cd ~/.twin && git fetch && git status

# Coolify
coolify app list
coolify database list
```
