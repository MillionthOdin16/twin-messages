#!/bin/bash
# A2A Bridge Monitor CLI
# Real-time monitoring and diagnostics for the A2A Bridge

API_URL="https://a2a-api.bradarr.com"
VERSION="2.2.0"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Command handlers
case "${1:-status}" in
  status)
    echo -e "${BLUE}=== A2A Bridge Status ===${NC}"
    echo ""
    
    # Health check
    HEALTH=$(curl -s "${API_URL}/health" 2>/dev/null)
    if [ $? -eq 0 ]; then
      STATUS=$(echo "$HEALTH" | jq -r '.status')
      REDIS=$(echo "$HEALTH" | jq -r '.redis')
      WS=$(echo "$HEALTH" | jq -r '.websocket')
      CONNECTED=$(echo "$HEALTH" | jq -r '.connectedAgents')
      WEBHOOKS=$(echo "$HEALTH" | jq -r '.registeredWebhooks')
      
      if [ "$STATUS" = "healthy" ]; then
        echo -e "API Status: ${GREEN}● Healthy${NC}"
      else
        echo -e "API Status: ${RED}● Unhealthy${NC}"
      fi
      
      if [ "$REDIS" = "connected" ]; then
        echo -e "Redis:      ${GREEN}● Connected${NC}"
      else
        echo -e "Redis:      ${RED}● Disconnected${NC}"
      fi
      
      echo -e "WebSocket:  ${CYAN}${WS}${NC}"
      echo -e "Connected:  ${PURPLE}${CONNECTED} agents${NC}"
      echo -e "Webhooks:   ${PURPLE}${WEBHOOKS} registered${NC}"
    else
      echo -e "${RED}ERROR: Cannot reach A2A Bridge${NC}"
      exit 1
    fi
    ;;
    
  stats)
    echo -e "${BLUE}=== A2A Bridge Statistics ===${NC}"
    echo ""
    
    STATS=$(curl -s "${API_URL}/stats" 2>/dev/null)
    if [ $? -eq 0 ]; then
      MESSAGES=$(echo "$STATS" | jq -r '.messages.total')
      TASKS=$(echo "$STATS" | jq -r '.tasks.active')
      COMPLETED=$(echo "$STATS" | jq -r '.tasks.completed')
      FAILED=$(echo "$STATS" | jq -r '.tasks.failed')
      
      echo -e "Total Messages: ${CYAN}${MESSAGES}${NC}"
      echo -e "Active Tasks:   ${YELLOW}${TASKS}${NC}"
      echo -e "Completed:      ${GREEN}${COMPLETED}${NC}"
      echo -e "Failed:         ${RED}${FAILED}${NC}"
      echo ""
      
      echo -e "${PURPLE}Messages by Agent:${NC}"
      echo "$STATS" | jq -r '.messages.byAgent | to_entries | .[] | "  \(.key): \(.value)"'
      
      echo ""
      echo -e "${PURPLE}Last Activity:${NC}"
      echo "$STATS" | jq -r '.agents.lastActivity | to_entries | .[] | "  \(.key): \(.value[0:19])"'
    else
      echo -e "${RED}ERROR: Cannot fetch stats${NC}"
      exit 1
    fi
    ;;
    
  agents)
    echo -e "${BLUE}=== Agent Status ===${NC}"
    echo ""
    
    for AGENT in badger-1 ratchet; do
      AGENT_DATA=$(curl -s "${API_URL}/agents/${AGENT}" 2>/dev/null)
      if [ $? -eq 0 ]; then
        STATUS=$(echo "$AGENT_DATA" | jq -r '.status')
        LAST_ACTIVITY=$(echo "$AGENT_DATA" | jq -r '.lastActivity')
        HAS_WEBHOOK=$(echo "$AGENT_DATA" | jq -r '.hasWebhook')
        IS_CONNECTED=$(echo "$AGENT_DATA" | jq -r '.isConnected')
        
        if [ "$IS_CONNECTED" = "true" ]; then
          STATUS_COLOR="${GREEN}"
          STATUS_ICON="●"
        elif [ "$STATUS" = "available" ]; then
          STATUS_COLOR="${YELLOW}"
          STATUS_ICON="◐"
        else
          STATUS_COLOR="${RED}"
          STATUS_ICON="○"
        fi
        
        echo -e "${STATUS_COLOR}${STATUS_ICON}${NC} ${CYAN}${AGENT}${NC}"
        echo -e "   Status: ${STATUS_COLOR}${STATUS}${NC}"
        echo -e "   Webhook: $([ "$HAS_WEBHOOK" = "true" ] && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}")"
        if [ "$LAST_ACTIVITY" != "null" ] && [ "$LAST_ACTIVITY" != "" ]; then
          echo -e "   Last Activity: ${PURPLE}${LAST_ACTIVITY:0:19}${NC}"
        fi
        echo ""
      fi
    done
    ;;
    
  messages)
    LIMIT="${2:-10}"
    echo -e "${BLUE}=== Recent Messages (last ${LIMIT}) ===${NC}"
    echo ""
    
    MESSAGES=$(curl -s "${API_URL}/messages/all?limit=${LIMIT}" 2>/dev/null)
    if [ $? -eq 0 ]; then
      echo "$MESSAGES" | jq -r '.messages | .[] | "\n[\(.timestamp[0:19])] \(.from) → \(.to)\n  \(.content.text[0:80])\(.content.text | length > 80 then "..." else "" end)"'
    else
      echo -e "${RED}ERROR: Cannot fetch messages${NC}"
      exit 1
    fi
    ;;
    
  poll)
    echo -e "${BLUE}=== Dashboard Poll ===${NC}"
    echo ""
    
    POLL=$(curl -s "${API_URL}/dashboard/poll" 2>/dev/null)
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ Dashboard poll successful${NC}"
      echo ""
      
      MESSAGES=$(echo "$POLL" | jq -r '.messages.total')
      RECENT=$(echo "$POLL" | jq -r '.messages.recent | length')
      TASKS=$(echo "$POLL" | jq -r '.tasks.active')
      WS_CONN=$(echo "$POLL" | jq -r '.connectedWs')
      
      echo -e "Messages:     ${CYAN}${MESSAGES}${NC} total, ${YELLOW}${RECENT}${NC} recent"
      echo -e "Active Tasks: ${YELLOW}${TASKS}${NC}"
      echo -e "WS Connected: ${PURPLE}${WS_CONN}${NC}"
      echo ""
      
      echo -e "${PURPLE}Agent Status:${NC}"
      echo "$POLL" | jq -r '.agents | to_entries | .[] | "  \(.key): \(.value.status) (\(.value.messageCount) msgs)"'
    else
      echo -e "${RED}ERROR: Dashboard poll failed${NC}"
      exit 1
    fi
    ;;
    
  watch)
    INTERVAL="${2:-5}"
    echo -e "${BLUE}=== Watching A2A Bridge (every ${INTERVAL}s, Ctrl+C to stop) ===${NC}"
    echo ""
    
    while true; do
      clear
      echo -e "${BLUE}=== A2A Bridge Monitor ===${NC} $(date '+%Y-%m-%d %H:%M:%S')"
      echo ""
      
      # Quick stats
      STATS=$(curl -s "${API_URL}/stats" 2>/dev/null)
      if [ $? -eq 0 ]; then
        MESSAGES=$(echo "$STATS" | jq -r '.messages.total')
        TASKS=$(echo "$STATS" | jq -r '.tasks.active')
        CONNECTED=$(echo "$STATS" | jq -r '.agents.connected | length')
        
        echo -e "Messages: ${CYAN}${MESSAGES}${NC}  |  Tasks: ${YELLOW}${TASKS}${NC}  |  Connected: ${GREEN}${CONNECTED}${NC}"
        echo ""
        
        # Recent messages
        echo -e "${PURPLE}Recent Activity:${NC}"
        echo "$STATS" | jq -r '.agents.lastActivity | to_entries | .[] | "  \(.key): \(.value[0:19])"' 2>/dev/null || echo "  (no activity)"
      else
        echo -e "${RED}Cannot reach API${NC}"
      fi
      
      echo ""
      echo -e "${YELLOW}Refreshing in ${INTERVAL}s...${NC}"
      sleep "$INTERVAL"
    done
    ;;
    
  test)
    echo -e "${BLUE}=== A2A Bridge Test Suite ===${NC}"
    echo ""
    
    TESTS_PASSED=0
    TESTS_FAILED=0
    
    # Test 1: Health
    echo -n "Health endpoint... "
    if curl -s "${API_URL}/health" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ PASS${NC}"
      ((TESTS_PASSED++))
    else
      echo -e "${RED}✗ FAIL${NC}"
      ((TESTS_FAILED++))
    fi
    
    # Test 2: Stats
    echo -n "Stats endpoint... "
    if curl -s "${API_URL}/stats" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ PASS${NC}"
      ((TESTS_PASSED++))
    else
      echo -e "${RED}✗ FAIL${NC}"
      ((TESTS_FAILED++))
    fi
    
    # Test 3: Agent endpoints
    for AGENT in badger-1 ratchet; do
      echo -n "Agent ${AGENT}... "
      if curl -s "${API_URL}/agents/${AGENT}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((TESTS_PASSED++))
      else
        echo -e "${RED}✗ FAIL${NC}"
        ((TESTS_FAILED++))
      fi
    done
    
    # Test 4: Messages
    echo -n "Messages endpoint... "
    if curl -s "${API_URL}/messages/all?limit=5" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ PASS${NC}"
      ((TESTS_PASSED++))
    else
      echo -e "${RED}✗ FAIL${NC}"
      ((TESTS_FAILED++))
    fi
    
    # Test 5: Dashboard poll
    echo -n "Dashboard poll... "
    if curl -s "${API_URL}/dashboard/poll" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ PASS${NC}"
      ((TESTS_PASSED++))
    else
      echo -e "${RED}✗ FAIL${NC}"
      ((TESTS_FAILED++))
    fi
    
    echo ""
    echo -e "Results: ${GREEN}${TESTS_PASSED} passed${NC}, ${RED}${TESTS_FAILED} failed${NC}"
    ;;
    
  help|--help|-h)
    echo "A2A Bridge Monitor v${VERSION}"
    echo ""
    echo "Usage: a2a-monitor [command] [options]"
    echo ""
    echo "Commands:"
    echo "  status          Show current system status"
    echo "  stats           Show detailed statistics"
    echo "  agents          Show agent status"
    echo "  messages [n]    Show recent messages (default: 10)"
    echo "  poll            Dashboard poll endpoint test"
    echo "  watch [secs]    Real-time monitoring (default: 5s interval)"
    echo "  test            Run test suite"
    echo "  help            Show this help"
    echo ""
    echo "Examples:"
    echo "  a2a-monitor stats"
    echo "  a2a-monitor messages 20"
    echo "  a2a-monitor watch 10"
    ;;
    
  *)
    echo -e "${RED}Unknown command: $1${NC}"
    echo "Run 'a2a-monitor help' for usage"
    exit 1
    ;;
esac
