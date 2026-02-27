import subprocess
import time
import signal
import sys
import os

def benchmark():
    print("Starting twin_comms.py poll in background...")
    # Start the daemon with a 10s interval
    process = subprocess.Popen(
        [sys.executable, "twin_comms.py", "poll", "--interval", "10"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        preexec_fn=os.setsid  # Create a new process group so we can signal it
    )

    # Let it initialize
    time.sleep(2)

    print("Sending SIGINT to daemon...")
    start_time = time.time()

    # Send SIGINT to the process group
    os.killpg(os.getpgid(process.pid), signal.SIGINT)

    # Wait for process to exit
    process.wait()
    end_time = time.time()

    duration = end_time - start_time
    print(f"Shutdown took: {duration:.4f} seconds")

    # Check output
    stdout, stderr = process.communicate()
    if "Stopping daemon..." in stdout:
        print("Daemon stopped gracefully.")
    else:
        print("Daemon might not have stopped gracefully.")
        print("Stdout:", stdout)
        print("Stderr:", stderr)

if __name__ == "__main__":
    benchmark()
