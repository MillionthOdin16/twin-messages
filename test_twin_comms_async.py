import unittest
import asyncio
import os
import signal
import sys
import time
from unittest.mock import patch, MagicMock

# Import the module to test
import twin_comms

class TestTwinCommsAsync(unittest.IsolatedAsyncioTestCase):

    async def test_run_daemon_graceful_shutdown(self):
        """Test that run_daemon stops gracefully when cancelled/signaled"""
        # Reduce interval for testing
        interval = 0.1

        # Mock dependencies to avoid actual IO/Git
        with patch('twin_comms._git_pull') as mock_pull,              patch('twin_comms.check_messages') as mock_check,              patch('builtins.open', new_callable=MagicMock),              patch('twin_comms.STATE_FILE'):

            mock_check.return_value = {'unread': 0, 'messages': []}
            mock_pull.return_value = True

            # Start the daemon in a task
            daemon_task = asyncio.create_task(twin_comms.run_daemon(interval))

            # Let it run for a bit
            await asyncio.sleep(0.2)

            # Verify it's running (mock called)
            self.assertTrue(mock_pull.called)
            self.assertTrue(mock_check.called)

            # Simulate cancellation (similar to signal handler)
            daemon_task.cancel()

            try:
                await daemon_task
            except asyncio.CancelledError:
                pass

            # If we get here without hanging, it's a success
            self.assertTrue(True)

    @patch('asyncio.to_thread')
    async def test_run_daemon_uses_to_thread(self, mock_to_thread):
        """Test that blocking calls use to_thread"""
        # Mock the coroutine returned by to_thread
        # We use a side_effect that returns a future or just the value,
        # but asyncio.to_thread is an async function (coroutine).
        # The mock needs to be awaitable.

        async def side_effect(func, *args, **kwargs):
            if func == twin_comms._git_pull:
                return True
            if func == twin_comms.check_messages:
                return {'unread': 0, 'messages': []}
            return None

        mock_to_thread.side_effect = side_effect

        with patch('builtins.open', new_callable=MagicMock),              patch('twin_comms.STATE_FILE'):

             # Start daemon
             task = asyncio.create_task(twin_comms.run_daemon(0.01))

             # Let it loop a few times
             await asyncio.sleep(0.05)
             task.cancel()
             try:
                 await task
             except asyncio.CancelledError:
                 pass

             # Verify to_thread was called for git_pull and check_messages
             self.assertTrue(mock_to_thread.called)
             # Check that it was called with the correct functions at least once
             calls = [c.args[0] for c in mock_to_thread.call_args_list]
             self.assertIn(twin_comms._git_pull, calls)
             self.assertIn(twin_comms.check_messages, calls)

if __name__ == '__main__':
    unittest.main()
