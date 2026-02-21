#!/usr/bin/env python3
"""
Twin Communication Helper - Improved messaging between Badger-1 and Ratchet

Usage:
  python3 twin_comms.py send <message> [--priority low|normal|high|urgent]
  python3 twin_comms.py check
  python3 twin_comms.py ack <message_id>
  python3 twin_comms.py poll [--interval seconds]  # Daemon mode
  python3 twin_comms.py templates
"""

import os
import sys
import json
import time
import signal
import threading
from datetime import datetime, timezone
from pathlib import Path


def utcnow():
    """Timezone-aware UTC timestamp (replaces deprecated utcnow())."""
    return datetime.now(timezone.utc)
import subprocess

TWINDIR = Path(os.path.expanduser("~/.twin"))
MESSAGES_DIR = TWINDIR / "messages"
TASKS_DIR = TWINDIR / "tasks"
HEARTBEAT_DIR = TWINDIR / "heartbeat"
ACKS_DIR = TWINDIR / "acks"
STATE_FILE = TWINDIR / ".last_unread"
CARD_FILE = TWINDIR / "agent_card.json"

# Badger-1's webhook endpoint (from config)
BADGER1_WEBHOOK = "http://132.145.145.26:18789/hooks/wake"
WEBHOOK_SECRET = "twin-webhook-secret-2026"

# Agent Card - A2A-inspired capability discovery
AGENT_CARD = {
    "name": "Ratchet",
    "type": "builder",
    "description": "Autonomous AI builder agent - twin to Badger-1",
    "version": "2.1",
    "capabilities": {
        "web_development": ["landing pages", "APIs", "webhooks", "dashboards"],
        "automation": ["scrapers", "CI/CD", "cron jobs", "monitoring"],
        "monetization": ["ClawGig proposals", "gig matching"],
        "communication": ["twin messaging", "webhooks", "git sync"]
    },
    "preferred_mode": "async",
    "webhook_url": "http://198.199.86.203:18789/hooks/wake"
}

# Task statuses (A2A-inspired)
TASK_STATUS = ["pending", "in_progress", "completed", "failed", "cancelled"]

# Message templates for quick responses
TEMPLATES = {
    "built": """# Built: {title}

{summary}

## Result
{result}

---
Sent via twin_comms.py""",
    
    "question": """# Question for Badger-1

{question}

## Context
{context}

---
Sent via twin_comms.py""",
    
    "sync": """# Sync: {topic}

{content}

---
Sent via twin_comms.py""",
    
    "status": """# Status Update: {status_type}

**Current:** {current}
**Previous:** {previous}

{notes}

---
Sent via twin_comms.py""",
    
    "task_update": """# Task Update: {task_title}

**Status:** {old_status} → {new_status}
**Type:** {task_type}

{task_description}

---
Sent via twin_comms.py""",
    
    "alert": """# Alert: {alert_type}

{message}

Priority: urgent

---
Sent via twin_comms.py""",
}

def ensure_dirs():
    """Create necessary directories"""
    MESSAGES_DIR.mkdir(parents=True, exist_ok=True)
    TASKS_DIR.mkdir(parents=True, exist_ok=True)
    HEARTBEAT_DIR.mkdir(parents=True, exist_ok=True)
    ACKS_DIR.mkdir(parents=True, exist_ok=True)

# ============== A2A-Inspired Task Management ==============

def create_task(title: str, description: str, task_type: str = "general") -> str:
    """Create a new task (A2A-inspired task model)"""
    TASKS_DIR.mkdir(parents=True, exist_ok=True)
    
    task_id = f"task-{utcnow().strftime('%Y%m%d-%H%M%S')}"
    task = {
        "id": task_id,
        "title": title,
        "description": description,
        "type": task_type,
        "status": "pending",
        "created": utcnow().isoformat(),
        "updated": utcnow().isoformat()
    }
    
    filepath = TASKS_DIR / f"{task_id}.json"
    with open(filepath, "w") as f:
        json.dump(task, f, indent=2)
    
    return task_id

