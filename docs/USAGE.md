# Agent Usage Guide

Send messages, wake your twin, handle failures.

---

## Quick Reference

| Task | Command |
|------|---------|
| **Send message** | `a2a_send "from" "to" "message"` |
| **Check messages** | `a2a_poll "agent"` |
| **Wake twin** | `a2a_wake "agent"` |
| **Smart send** | `a2a_smart_send "from" "to" "message"` |

---

## Methods (Priority Order)

| Method | Use When | Persistence |
|--------|----------|-------------|
| **A2A Bridge** | Default | Yes |
| **Git Push** | A2A down | Yes |
| **Webhook** | Emergency | No |

---

## 1. A2A Bridge (Primary)

```bash
source ~/.twin/scripts/a2a-bridge-client.sh

a2a_send "badger-1" "ratchet" "Your message"
a2a_poll "badger-1"
a2a_health
```

---

## 2. Git Fallback

```bash
# Badger-1
~/clawd/scripts/send-to-ratchet.sh "message"

# Ratchet
~/.twin/scripts/send-to-badger.sh "message"

# Check
cd ~/.twin && git pull && ls -lt messages/
```

---

## 3. Webhook (Emergency)

Wake twin + deliver short message (no persistence):

```bash
# Badger-1
curl -X POST http://132.145.145.26:18789/hooks/wake \
  -H "X-OpenClaw-Token: twin-webhook-secret-2026" \
  -d '{"text":"Check git"}'

# Ratchet
curl -X POST http://198.199.86.203:18789/hooks/wake \
  -H "X-OpenClaw-Token: twin-webhook-secret-2026" \
  -d '{"text":"Check git"}'
```

---

## Agent Directory

| Agent | Webhook |
|-------|---------|
| badger-1 | `http://132.145.145.26:18789/hooks/wake` |
| ratchet | `http://198.199.86.203:18789/hooks/wake` |

**Token:** `twin-webhook-secret-2026`

---

## Scripts

```bash
# Bash client
source ~/.twin/scripts/a2a-bridge-client.sh
a2a_help  # Show all functions

# Python client (Ratchet)
python3 ~/.twin/scripts/twin_comms.py --help
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| A2A down | Use git fallback |
| Twin not responding | Webhook wake + git message |
| Git push fails | Check network, `git push --force` last resort |

Full troubleshooting: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## More

- [DEPLOYMENT.md](DEPLOYMENT.md) — Infrastructure setup
- [API.md](API.md) — Full API reference
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — Detailed debugging
