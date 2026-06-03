"""
AWS Lambda entry point for the notohub backend.
Configure Lambda with handler: handler.handler

Routes:
  GET  /articles                          → list published article metadata
  GET  /articles/{slug}                   → article detail + HTML content
  POST /v1/article                        → create a new article (draft)
  POST /v1/article/{articleId}/publish    → render from Notion and host on S3
"""
import re
from typing import Any

from lib.response import no_content, not_found
from handlers.articles import handle_list, handle_detail
from handlers.article import handle_create, handle_publish

# /articles/<slug>
_ARTICLE_DETAIL_RE = re.compile(r"^/articles/([A-Za-z0-9][A-Za-z0-9\-]*)/?$")

# /v1/article/<uuid>/publish  (UUID may contain hyphens)
_PUBLISH_RE = re.compile(r"^/v1/article/([A-Za-z0-9\-]+)/publish/?$")


def handler(event: dict[str, Any], context: Any) -> dict:
    method: str = event.get("httpMethod", "GET").upper()
    path: str = event.get("path", "/").rstrip("/") or "/"

    # ── CORS preflight ──────────────────────────────────────────────────────
    if method == "OPTIONS":
        return no_content()

    # ── POST /v1/article/{id}/publish ───────────────────────────────────────
    pub_match = _PUBLISH_RE.match(path)
    if method == "POST" and pub_match:
        return handle_publish(event, pub_match.group(1))

    # ── POST /v1/article ────────────────────────────────────────────────────
    if method == "POST" and path == "/v1/article":
        return handle_create(event)

    # ── GET /articles/{slug} ────────────────────────────────────────────────
    slug_match = _ARTICLE_DETAIL_RE.match(path)
    if method == "GET" and slug_match:
        return handle_detail(event, slug_match.group(1))

    # ── GET /articles ───────────────────────────────────────────────────────
    if method == "GET" and path in ("/articles", "/"):
        return handle_list(event)

    return not_found(f"Route not found: {method} {path}")
