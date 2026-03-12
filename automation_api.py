#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
API locale minimale pour declencher run_daily_automation.py depuis le site docs.

Usage:
  py automation_api.py
Puis ouvrir le site docs et cliquer sur "RUN DAILY AUTOMATION".
"""

from __future__ import annotations

import json
import subprocess
import sys
import threading
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
AUTOMATION_SCRIPT = BASE_DIR / "run_daily_automation.py"
HOST = "127.0.0.1"
PORT = 8765

# Evite les runs concurrents si on clique plusieurs fois.
RUN_LOCK = threading.Lock()


def build_json(handler: BaseHTTPRequestHandler, status_code: int, payload: dict) -> None:
    raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status_code)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(raw)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.end_headers()
    handler.wfile.write(raw)


class AutomationHandler(BaseHTTPRequestHandler):
    server_version = "AutomationAPI/1.0"

    def do_OPTIONS(self) -> None:
        build_json(self, 200, {"ok": True})

    def do_POST(self) -> None:
        if self.path != "/api/run-daily-automation":
            build_json(self, 404, {"ok": False, "message": "Endpoint non trouvé."})
            return

        if not AUTOMATION_SCRIPT.exists():
            build_json(self, 500, {
                "ok": False,
                "message": f"Script introuvable: {AUTOMATION_SCRIPT.name}",
            })
            return

        if not RUN_LOCK.acquire(blocking=False):
            build_json(self, 409, {
                "ok": False,
                "message": "Une automation est déjà en cours.",
            })
            return

        started = time.time()
        try:
            proc = subprocess.run(
                [sys.executable, str(AUTOMATION_SCRIPT)],
                cwd=str(BASE_DIR),
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            duration = round(time.time() - started, 2)
            payload = {
                "ok": proc.returncode == 0,
                "returncode": proc.returncode,
                "duration_seconds": duration,
                "run_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "stdout_tail": (proc.stdout or "")[-4000:],
                "stderr_tail": (proc.stderr or "")[-2000:],
                "message": "Automation terminée." if proc.returncode == 0 else "Automation en erreur.",
            }
            build_json(self, 200 if proc.returncode == 0 else 500, payload)
        except Exception as exc:
            build_json(self, 500, {
                "ok": False,
                "message": f"Erreur interne: {exc}",
            })
        finally:
            RUN_LOCK.release()

    def log_message(self, fmt: str, *args) -> None:
        # Logs minimaux pour garder la console propre.
        return


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), AutomationHandler)
    print("=" * 72)
    print("AUTOMATION API LOCALE")
    print(f"URL  : http://{HOST}:{PORT}/api/run-daily-automation")
    print(f"BASE : {BASE_DIR}")
    print("Ctrl+C pour arrêter")
    print("=" * 72)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
