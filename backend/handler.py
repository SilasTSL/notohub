"""
AWS Lambda entry point for the notohub backend.
Configure Lambda with handler: handler.handler

Routes:
  POST /auth/register                     → create DynamoDB user record (requires auth)
  GET  /auth/notion/connect               → return Notion OAuth URL (requires auth)
  GET  /auth/notion/callback              → exchange code, store token, redirect to frontend
  POST /articles/publish                  → render Notion page and publish (requires auth)
  GET  /v1/articles                       → list authenticated user's articles (requires auth)
  DELETE /v1/articles/{slug}              → delete a user's article (requires auth)
  GET  /articles                          → list all published article metadata (public)
  GET  /articles/{slug}                   → article detail + HTML content (public)
  POST /v1/article                        → create a new article draft (legacy)
  POST /v1/article/{articleId}/publish    → render from Notion and host on S3 (legacy)
  OPTIONS *                               → CORS preflight
"""
import re
from typing import Any

from lib.response import no_content, not_found
from handlers.articles import handle_list, handle_detail, handle_user_articles_public
from handlers.article import handle_create, handle_publish
from handlers.auth import handle_register, handle_notion_connect, handle_notion_callback
from handlers.user_articles import handle_user_publish, handle_user_delete, handle_user_list

# /articles/<slug>  — must not match "publish" as a slug for the POST route
_ARTICLE_DETAIL_RE = re.compile(r"^/articles/([A-Za-z0-9][A-Za-z0-9\-]*)/?$")

# /v1/articles/<slug>  — authenticated user article operations
_USER_ARTICLE_RE = re.compile(r"^/v1/articles/([A-Za-z0-9][A-Za-z0-9\-]*)/?$")

# /v1/article/<uuid>/publish
_PUBLISH_RE = re.compile(r"^/v1/article/([A-Za-z0-9\-]+)/publish/?$")

# /users/<username>/articles — public per-author article list
_USER_PUBLIC_ARTICLES_RE = re.compile(r"^/users/([A-Za-z0-9][A-Za-z0-9\-]*)/articles/?$")


def handler(event: dict[str, Any], context: Any) -> dict:
    method: str = event.get("httpMethod", "GET").upper()
    path: str = event.get("path", "/").rstrip("/") or "/"

    # ── CORS preflight ──────────────────────────────────────────────────────
    if method == "OPTIONS":
        return no_content()

    # ── POST /auth/register ─────────────────────────────────────────────────
    if method == "POST" and path == "/auth/register":
        return handle_register(event)

    # ── GET /auth/notion/connect ────────────────────────────────────────────
    if method == "GET" and path == "/auth/notion/connect":
        return handle_notion_connect(event)

    # ── GET /auth/notion/callback ───────────────────────────────────────────
    if method == "GET" and path == "/auth/notion/callback":
        return handle_notion_callback(event)

    # ── POST /articles/publish ──────────────────────────────────────────────
    if method == "POST" and path == "/articles/publish":
        return handle_user_publish(event)

    # ── GET /v1/articles ────────────────────────────────────────────────────
    if method == "GET" and path == "/v1/articles":
        return handle_user_list(event)

    # ── DELETE /v1/articles/{slug} ──────────────────────────────────────────
    user_article_match = _USER_ARTICLE_RE.match(path)
    if method == "DELETE" and user_article_match:
        return handle_user_delete(event, user_article_match.group(1))

    # ── Legacy: POST /v1/article/{id}/publish ───────────────────────────────
    pub_match = _PUBLISH_RE.match(path)
    if method == "POST" and pub_match:
        return handle_publish(event, pub_match.group(1))

    # ── Legacy: POST /v1/article ────────────────────────────────────────────
    if method == "POST" and path == "/v1/article":
        return handle_create(event)

    # ── GET /articles/{slug} ────────────────────────────────────────────────
    slug_match = _ARTICLE_DETAIL_RE.match(path)
    if method == "GET" and slug_match:
        return handle_detail(event, slug_match.group(1))

    # ── GET /users/{username}/articles ─────────────────────────────────────────
    user_pub_match = _USER_PUBLIC_ARTICLES_RE.match(path)
    if method == "GET" and user_pub_match:
        return handle_user_articles_public(event, user_pub_match.group(1))

    # ── GET /articles ───────────────────────────────────────────────────────
    if method == "GET" and path in ("/articles", "/"):
        return handle_list(event)

    return not_found(f"Route not found: {method} {path}")
