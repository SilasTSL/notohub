"""
handlers/profile.py
-------------------
Route handlers for user profile management.

Routes:
  GET    /profile                    → get caller's profile fields (auth required)
  POST   /profile                    → save profile + publish shell to S3 (auth required)
  POST   /profile/avatar-upload-url  → generate pre-signed PUT URL (auth required)
  POST   /auth/notion/disconnect     → remove stored Notion OAuth token (auth required)
  DELETE /account                    → delete all of the caller's data (auth required)
  GET    /articles/public            → public article list by username (no auth, CORS *)
"""
from __future__ import annotations

import json
import re

from lib.cognito import get_verified_user
from lib.users import get_user, get_user_by_username, update_user_profile, set_profile_published, delete_user
from lib.dynamodb import list_user_articles, delete_article, clear_notion_token
from lib.s3 import generate_presigned_put_url, put_profile_html, delete_user_content, ALLOWED_AVATAR_CONTENT_TYPES
from lib.config import config
from lib.response import ok, bad_request, unauthorized, not_found, server_error, public_ok
from templates.profile_index import render_profile_index_shell

_URL_RE = re.compile(r"^https?://.+", re.IGNORECASE)


# ── GET /profile ──────────────────────────────────────────────────────────────

def handle_get_profile(event: dict) -> dict:
    """Return the caller's saved profile fields."""
    try:
        user_info = get_verified_user(event)
    except ValueError as exc:
        return unauthorized(str(exc))

    user = get_user(user_info["sub"])
    if not user:
        return not_found("User record not found")

    return ok({
        "bio": user.get("bio"),
        "avatarUrl": user.get("avatarUrl"),
        "socialLinks": user.get("socialLinks"),
        "profilePublished": user.get("profilePublished", False),
        "notionConnected": bool(user.get("notionAccessToken")),
    })


# ── POST /auth/notion/disconnect ─────────────────────────────────────────────

def handle_disconnect_notion(event: dict) -> dict:
    """Remove the caller's stored Notion OAuth token."""
    try:
        user_info = get_verified_user(event)
    except ValueError as exc:
        return unauthorized(str(exc))

    try:
        clear_notion_token(user_info["sub"])
    except Exception as exc:
        return server_error(exc)

    return ok({"message": "Notion disconnected"})


# ── DELETE /account ───────────────────────────────────────────────────────────

def handle_delete_account(event: dict) -> dict:
    """
    Permanently delete the caller's account data: every published article
    (DynamoDB + S3 HTML/images), the profile page + avatar, and the user
    record itself. The Cognito login is deleted separately by the frontend
    (self-service, using the caller's still-valid session) immediately after
    this succeeds — this endpoint only owns the backend data.
    """
    try:
        user_info = get_verified_user(event)
    except ValueError as exc:
        return unauthorized(str(exc))

    user_sub = user_info["sub"]
    user = get_user(user_sub)
    if not user:
        return not_found("User record not found")

    username = user.get("username", "")

    try:
        for article in list_user_articles(user_sub):
            delete_article(article["id"])
        if username:
            delete_user_content(username)
        delete_user(user_sub)
    except Exception as exc:
        return server_error(exc)

    return ok({"message": "Account deleted"})


# ── POST /profile/avatar-upload-url ──────────────────────────────────────────

def handle_avatar_upload_url(event: dict) -> dict:
    """
    Return a pre-signed S3 PUT URL so the browser can upload an avatar image
    directly without routing bytes through Lambda.
    """
    try:
        user_info = get_verified_user(event)
    except ValueError as exc:
        return unauthorized(str(exc))

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return bad_request("Request body must be valid JSON")

    content_type = (body.get("contentType") or "").strip().lower()
    if not content_type:
        return bad_request("contentType is required")
    if content_type not in ALLOWED_AVATAR_CONTENT_TYPES:
        return bad_request(
            f"contentType must be one of: {', '.join(sorted(ALLOWED_AVATAR_CONTENT_TYPES))}"
        )

    username = user_info["username"]
    if not username:
        user_record = get_user(user_info["sub"])
        if not user_record:
            return not_found("User record not found — please sign out and back in")
        username = user_record.get("username", "unknown")

    try:
        upload_url, public_url = generate_presigned_put_url(username, content_type)
    except Exception as exc:
        return server_error(exc)

    return ok({"uploadUrl": upload_url, "publicUrl": public_url})


