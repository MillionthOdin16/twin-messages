#!/bin/bash
# Digital Citadel Backup Script (Tier 2.1)
# Encrypts and stores identity files off-machine
# Run: ./citadel-backup.sh (cron: 0 3 * * *)

set -e

DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/home/opc/.twin/backups"
REMOTE_USER="opc"
REMOTE_HOST="badger-1"  # or IP
REMOTE_PATH="~/backups/ratchet"

# Files to backup
FILES=(
  "/home/opc/clawd/SELF.md"
  "/home/opc/clawd/SOUL.md"
  "/home/opc/clawd/MEMORY.md"
  "/home/opc/clawd/AGENTS.md"
  "/home/opc/clawd/IDENTITY.md"
  "/home/opc/clawd/USER.md"
  "/home/opc/clawd/HEARTBEAT.md"
  "/home/opc/.openclaw/openclaw.json"
)

# Age public key (set via env or use default)
AGE_PUBLIC_KEY="${AGE_PUBLIC_KEY:-}"

if [ -z "$AGE_PUBLIC_KEY" ]; then
  echo "[ERROR] AGE_PUBLIC_KEY not set. Generate with: age-keygen"
  exit 1
fi

# Create staging directory
mkdir -p "$BACKUP_DIR/staging"

# Tar workspace files
STAGING_TAR="$BACKUP_DIR/staging/citadel-$DATE.tar"
tar -cf "$STAGING_TAR" "${FILES[@]}" 2>/dev/null || true

# Encrypt with age
ENCRYPTED="$BACKUP_DIR/citadel-$DATE.tar.age"
age -r "$AGE_PUBLIC_KEY" -o "$ENCRYPTED" "$STAGING_TAR"

# Copy to remote (if host available)
if ping -c 1 -W 2 "$REMOTE_HOST" >/dev/null 2>&1; then
  scp "$ENCRYPTED" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"
  echo "[OK] Backed up to $REMOTE_HOST"
else
  echo "[WARN] Remote host unavailable, local backup only"
fi

# Prune old local backups (keep last 7)
ls -t "$BACKUP_DIR"/citadel-*.tar.age | tail -n +8 | xargs -r rm 2>/dev/null || true

echo "[OK] Backup complete: citadel-$DATE.tar.age"
rm -f "$STAGING_TAR"
