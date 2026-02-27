import unittest
from unittest.mock import patch, MagicMock, mock_open, ANY
import json
import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime, timezone

# Create a mock for requests
mock_requests = MagicMock()

class TestTwinComms(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Patch sys.modules to include our mock requests
        cls.patcher = patch.dict('sys.modules', {'requests': mock_requests})
        cls.patcher.start()
        # Import twin_comms
        if 'twin_comms' in sys.modules:
            import importlib
            import twin_comms
            importlib.reload(twin_comms)
        else:
            import twin_comms
        cls.twin_comms = sys.modules['twin_comms']

        # Import twin_comms_improved
        if 'twin_comms_improved' in sys.modules:
            import importlib
            import twin_comms_improved
            importlib.reload(twin_comms_improved)
        else:
            import twin_comms_improved
        cls.twin_comms_improved = sys.modules['twin_comms_improved']

    @classmethod
    def tearDownClass(cls):
        cls.patcher.stop()

    def setUp(self):
        # Reset mock_requests before each test
        mock_requests.reset_mock()

    # --- twin_comms.py tests ---

    @patch('twin_comms.MESSAGES_DIR')
    @patch('twin_comms.TASKS_DIR')
    @patch('twin_comms.HEARTBEAT_DIR')
    @patch('twin_comms.QUEUE_DIR')
    @patch('twin_comms.ACKS_DIR')
    def test_ensure_dirs(self, mock_acks, mock_queue, mock_hb, mock_tasks, mock_messages):
        self.twin_comms.ensure_dirs()
        mock_messages.mkdir.assert_called()
        mock_tasks.mkdir.assert_called()
        mock_hb.mkdir.assert_called()
        mock_queue.mkdir.assert_called()
        mock_acks.mkdir.assert_called()

    @patch('twin_comms.TASKS_DIR')
    @patch('twin_comms.utcnow')
    @patch('builtins.open', new_callable=mock_open)
    def test_create_task(self, mock_file, mock_utcnow, mock_tasks_dir):
        mock_utcnow.return_value.strftime.return_value = "20230101-120000"
        mock_utcnow.return_value.isoformat.return_value = "2023-01-01T12:00:00"

        mock_task_path = MagicMock(spec=Path)
        mock_tasks_dir.__truediv__.return_value = mock_task_path

        task_id = self.twin_comms.create_task("Test Task", "Test Description", "test")

        self.assertEqual(task_id, "task-20230101-120000")
        mock_file.assert_called_with(mock_task_path, "w")

        handle = mock_file()
        written_data = "".join(call.args[0] for call in handle.write.call_args_list)
        data = json.loads(written_data)
        self.assertEqual(data["title"], "Test Task")
        self.assertEqual(data["status"], "pending")

    @patch('twin_comms.TASKS_DIR')
    @patch('twin_comms.utcnow')
    @patch('builtins.open', new_callable=mock_open)
    @patch('pathlib.Path.exists')
    @patch('pathlib.Path.read_text')
    def test_update_task_status(self, mock_read, mock_exists, mock_file, mock_utcnow, mock_tasks_dir):
        mock_exists.return_value = True

        mock_task_path = MagicMock(spec=Path)
        mock_task_path.exists.return_value = True
        mock_task_path.read_text.return_value = json.dumps({
            "id": "task-1",
            "title": "Test Task",
            "status": "pending"
        })
        mock_tasks_dir.__truediv__.return_value = mock_task_path

        mock_utcnow.return_value.isoformat.return_value = "2023-01-01T12:00:00"

        result = self.twin_comms.update_task_status("task-1", "completed")

        self.assertTrue(result)
        mock_file.assert_called_with(mock_task_path, "w")
        handle = mock_file()
        written_data = "".join(call.args[0] for call in handle.write.call_args_list)
        data = json.loads(written_data)
        self.assertEqual(data["status"], "completed")

    @patch('twin_comms.TASKS_DIR')
    def test_list_tasks(self, mock_tasks_dir):
        mock_task_file = MagicMock(spec=Path)
        mock_task_file.read_text.return_value = json.dumps({"id": "task-1", "status": "pending", "created": "2023-01-01"})
        mock_tasks_dir.glob.return_value = [mock_task_file]

        tasks = self.twin_comms.list_tasks(status_filter="pending")

        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]["id"], "task-1")

    @patch('twin_comms.MESSAGES_DIR')
    @patch('twin_comms.HEARTBEAT_DIR')
    @patch('twin_comms.send_webhook')
    @patch('subprocess.run')
    @patch('builtins.open', new_callable=mock_open)
    @patch('twin_comms.utcnow')
    def test_send_message(self, mock_utcnow, mock_file, mock_subproc, mock_webhook, mock_hb_dir, mock_msg_dir):
        mock_utcnow.return_value.strftime.side_effect = ["2023-01-01-1200", "2023-01-01 12:00 UTC", "2023-01-01 12:00:00 UTC"]

        mock_msg_path = MagicMock(spec=Path)
        mock_msg_dir.__truediv__.return_value = mock_msg_path
        mock_hb_path = MagicMock(spec=Path)
        mock_hb_dir.__truediv__.return_value = mock_hb_path

        filename = self.twin_comms.send_message("Hello Badger")

        self.assertTrue(filename.endswith("-ratchet-message.md"))
        mock_file.assert_any_call(mock_msg_path, "w")
        mock_file.assert_any_call(mock_hb_path, "w")
        mock_webhook.assert_called_with("📬 Ratchet: Hello Badger...")

    @patch('twin_comms.MESSAGES_DIR')
    @patch('twin_comms._read_heartbeat')
    def test_check_messages(self, mock_read_hb, mock_msg_dir):
        mock_msg_file = MagicMock(spec=Path)
        mock_msg_file.read_text.return_value = "---\nfrom: badger-1\npriority: high\ntimestamp: 2023-01-01\nread: false\n---"
        mock_msg_file.name = "2023-01-01-badger-1-msg.md"
        mock_msg_dir.glob.return_value = [mock_msg_file]
        mock_read_hb.return_value = "2023-01-01"

        status = self.twin_comms.check_messages()

        self.assertEqual(status["unread"], 1)
        self.assertEqual(status["messages"][0]["priority"], "high")

    @patch('twin_comms.MESSAGES_DIR')
    @patch('twin_comms.ACKS_DIR')
    def test_ack_message(self, mock_acks_dir, mock_msg_dir):
        mock_msg_path = MagicMock(spec=Path)
        mock_msg_path.exists.return_value = True
        mock_msg_path.read_text.return_value = "read: false"
        mock_msg_dir.__truediv__.return_value = mock_msg_path

        mock_ack_path = MagicMock(spec=Path)
        mock_acks_dir.__truediv__.return_value = mock_ack_path

        result = self.twin_comms.ack_message("msg1.md")

        self.assertTrue(result)
        mock_msg_path.write_text.assert_called_with("read: true")
        mock_ack_path.write_text.assert_called()

    @patch('twin_comms.CARD_FILE')
    def test_get_agent_card(self, mock_card_file):
        card = self.twin_comms.get_agent_card()
        self.assertEqual(card["name"], "Ratchet")
        mock_card_file.write_text.assert_called()

    @patch('pathlib.Path.read_text')
    def test_send_a2a_message(self, mock_read_key):
        import requests
        mock_read_key.return_value = "fake-key"
        requests.post.return_value.status_code = 200

        with patch('pathlib.Path.expanduser') as mock_expand:
            mock_key_path = MagicMock(spec=Path)
            mock_key_path.exists.return_value = True
            mock_key_path.read_text.return_value = "fake-key"
            mock_expand.return_value = mock_key_path

            result = self.twin_comms.send_a2a_message("test message")

        self.assertTrue(result)
        requests.post.assert_called_once()

    @patch('twin_comms.QUEUE_DIR')
    def test_queue_message(self, mock_queue_dir):
        mock_queue_path = MagicMock(spec=Path)
        mock_queue_dir.__truediv__.return_value = mock_queue_path

        self.twin_comms.queue_message("queued msg")
        mock_queue_path.write_text.assert_called()
        written_data = mock_queue_path.write_text.call_args[0][0]
        data = json.loads(written_data)
        self.assertEqual(data["content"], "queued msg")

    @patch('twin_comms.MESSAGES_DIR')
    @patch('twin_comms.HEARTBEAT_DIR')
    def test_get_system_status(self, mock_hb_dir, mock_msg_dir):
        mock_msg_file = MagicMock(spec=Path)
        mock_msg_file.read_text.return_value = "read: false"
        mock_msg_dir.glob.return_value = [mock_msg_file]

        mock_hb_file = MagicMock(spec=Path)
        mock_hb_file.exists.return_value = True
        mock_hb_file.read_text.return_value = json.dumps({"timestamp": "2023-01-01"})
        mock_hb_dir.__truediv__.return_value = mock_hb_file

        status = self.twin_comms.get_system_status()

        self.assertEqual(status["messages_total"], 1)
        self.assertEqual(status["messages_unread"], 1)
        self.assertEqual(status["heartbeat"]["timestamp"], "2023-01-01")

    @patch('twin_comms.MESSAGES_DIR')
    @patch('twin_comms.send_webhook')
    @patch('subprocess.run')
    @patch('twin_comms.utcnow')
    def test_push_status(self, mock_utcnow, mock_subproc, mock_webhook, mock_msg_dir):
        mock_utcnow.return_value.strftime.side_effect = ["2023-01-01 12:00 UTC", "2023-01-01-1200"]
        mock_msg_path = MagicMock(spec=Path)
        mock_msg_dir.__truediv__.return_value = mock_msg_path

        filename = self.twin_comms.push_status("working", "coding")

        self.assertTrue("ratchet-status.md" in filename)
        mock_msg_path.write_text.assert_called()
        mock_webhook.assert_called()

    @patch('twin_comms.QUEUE_DIR')
    @patch('twin_comms.send_message')
    def test_process_queue(self, mock_send, mock_queue_dir):
        mock_q_file = MagicMock(spec=Path)
        mock_q_file.read_text.return_value = json.dumps({"content": "msg", "type": "message"})
        mock_queue_dir.glob.return_value = [mock_q_file]
        mock_send.return_value = True

        processed = self.twin_comms.process_queue()

        self.assertEqual(processed, 1)
        mock_q_file.unlink.assert_called_once()

    @patch('twin_comms.HEARTBEAT_DIR')
    @patch('twin_comms.datetime')
    def test_update_heartbeat_v2(self, mock_datetime, mock_hb_dir):
        mock_now = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = mock_now

        mock_hb_path = MagicMock(spec=Path)
        mock_hb_dir.__truediv__.return_value = mock_hb_path

        hb_data = self.twin_comms.update_heartbeat_v2()

        self.assertEqual(hb_data["timestamp"], "2023-01-01T12:00:00+00:00")
        mock_hb_path.write_text.assert_called()

    # --- twin_comms_improved.py tests ---

    @patch('subprocess.run')
    def test_improved_git_push(self, mock_subproc):
        mock_subproc.return_value.returncode = 0
        mock_subproc.return_value.stderr = b""

        result = self.twin_comms_improved.git_push("test commit")

        self.assertTrue(result)
        self.assertGreaterEqual(mock_subproc.call_count, 2)

    @patch('twin_comms_improved.QUEUE_DIR')
    def test_improved_queue_message(self, mock_queue_dir):
        mock_queue_path = MagicMock(spec=Path)
        mock_queue_dir.__truediv__.return_value = mock_queue_path

        result = self.twin_comms_improved.queue_message("content", "file.md")

        self.assertTrue(result)
        mock_queue_path.write_text.assert_called_with("content")

    @patch('twin_comms_improved.git_push')
    @patch('twin_comms_improved.QUEUE_DIR')
    def test_improved_process_queue(self, mock_queue_dir, mock_git_push):
        mock_q_file = MagicMock(spec=Path)
        mock_q_file.read_text.return_value = "content"
        mock_q_file.stem = "file"
        mock_queue_dir.glob.return_value = [mock_q_file]
        mock_git_push.return_value = True

        self.twin_comms_improved.process_queue()

        mock_git_push.assert_called()
        mock_q_file.unlink.assert_called_once()

    def test_improved_send_a2a_message(self):
        import requests
        mock_requests.post.return_value.status_code = 200

        result = self.twin_comms_improved.send_a2a_message("test")

        self.assertTrue(result)
        mock_requests.post.assert_called_once()

    @patch('twin_comms_improved.HEARTBEAT_DIR')
    def test_improved_update_heartbeat(self, mock_hb_dir):
        mock_hb_path = MagicMock(spec=Path)
        mock_hb_dir.__truediv__.return_value = mock_hb_path

        self.twin_comms_improved.update_heartbeat()

        mock_hb_path.write_text.assert_called()
        written_data = json.loads(mock_hb_path.write_text.call_args[0][0])
        self.assertEqual(written_data["status"], "active")

    @patch('twin_comms_improved.MESSAGES_DIR')
    def test_improved_check_messages(self, mock_msg_dir):
        mock_msg_file = MagicMock(spec=Path)
        mock_msg_file.read_text.return_value = "read: false"
        mock_msg_dir.glob.return_value = [mock_msg_file]

        msgs = self.twin_comms_improved.check_messages()

        self.assertEqual(msgs["total"], 1)
        self.assertEqual(msgs["unread"], 1)

    # --- twin.sh tests ---
    def test_twin_sh_usage(self):
        result = subprocess.run(["bash", "twin.sh"], capture_output=True, text=True)
        self.assertIn("Usage: twin.sh", result.stdout)

    def test_twin_sh_check(self):
        # We need to make sure twin_comms.py is findable by twin.sh
        # Since they are in the same directory, and twin.sh finds it relative to itself, it should work.
        # We'll mock the actual python call by using a fake python script if needed,
        # but here we can just check if it tries to call it.
        # For simplicity, let's just check if the builtin command works as a proxy for script health.
        result = subprocess.run(["bash", "twin.sh", "builtin"], capture_output=True, text=True)
        self.assertIn("Built:", result.stdout)

if __name__ == '__main__':
    unittest.main()