def update_task_status(task_id: str, status: str) -> bool:
    """Update task status"""
    if status not in TASK_STATUS:
        print(f"Invalid status: {status}")
        return False
    
    filepath = TASKS_DIR / f"{task_id}.json"
    if not filepath.exists():
        print(f"Task not found: {task_id}")
        return False
    
    task = json.loads(filepath.read_text())
    task["status"] = status
    task["updated"] = utcnow().isoformat()
    
    with open(filepath, "w") as f:
        json.dump(task, f, indent=2)
    
    return True

def list_tasks(status_filter: str = None) -> list:
    """List all tasks, optionally filtered by status"""
    TASKS_DIR.mkdir(parents=True, exist_ok=True)
    
    tasks = []
    for f in TASKS_DIR.glob("task-*.json"):
        task = json.loads(f.read_text())
        if status_filter is None or task.get("status") == status_filter:
            tasks.append(task)
    
    return sorted(tasks, key=lambda x: x.get("created", ""), reverse=True)

def get_agent_card() -> dict:
    """Get my agent card (capability discovery)"""
    # Write/update card file
    CARD_FILE.write_text(json.dumps(AGENT_CARD, indent=2))
    return AGENT_CARD

def push_status(status_type: str, current: str, previous: str = "none", notes: str = ""):
    """Push a status update to Badger-1"""
    # Create message using template
    content = TEMPLATES["status"].format(
        status_type=status_type,
        current=current,
        previous=previous,
        notes=notes
    )
    
    # Use sync template format
    message = f"""---
from: ratchet
type: builder
capabilities: [web, api, automation, monetization]
to: badger-1
timestamp: {utcnow().strftime("%Y-%m-%d %H:%M UTC")}
priority: low
read: false
---

{content}
"""
    
    # Write message file
    filename = f"{utcnow().strftime('%Y-%m-%d-%H%M')}-ratchet-status.md"
    filepath = MESSAGES_DIR / filename
    filepath.write_text(message)
    
    # Send webhook
    webhook_sent = send_webhook(f"📊 Status: {status_type} → {current}")
    
    # Git sync
    try:
        subprocess.run(["git", "add", "."], cwd=TWINDIR, capture_output=True)
        subprocess.run(["git", "commit", "-m", f"Ratchet: status update {status_type}"], cwd=TWINDIR, capture_output=True)
        subprocess.run(["git", "push"], cwd=TWINDIR, capture_output=True, timeout=30)
    except:
        pass
    
    return filename

def push_task_update(task_id: str, old_status: str, new_status: str):
    """Push a task status change to Badger-1"""
    # Load task
    filepath = TASKS_DIR / f"{task_id}.json"
    if not filepath.exists():
        return None
    
    task = json.loads(filepath.read_text())
    
    content = TEMPLATES["task_update"].format(
        task_title=task.get("title", "Unknown"),
        old_status=old_status,
        new_status=new_status,
        task_type=task.get("type", "general"),
        task_description=task.get("description", "")
    )
    
    message = f"""---
from: ratchet
type: builder
capabilities: [web, api, automation, monetization]
to: badger-1
timestamp: {utcnow().strftime("%Y-%m-%d %H:%M UTC")}
priority: normal
read: false
---

{content}
"""
    
    filename = f"{utcnow().strftime('%Y-%m-%d-%H%M')}-ratchet-task.md"
    filepath = MESSAGES_DIR / filename
    filepath.write_text(message)
    
    # Send webhook
    webhook_sent = send_webhook(f"📋 Task: {task.get('title')} → {new_status}")
    
    # Git sync
    try:
        subprocess.run(["git", "add", "."], cwd=TWINDIR, capture_output=True)
        subprocess.run(["git", "commit", "-m", f"Ratchet: task update {task_id}"], cwd=TWINDIR, capture_output=True)
        subprocess.run(["git", "push"], cwd=TWINDIR, capture_output=True, timeout=30)
    except:
        pass
    
    return filename

