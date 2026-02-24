# A2A Bridge - HTTPS Upgrade Plan

## Current State
- Cloudflare: Flexible SSL (HTTPS → HTTP to origin)
- Origin (Coolify): HTTP only
- Security: Traffic encrypted only to Cloudflare edge

## Target State
- Cloudflare: Full (Strict) SSL
- Origin (Coolify): HTTPS with valid certificate
- Security: End-to-end encryption

## Option 1: Let's Encrypt via Coolify (RECOMMENDED)

Coolify has built-in Let's Encrypt support. Steps:

### 1. Enable Let's Encrypt in Coolify

Access Coolify dashboard:
```
https://coolify.bradarr.com
```

Navigate to:
- Settings → SSL/TLS → Enable Let's Encrypt
- Or Server → Settings → Enable SSL

### 2. Update A2A API Domain to HTTPS

```bash
# Update domain to HTTPS
coolify app update lowgcw0kgg008cwkcwwkkk8o \
  --domains "https://a2a-api.bradarr.com"

# Force redeploy
coolify deploy uuid lowgcw0kgg008cwkcwwkkk8o --force
```

### 3. Update Web Interface Domain to HTTPS

```bash
coolify app update d0ssso4k44gw0gc4w4k48w00 \
  --domains "https://a2a-web.bradarr.com"

coolify deploy uuid d0ssso4k44gw0gc4w4k48w00 --force
```

### 4. Cloudflare: Change to Full (Strict)

```bash
# Via Cloudflare API
curl -sX PATCH "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/ssl" \
  -H "X-Auth-Email: Bhallier@gmail.com" \
  -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"value":"strict"}'
```

Or via Dashboard:
- SSL/TLS → Overview → Full (Strict)

## Option 2: Cloudflare Origin Certificate

If Let's Encrypt has issues, use Cloudflare's free origin certificate:

### 1. Generate Origin Certificate

Cloudflare Dashboard:
- SSL/TLS → Origin Server → Create Certificate
- Save: certificate.pem and private.key

### 2. Upload to Coolify

Mount certificates as volumes in Coolify app settings.

### 3. Configure Apps to Use HTTPS

Update apps to use the mounted certificates.

### 4. Update Cloudflare to Full (Strict)

Same as Option 1.

## Option 3: Manual Let's Encrypt

If Coolify's auto-SSL doesn't work:

```bash
# SSH to server
ssh opc@132.145.145.26

# Install certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d a2a-api.bradarr.com -d a2a-web.bradarr.com

# Certificates will be at:
# /etc/letsencrypt/live/a2a-api.bradarr.com/
```

Then mount certificates in Coolify app configuration.

## Verification Steps

After upgrade, verify:

```bash
# Check HTTPS is working
curl -s https://a2a-api.bradarr.com/health

# Verify certificate is valid
echo | openssl s_client -servername a2a-api.bradarr.com -connect a2a-api.bradarr.com:443 2>/dev/null | openssl x509 -noout -dates

# Check Cloudflare SSL mode
curl -sX GET "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/settings/ssl" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq '.result.value'
```

## Client Updates

Update client code to use HTTPS:

```javascript
// Old
const API_URL = 'http://a2a-api.bradarr.com';

// New
const API_URL = 'https://a2a-api.bradarr.com';
```

## Rollback Plan

If issues occur:
1. Revert Cloudflare to Flexible SSL
2. Redeploy apps with HTTP domains
3. Debug certificate issues

## Recommendation

**Start with Option 1** (Coolify native Let's Encrypt):

1. Easiest - built into Coolify
2. Auto-renewing
3. Free
4. Proper end-to-end encryption

If Coolify's auto-SSL fails, fall back to Option 2 (Cloudflare Origin Certificate).
