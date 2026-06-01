"""
AWS Lambda entry point for the notohub backend.

Configure Lambda with handler: handler.handler

Routes:
  GET  /articles          → list article metadata
  GET  /articles/{slug}   → article detail + HTML content
  POST /sync              → trigger Notion → S3/DynamoDB sync
"""
import re
from typing import Any

from lib.response import no_content, not_found

# Import handlers lazily-ish — modules are cached after first import
from handlers.articles import handle_list, handle_detail
from handlers.sync import handle_sync

# Slug route: /articles/<slug>  (slug may contain letters, digits, hyphens)
_ARTICLE_DETAIL_RE = re.compile(r"^/articles/([A-Za-z0-9][A-Za-z0-9\-]*)/?$")


def handler(event: dict[str, Any], context: Any) -> dict:
    method: str = event.get("httpMethod", "GET").upper()
    path: str = event.get("path", "/").rstrip("/") or "/"

    # ── CORS preflight ──────────────────────────────────────────────────────
    if method == "OPTIONS":
        return no_content()

    # ── POST /sync ──────────────────────────────────────────────────────────
    if method == "POST" and path == "/sync":
        return handle_sync(event)

    if method == "GET":
        # ── GET /articles/{slug} ────────────────────────────────────────────
        match = _ARTICLE_DETAIL_RE.match(path)
        if match:
            return handle_detail(event, match.group(1))

        # ── GET /articles ───────────────────────────────────────────────────
        if path in ("/articles", "/"):
            return handle_list(event)

    return not_found(f"Route not found: {method} {path}")
