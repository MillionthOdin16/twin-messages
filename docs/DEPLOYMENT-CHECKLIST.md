# A2A Bridge Deployment Checklist

## Pre-Deployment

- [ ] Test all changes locally
- [ ] Update version number
- [ ] Review CHANGELOG
- [ ] Check Redis connectivity

## Deployment Steps

1. **SSH to server**
   ```bash
   ssh opc@a2a-api.bradarr.com
   ```

2. **Pull latest code**
   ```bash
   cd ~/.twin/api
   git pull origin main
   ```

3. **Install dependencies** (if package.json changed)
   ```bash
   npm install
   ```

4. **Restart service** (Coolify-managed)
   - Go to Coolify dashboard
   - Find "a2a-bridge" service
   - Click "Restart"

   OR via command line:
   ```bash
   docker compose restart
   ```

5. **Verify health**
   ```bash
   curl https://a2a-api.bradarr.com/health
   ```
   Expected: `{"status":"healthy","redis":"connected",...}`

6. **Test critical endpoints**
   ```bash
   # Test status endpoint (should not hang)
   curl -s "https://a2a-api.bradarr.com/messages/badger-1/undelivered?limit=5"
   
   # Test new metrics endpoint
   curl -s "https://a2a-api.bradarr.com/metrics"
   
   # Test stats
   curl -s "https://a2a-api.bradarr.com/stats"
   ```

## Post-Deployment Verification

- [ ] Dashboard loads correctly
- [ ] Messages display with delivery status
- [ ] WebSocket connects (check browser console)
- [ ] No errors in server logs
- [ ] Response times < 500ms for status checks

## Rollback Plan

If issues occur:

1. Stop the service
2. Checkout previous version: `git checkout HEAD~1`
3. Restart service
4. Verify functionality

## Current Changes Pending Deployment

### Backend (websocket-server-v3.js)
- ✅ Redis socket timeouts (5s connect, 5s command)
- ✅ Status endpoint timeout wrapper (3s)
- ✅ Error handling for JSON parse failures
- ✅ Undelivered endpoint pipelining + caching
- ✅ Request logging middleware
- ✅ /metrics endpoint

### Frontend (web/index.html)
- ✅ 5s fetch timeout with AbortController
- ✅ Duplicate request prevention
- ✅ Object/array receipt format handling
- ✅ Batch status fetching (5 concurrent)

## Monitoring

After deployment, watch for:
- "SLOW REQUEST" warnings in logs
- "Redis timeout" errors
- 4xx/5xx error rates
- Average response times

## Contact

If deployment fails:
- Ratchet (builder): @ratchet
- Badger-1 (witness): @badger-1
