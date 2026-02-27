import time
import os
import shutil
import asyncio
import aiofiles
from pathlib import Path
from datetime import datetime, timezone
import twin_comms

# Setup
TEST_DIR = Path("./benchmark_tmp_async")
if TEST_DIR.exists():
    shutil.rmtree(TEST_DIR)
TEST_DIR.mkdir()

# Mocking constants in twin_comms for the test
twin_comms.HEARTBEAT_DIR = TEST_DIR / "heartbeat"
twin_comms.HEARTBEAT_DIR.mkdir()
twin_comms.STATE_FILE = TEST_DIR / ".last_unread"
twin_comms.MESSAGES_DIR = TEST_DIR / "messages"
twin_comms.MESSAGES_DIR.mkdir()

# Mock functions
def mock_git_pull():
    return True

def mock_check_messages():
    return {
        "unread": 0,
        "messages": [],
        "ratchet_heartbeat": "now",
        "badger1_heartbeat": "now"
    }

twin_comms._git_pull = mock_git_pull
twin_comms.check_messages = mock_check_messages

# Async Benchmark Loop
ITERATIONS = 1000

async def benchmark_async():
    print(f"Benchmarking {ITERATIONS} iterations of ASYNC daemon loop logic...")
    start_time = time.time()

    last_unread = 0
    loop = asyncio.get_running_loop()

    for _ in range(ITERATIONS):
        # Pull latest from git (mocked - run in executor)
        await loop.run_in_executor(None, twin_comms._git_pull)

        # Check for new messages (mocked - run in executor)
        status = await loop.run_in_executor(None, twin_comms.check_messages)
        current_unread = status['unread']

        # Update heartbeat - ASYNC I/O
        async with aiofiles.open(twin_comms.HEARTBEAT_DIR / "ratchet.last", mode='w') as f:
            await f.write(twin_comms.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))

        # Logic for notifications
        if current_unread > last_unread and last_unread > 0:
            pass
        elif current_unread > 0:
            pass

        last_unread = current_unread

        # Write state file - ASYNC I/O
        async with aiofiles.open(twin_comms.STATE_FILE, mode='w') as f:
            await f.write(str(last_unread))

    end_time = time.time()
    duration = end_time - start_time

    print(f"Total time: {duration:.4f} seconds")
    print(f"Avg time per iteration: {duration/ITERATIONS:.6f} seconds")

# Run
asyncio.run(benchmark_async())

# Cleanup
shutil.rmtree(TEST_DIR)
