import json
import os
import shutil
import socket
import subprocess
import sys
import webbrowser
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "config.json"


def load_port() -> int:
    with CONFIG_PATH.open("r", encoding="utf-8") as file:
        config = json.load(file)
    return int(config.get("port", 3000))


def get_lan_urls(port: int) -> list[str]:
    urls = [f"http://127.0.0.1:{port}"]
    hostname = socket.gethostname()

    try:
        addresses = socket.getaddrinfo(hostname, None, socket.AF_INET)
    except socket.gaierror:
        addresses = []

    seen = {"127.0.0.1"}
    for address in addresses:
        ip = address[4][0]
        if ip not in seen and not ip.startswith("127."):
            seen.add(ip)
            urls.append(f"http://{ip}:{port}")

    return urls


def run(command: list[str]) -> int:
    process = subprocess.Popen(command, cwd=ROOT)
    return process.wait()


def main() -> int:
    node = shutil.which("node")
    npm = shutil.which("npm.cmd") or shutil.which("npm")

    if not node:
        print("Node.js is not installed or not added to PATH.")
        print("Install Node.js 18+ from https://nodejs.org/")
        input("Press Enter to close...")
        return 1

    if not npm:
        print("npm is not installed or not added to PATH.")
        input("Press Enter to close...")
        return 1

    if not (ROOT / "node_modules").exists():
        print("Installing site dependencies...")
        code = run([npm, "install"])
        if code != 0:
            print("npm install failed.")
            input("Press Enter to close...")
            return code

    port = load_port()
    urls = get_lan_urls(port)

    print()
    print("Starting Proximity Voice site...")
    print("Open one of these URLs:")
    for url in urls:
        print(f" - {url}")
    print("Keep this window open while the server is running.")
    print()

    webbrowser.open(urls[0])

    try:
        return run([node, "server.js"])
    except KeyboardInterrupt:
        print()
        print("Site stopped.")
        return 0
    finally:
        input("Press Enter to close...")


if __name__ == "__main__":
    sys.exit(main())