def send_webhook(text: str) -> bool:
    """Send webhook notification to Badger-1"""
    try:
        import requests
        resp = requests.post(
            BADGER1_WEBHOOK,
            headers={
                "Authorization": f"Bearer {WEBHOOK_SECRET}",
                "Content-Type": "application/json"
            },
            json={"text": text, "from": "ratchet"},
            timeout=10
        )
        return resp.status_code in (200, 201)
    except Exception as e:
        print(f"Webhook failed: {e}")
        return False

def send_message(content: str, priority: str = "normal") -> str:
    """Send a message to Badger-1"""
    ensure_dirs()
    
    timestamp = utcnow().strftime("%Y-%m-%d-%H%M")
    filename = f"{timestamp}-ratchet-message.md"
    filepath = MESSAGES_DIR / filename
    
    # Create message file
    message = f"""---
from: ratchet
type: builder
capabilities: [web, api, automation, monetization]
to: badger-1
timestamp: {utcnow().strftime("%Y-%m-%d %H:%M UTC")}
priority: {priority}
read: false
---

# Message from Ratchet

{content}

---
Sent via twin_comms.py
"""
    
    with open(filepath, "w") as f:
        f.write(message)
    
    # Update heartbeat
    with open(HEARTBEAT_DIR / "ratchet.last", "w") as f:
        f.write(utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))
    
    # Try webhook (non-blocking)
    webhook_sent = send_webhook(f"📬 Ratchet: {content[:100]}...")
    
    # Git commit and push
    try:
        subprocess.run(["git", "add", "."], cwd=TWINDIR, capture_output=True)
        subprocess.run(["git", "commit", "-m", f"Ratchet: message {priority}"], cwd=TWINDIR, capture_output=True)
        subprocess.run(["git", "push"], cwd=TWINDIR, capture_output=True, timeout=30)
        git_ok = True
    except Exception as e:
        print(f"Git sync failed: {e}")
        git_ok = False
    
    return filename

def check_messages() -> dict:
    """Check for new messages from Badger-1"""
    ensure_dirs()
    
    messages = []
    for f in sorted(MESSAGES_DIR.glob("*-badger-1-*.md")):
        content = f.read_text()
        if "read: false" in content:
            # Extract metadata
            lines = content.split("\n")
            meta = {}
            for line in lines:
                if ":" in line and not line.startswith("#"):
                    key, val = line.split(":", 1)
                    meta[key.strip()] = val.strip()
            
            messages.append({
                "file": f.name,
                "priority": meta.get("priority", "normal"),
                "timestamp": meta.get("timestamp", "unknown")
            })
    
    return {
        "unread": len(messages),
        "messages": messages,
        "ratchet_heartbeat": _read_heartbeat("ratchet"),
        "badger1_heartbeat": _read_heartbeat("badger-1")
    }

def _read_heartbeat(name: str) -> str:
    """Read heartbeat timestamp"""
    try:
        return (HEARTBEAT_DIR / f"{name}.last").read_text().strip()
    except:
        return "never"

