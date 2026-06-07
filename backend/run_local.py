#!/usr/bin/env python3
"""
Local development server.
Simulates API Gateway → Lambda so you can test without deploying.

Usage:
    cd backend/
    python run_local.py

Endpoints:
    GET  http://localhost:8000/articles
    GET  http://localhost:8000/articles/<slug>
    POST http://localhost:8000/sync
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

# Load .env before importing anything that reads environment variables
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    print("  ✓  Loaded .env")
except ImportError:
    print("  ⚠  python-dotenv not installed — set env vars manually or run:")
    print("       pip install python-dotenv")

# Make sure the backend root is on sys.path so imports work
sys.path.insert(0, os.path.dirname(__file__))

from handler import handler as lambda_handler  # noqa: E402


# ─── HTTP → Lambda event adapter ─────────────────────────────────────────────

class _Handler(BaseHTTPRequestHandler):

    def _dispatch(self, method: str) -> None:
        parsed = urlparse(self.path)
        qs_raw = parse_qs(parsed.query, keep_blank_values=True)
        qs = {k: v[0] for k, v in qs_raw.items()}  # flatten multi-value

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode() if content_length else None

        event = {
            "httpMethod": method,
            "path": parsed.path,
            "queryStringParameters": qs or None,
            "pathParameters": None,
            "headers": dict(self.headers),
            "body": body,
        }

        try:
            response = lambda_handler(event, None)
        except Exception as exc:
            import traceback
            traceback.print_exc()
            response = {
                "statusCode": 500,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"success": False, "error": str(exc)}),
            }

        self.send_response(response["statusCode"])
        for key, value in (response.get("headers") or {}).items():
            self.send_header(key, value)
        self.end_headers()

        body_out = (response.get("body") or "").encode()
        self.wfile.write(body_out)

    def do_GET(self):     self._dispatch("GET")
    def do_POST(self):    self._dispatch("POST")
    def do_DELETE(self):  self._dispatch("DELETE")
    def do_OPTIONS(self): self._dispatch("OPTIONS")

    def log_message(self, fmt, *args):
        status = args[1] if len(args) > 1 else "?"
        print(f"  {self.command:<8} {self.path:<40} {status}")


# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    server = HTTPServer(("0.0.0.0", port), _Handler)

    print(f"\n🚀  notohub local server → http://localhost:{port}")
    print(f"    GET  /articles")
    print(f"    GET  /articles/<slug>")
    print(f"    POST /sync          (triggers Notion → S3/DynamoDB sync)")
    print(f"\n    Press Ctrl+C to stop.\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.")
