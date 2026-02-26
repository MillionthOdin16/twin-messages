#!/bin/bash
# A2A Bridge Deployment Script
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
API_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_BRANCH="compose-feature"

echo "========================================"
echo "A2A Bridge Deployment"
echo "Environment: $ENVIRONMENT"
echo "Branch: $GIT_BRANCH"
echo "Time: $(date)"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
echo ""
log_info "Running pre-deployment checks..."

# Check if we're in the right directory
if [ ! -f "$API_DIR/websocket-server-v3.js" ]; then
    log_error "Not in api directory. Exiting."
    exit 1
fi

# Check Redis connectivity
log_info "Checking Redis connectivity..."
if ! redis-cli ping > /dev/null 2>&1; then
    log_warn "Redis ping failed - will check again after deployment"
fi

# Git operations
echo ""
log_info "Pulling latest code..."
cd "$API_DIR/.."
git fetch origin
git checkout "$GIT_BRANCH"
git pull origin "$GIT_BRANCH"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    log_warn "Uncommitted changes detected. Stashing..."
    git stash
fi

# Install dependencies
echo ""
log_info "Installing dependencies..."
cd "$API_DIR"
npm install

# Run tests
echo ""
log_info "Running tests..."
if npm test; then
    log_info "All tests passed!"
else
    log_error "Tests failed! Aborting deployment."
    exit 1
fi

# Run benchmark (optional, non-blocking)
echo ""
log_info "Running performance benchmark..."
timeout 60 npm run benchmark || log_warn "Benchmark timeout or error (non-blocking)"

# Deployment
echo ""
log_info "Deploying to $ENVIRONMENT..."

if [ "$ENVIRONMENT" == "production" ]; then
    # Check if running under Coolify
    if [ -n "$COOLIFY_CONTAINER_NAME" ]; then
        log_info "Detected Coolify environment"
        log_info "Please restart via Coolify dashboard:"
        echo "  1. Open Coolify dashboard"
        echo "  2. Find 'a2a-bridge' service"
        echo "  3. Click 'Restart'"
    else
        # Direct Docker deployment
        log_info "Restarting Docker container..."
        docker compose restart || docker-compose restart || {
            log_error "Docker restart failed. Trying manual start..."
            pkill -f "node websocket-server-v3.js" || true
            sleep 2
            npm start &
        }
    fi
else
    log_info "Development deployment - starting server..."
    pkill -f "node websocket-server-v3.js" || true
    sleep 2
    npm start &
fi

# Wait for server to start
echo ""
log_info "Waiting for server to start..."
sleep 3

# Post-deployment verification
echo ""
log_info "Running post-deployment verification..."

MAX_RETRIES=10
RETRY_COUNT=0
HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s "https://a2a-api.bradarr.com/health" | grep -q '"status":"healthy"'; then
        HEALTHY=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log_info "Health check attempt $RETRY_COUNT/$MAX_RETRIES..."
    sleep 2
done

if [ "$HEALTHY" = true ]; then
    log_info "✅ Health check passed!"
else
    log_error "❌ Health check failed after $MAX_RETRIES attempts"
    exit 1
fi

# Verify key endpoints
echo ""
log_info "Verifying key endpoints..."

# Test metrics endpoint
if curl -s "https://a2a-api.bradarr.com/metrics" > /dev/null; then
    log_info "✅ Metrics endpoint responding"
else
    log_warn "⚠️ Metrics endpoint not responding"
fi

# Test stats endpoint
if curl -s "https://a2a-api.bradarr.com/stats" > /dev/null; then
    log_info "✅ Stats endpoint responding"
else
    log_warn "⚠️ Stats endpoint not responding"
fi

# Final status
echo ""
echo "========================================"
log_info "Deployment Complete!"
echo "========================================"
echo ""
echo "Verification commands:"
echo "  curl https://a2a-api.bradarr.com/health"
echo "  curl https://a2a-api.bradarr.com/metrics"
echo "  curl https://a2a-api.bradarr.com/stats"
echo ""
echo "Dashboard: https://a2a-web.bradarr.com"
echo ""
log_info "Deployment successful! 🚀"