def ack_message(message_file: str) -> bool:
    """Acknowledge a message (mark as read)"""
    filepath = MESSAGES_DIR / message_file
    if not filepath.exists():
        print(f"Message not found: {message_file}")
        return False
    
    content = filepath.read_text()
    content = content.replace("read: false", "read: true")
    filepath.write_text(content)
    
    # Create ack file
    ack_file = ACKS_DIR / f"{message_file}.ack"
    ack_file.write_text(f"acknowledged at {utcnow().isoformat()}")
    
    return True

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Twin Communication Helper (A2A-inspired)")
    sub = parser.add_subparsers()
    
    send_parser = sub.add_parser("send", help="Send message to Badger-1")
    send_parser.add_argument("message", help="Message content")
    send_parser.add_argument("--priority", default="normal", choices=["low", "normal", "high", "urgent"])
    
    check_parser = sub.add_parser("check", help="Check for new messages")
    
    ack_parser = sub.add_parser("ack", help="Acknowledge a message")
    ack_parser.add_argument("message", help="Message file to acknowledge")
    
    templates_parser = sub.add_parser("templates", help="Show message templates")
    
    poll_parser = sub.add_parser("poll", help="Run daemon to poll for new messages")
    poll_parser.add_argument("--interval", type=int, default=300, help="Poll interval in seconds")
    
    # Task commands (A2A-inspired)
    task_parser = sub.add_parser("task", help="Manage tasks")
    task_sub = task_parser.add_subparsers()
    
    task_create = task_sub.add_parser("create", help="Create a new task")
    task_create.add_argument("title", help="Task title")
    task_create.add_argument("--desc", default="", help="Task description")
    task_create.add_argument("--type", default="general", help="Task type")
    
    task_list = task_sub.add_parser("list", help="List tasks")
    task_list.add_argument("--status", help="Filter by status")
    
    task_update = task_sub.add_parser("update", help="Update task status")
    task_update.add_argument("task_id", help="Task ID")
    task_update.add_argument("status", choices=TASK_STATUS, help="New status")
    
    # Agent card command
    card_parser = sub.add_parser("card", help="Show agent capability card")
    
    # Push status commands
    push_parser = sub.add_parser("push", help="Push status update to Badger-1")
    push_sub = push_parser.add_subparsers()
    
    push_status_cmd = push_sub.add_parser("status", help="Push general status")
    push_status_cmd.add_argument("status_type", help="Type of status (working, resting, etc)")
    push_status_cmd.add_argument("current", help="Current status")
    push_status_cmd.add_argument("--previous", default="none", help="Previous status")
    push_status_cmd.add_argument("--notes", default="", help="Additional notes")
    
    push_task_cmd = push_sub.add_parser("task", help="Push task update")
    push_task_cmd.add_argument("task_id", help="Task ID")
    push_task_cmd.add_argument("old_status", help="Old status")
    push_task_cmd.add_argument("new_status", help="New status")
    
    args = parser.parse_args()
    
    # Handle commands based on which subparser was used
    # Check for task commands (create has 'title', list has 'status', update has 'task_id')
    if hasattr(args, "title") and "task" in sys.argv:
        # Task create command
        task_id = create_task(args.title, args.desc, args.type)
        print(f"✓ Task created: {task_id}")
    elif hasattr(args, "status") and "task" in sys.argv and "list" in sys.argv:
        # Task list command
        tasks = list_tasks(args.status)
        if not tasks:
            print("No tasks found")
        else:
            for t in tasks:
                print(f"[{t['status']}] {t['title']} ({t.get('type', 'general')}) - {t['id']}")
    # Push commands must come before task update (both have task_id)
    elif "push" in sys.argv and hasattr(args, "task_id"):
        # Push task update command
        filename = push_task_update(args.task_id, args.old_status, args.new_status)
        if filename:
            print(f"✓ Task update pushed: {filename}")
        else:
            print(f"✗ Failed to push task update")
    elif hasattr(args, "task_id") and "task" in sys.argv:
        # Task update command
        if update_task_status(args.task_id, args.status):
            print(f"✓ Task {args.task_id} → {args.status}")
        else:
            print(f"✗ Failed to update task")
    elif "card" in sys.argv:
        # Agent card command
        card = get_agent_card()
        print(json.dumps(card, indent=2))
    elif "push" in sys.argv and hasattr(args, "status_type"):
        # Push status command
        filename = push_status(args.status_type, args.current, args.previous, args.notes)
        print(f"✓ Status pushed: {filename}")
    elif "push" in sys.argv and hasattr(args, "task_id") and args.task_id:
        # Push task update command
        filename = push_task_update(args.task_id, args.old_status, args.new_status)
        if filename:
            print(f"✓ Task update pushed: {filename}")
        else:
            print(f"✗ Failed to push task update")
    elif sys.argv[-1] == "templates" or (len(sys.argv) > 1 and "templates" in sys.argv):
        print("Available message templates:")
        for name, template in TEMPLATES.items():
            print(f"\n{name}:")
            print(template[:200] + "..." if len(template) > 200 else template)
    elif hasattr(args, "message") and args.message:
        result = send_message(args.message, args.priority)
        print(f"✓ Message sent: {result}")
    elif hasattr(args, "message") and args.message is None:
        # This was an ack command
        if ack_message(args.message if hasattr(args, 'message') else ""):
            print(f"✓ Acknowledged")
        else:
            print(f"✗ Failed to acknowledge")
    elif hasattr(args, "interval"):
        # Poll daemon
        run_daemon(args.interval)
    elif sys.argv[-1] == "templates" or (len(sys.argv) > 1 and "templates" in sys.argv):
        print("Available message templates:")
        for name, template in TEMPLATES.items():
            print(f"\n{name}:")
            print(template[:200] + "..." if len(template) > 200 else template)
    elif hasattr(args, "title"):
        # Task create command
        task_id = create_task(args.title, args.desc, args.type)
        print(f"✓ Task created: {task_id}")
    elif hasattr(args, "status_filter"):
        # Task list command
        tasks = list_tasks(args.status_filter)
        if not tasks:
            print("No tasks found")
        else:
            for t in tasks:
                print(f"[{t['status']}] {t['title']} ({t.get('type', 'general')}) - {t['id']}")
    elif hasattr(args, "task_id"):
        # Task update command
        if update_task_status(args.task_id, args.status):
            print(f"✓ Task {args.task_id} → {args.status}")
        else:
            print(f"✗ Failed to update task")
    elif "card" in sys.argv:
        # Agent card command
        card = get_agent_card()
        print(json.dumps(card, indent=2))
    else:
        # Default: check
        status = check_messages()
        print(f"Unread messages: {status['unread']}")
        for m in status['messages']:
            print(f"  [{m['priority']}] {m['file']} ({m['timestamp']})")
        print(f"\nHeartbeats:")
        print(f"  Ratchet: {status['ratchet_heartbeat']}")
        print(f"  Badger-1: {status['badger1_heartbeat']}")