# ── POST /profile ─────────────────────────────────────────────────────────────

def handle_save_profile(event: dict) -> dict:
    """
    Save profile fields to DynamoDB and publish the profile shell HTML to S3.
    """
    try:
        user_info = get_verified_user(event)
    except ValueError as exc:
        return unauthorized(str(exc))

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return bad_request("Request body must be valid JSON")

    bio: str | None = body.get("bio")
    avatar_url: str | None = body.get("avatarUrl")
    social_links: dict | None = body.get("socialLinks")

    # ── Validate bio ──────────────────────────────────────────────────────────
    if bio is not None:
        if not isinstance(bio, str):
            return bad_request("bio must be a string")
        if len(bio) > 280:
            return bad_request("bio must be 280 characters or fewer")

    # ── Validate avatarUrl ────────────────────────────────────────────────────
    if avatar_url is not None:
        if not isinstance(avatar_url, str) or not _URL_RE.match(avatar_url):
            return bad_request("avatarUrl must be a valid URL")

    # ── Validate socialLinks ──────────────────────────────────────────────────
    if social_links is not None:
        if not isinstance(social_links, dict):
            return bad_request("socialLinks must be an object")
        for field in ("twitter", "github", "linkedin"):
            val = social_links.get(field)
            if val is not None:
                if not isinstance(val, str):
                    return bad_request(f"socialLinks.{field} must be a string")
                if val and not _URL_RE.match(val):
                    return bad_request(
                        f"socialLinks.{field} must be a valid URL starting with http:// or https://"
                    )

    user_sub = user_info["sub"]
    username = user_info["username"]
    if not username:
        user_record = get_user(user_sub)
        if not user_record:
            return not_found("User record not found — please sign out and back in")
        username = user_record.get("username", "unknown")

    # ── Persist to DynamoDB ───────────────────────────────────────────────────
    try:
        update_user_profile(
            user_sub,
            bio=bio,
            avatar_url=avatar_url,
            social_links=social_links,
        )
        set_profile_published(user_sub)
    except Exception as exc:
        return server_error(exc)

    # ── Fetch fresh profile to embed in the shell ─────────────────────────────
    user_record = get_user(user_sub)
    saved_bio = user_record.get("bio") if user_record else bio
    saved_avatar = user_record.get("avatarUrl") if user_record else avatar_url
    saved_links = user_record.get("socialLinks") if user_record else social_links

    # ── Render and upload profile shell HTML ──────────────────────────────────
    shell_html = render_profile_index_shell(
        username=username,
        bio=saved_bio,
        avatar_url=saved_avatar,
        social_links=saved_links,
        api_base_url=config.public_api_url,
    )
    try:
        put_profile_html(username, shell_html)
    except Exception as exc:
        return server_error(exc)

    return ok({"url": f"https://www.notohub.com/{username}/"}, status_code=200)


# ── GET /articles/public?username={username} ──────────────────────────────────

def handle_public_articles(event: dict) -> dict:
    """
    Public endpoint — returns a user's published articles for display on their
    profile page. No auth required; CORS open (*).

    Only returns { title, slug, publishedAt } per article — no internal fields.
    """
    qs = event.get("queryStringParameters") or {}
    username = (qs.get("username") or "").strip()

    if not username:
        return _public_bad_request("username query parameter is required")

    user = get_user_by_username(username)
    if not user:
        return _public_not_found(f'User "{username}" not found')

    try:
        articles = list_user_articles(user["userId"])
    except Exception as exc:
        return server_error(exc)

    safe_articles = [
        {
            "title": a.get("title", ""),
            "slug": a.get("slug", ""),
            "publishedAt": a.get("publishedAt", ""),
        }
        for a in articles
    ]

    return public_ok(safe_articles)


# ── Helpers for the public endpoint ──────────────────────────────────────────

def _public_bad_request(message: str) -> dict:
    import json
    return {
        "statusCode": 400,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET,OPTIONS",
        },
        "body": json.dumps({"success": False, "error": message}),
    }


def _public_not_found(message: str) -> dict:
    import json
    return {
        "statusCode": 404,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET,OPTIONS",
        },
        "body": json.dumps({"success": False, "error": message}),
    }
