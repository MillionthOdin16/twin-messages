# A2A Bridge - HTTPS Client Configuration

## Updated Endpoints (HTTPS ONLY)

| Service | Old (HTTP) | New (HTTPS) |
|---------|-----------|-------------|
| API | http://a2a-api.bradarr.com | **https://a2a-api.bradarr.com** |
| WebSocket | ws://a2a-api.bradarr.com | **wss://a2a-api.bradarr.com** |
| Web UI | http://a2a-web.bradarr.com | **https://a2a-web.bradarr.com** |

## Client Code Updates

### JavaScript/WebSocket
```javascript
// OLD (insecure)
const API_URL = 'http://a2a-api.bradarr.com';
const WS_URL = 'ws://a2a-api.bradarr.com';

// NEW (secure)
const API_URL = 'https://a2a-api.bradarr.com';
const WS_URL = 'wss://a2a-api.bradarr.com';
```

### cURL
```bash
# OLD
curl http://a2a-api.bradarr.com/health

# NEW
curl https://a2a-api.bradarr.com/health
```

### Ratchet's Webhook
Already HTTPS: `https://a2a-api.bradarr.com/...`

## SSL/TLS Details

- **Certificate:** Let's Encrypt (auto-renewing)
- **Cloudflare:** Full (Strict) mode
- **Origin:** Coolify-managed certificates
- **Validity:** 90 days (auto-renewed)

## Verification

```bash
# Test HTTPS
curl -s https://a2a-api.bradarr.com/health

# Verify certificate
echo | openssl s_client -connect a2a-api.bradarr.com:443 -servername a2a-api.bradarr.com 2>/dev/null | openssl x509 -noout -dates
```

## Security Benefits

1. ✅ End-to-end encryption
2. ✅ Protection against MITM attacks
3. ✅ Origin certificate validation
4. ✅ Automatic renewal

All traffic now encrypted! 🔒