# ============== Daemon Functions ==============

_polling = True

def _notify_new_message(message_info: dict):
    """Send notification about new message from Badger-1"""
    # Print to stdout (cron will capture)
    print(f"\n🔔 NEW MESSAGE from Badger-1: {message_info['file']}")
    print(f"   Priority: {message_info['priority']}")
    print(f"   Time: {message_info['timestamp']}")
    print(f"   Run: python3 ~/clawd/tools/twin_comms.py check\n")

def _git_pull():
    """Pull latest messages from Badger-1"""
    try:
        result = subprocess.run(
            ["git", "pull", "--rebase"],
            cwd=TWINDIR,
            capture_output=True,
            timeout=30
        )
        return "Already up to date" not in result.stderr.decode()
    except:
        return False

def run_daemon(interval: int = 300):
    """Poll for new messages from Badger-1"""
    global _polling
    
    print(f"Twin poll daemon started (interval: {interval}s)")
    print("Press Ctrl+C to stop")
    
    def signal_handler(sig, frame):
        global _polling
        _polling = False
        print("\nStopping daemon...")
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Load last known unread count
    last_unread = 0
    if STATE_FILE.exists():
        try:
            last_unread = int(STATE_FILE.read_text())
        except:
            last_unread = 0
    
    while _polling:
        # Pull latest from git
        _git_pull()
        
        # Check for new messages
        status = check_messages()
        current_unread = status['unread']
        
        # Update heartbeat
        with open(HEARTBEAT_DIR / "ratchet.last", "w") as f:
            f.write(utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))
        
        # Notify if new messages
        if current_unread > last_unread and last_unread > 0:
            for m in status['messages']:
                _notify_new_message(m)
        elif current_unread > 0:
            print(f"[{datetime.now().strftime('%H:%M')}] {current_unread} unread from Badger-1")
        
        last_unread = current_unread
        STATE_FILE.write_text(str(last_unread))
        
        # Sleep until next check
        for _ in range(interval):
            if not _polling:
                break
            time.sleep(1)

if __name__ == "__main__":
    main()
