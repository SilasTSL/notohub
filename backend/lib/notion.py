from __future__ import annotations

import re
import uuid
from typing import Callable

from lib.config import config
from lib.notion_to_html import (
    fetch_notion_page,
    page_id_to_html,
    render_page_data,
    token_auth,
)

# ─── Auth singleton ──────────────────────────────────────────────────────────
# Using token_auth for now (private integration token from env).
# When moving to OAuth / public connections, swap this for your OAuth factory
# and pass the user's access token instead.

_auth_fn: Callable[[], dict] | None = None


def _get_auth() -> Callable[[], dict]:
    global _auth_fn
    if _auth_fn is None:
        _auth_fn = token_auth(config.notion_api_key)
    return _auth_fn


# ─── Property extractors ─────────────────────────────────────────────────────

def _rich_text(page: dict, prop: str) -> str:
    p = page.get("properties", {}).get(prop, {})
    if p.get("type") != "rich_text":
        return ""
    return "".join(t["plain_text"] for t in p.get("rich_text", []))


def _title(page: dict) -> str:
    for p in page.get("properties", {}).values():
        if p.get("type") == "title":
            return "".join(t["plain_text"] for t in p.get("title", []))
    return ""


def _multi_select_tags(page: dict, prop: str) -> list[dict]:
    p = page.get("properties", {}).get(prop, {})
    if p.get("type") != "multi_select":
        return []
    return [
        {
            "id": t["id"],
            "name": t["name"],
            "slug": re.sub(r"\s+", "-", t["name"].lower()),
            "color": t.get("color"),
        }
        for t in p.get("multi_select", [])
    ]


def _date(page: dict, prop: str) -> str | None:
    p = page.get("properties", {}).get(prop, {})
    if p.get("type") != "date":
        return None
    d = p.get("date")
    return d["start"] if d else None


def _person(page: dict, prop: str) -> dict:
    p = page.get("properties", {}).get(prop, {})
    if p.get("type") != "people" or not p.get("people"):
        return {"id": "unknown", "name": "Unknown Author"}
    person = p["people"][0]
    return {
        "id": person["id"],
        "name": person.get("name", "Unknown"),
        "avatarUrl": person.get("avatar_url"),
    }


def _cover_url(page: dict) -> str | None:
    cover = page.get("cover")
    if not cover:
        return None
    if cover["type"] == "external":
        return cover["external"]["url"]
    if cover["type"] == "file":
        return cover["file"]["url"]
    return None


# ─── Public API ──────────────────────────────────────────────────────────────

def page_to_metadata(page: dict, existing_id: str | None = None) -> dict:
    """Convert a Notion page object to an article metadata dict."""
    title = _title(page)
    slug = _rich_text(page, "Slug") or re.sub(r"[^a-z0-9]+", "-", title.lower())
    published_at = _date(page, "Published Date") or page["created_time"]

    return {
        "id": existing_id or str(uuid.uuid4()),
        "notionPageId": page["id"],
        "title": title,
        "slug": slug,
        "excerpt": _rich_text(page, "Excerpt"),
        "coverImageUrl": _cover_url(page),
        "tags": _multi_select_tags(page, "Tags"),
        "author": _person(page, "Author"),
        "publishedAt": published_at,
        "updatedAt": page["last_edited_time"],
        "notionLastEditedAt": page["last_edited_time"],
    }


def page_to_html(page_id: str, author_name: str) -> str:
    """
    Fetch a Notion page's blocks and render to a styled HTML string.

    Uses the current auth factory (token_auth for now; swap for OAuth later).
    """
    return page_id_to_html(page_id, _get_auth(), author=author_name)


def fetch_page_for_publish(
    page_id: str,
    existing_id: str | None = None,
) -> tuple[dict, str]:
    """
    Fetch a Notion page and return (metadata, html) in a single API roundtrip.

    Combines fetch_notion_page + page_to_metadata + render_page_data so the
    publish handler doesn't make two separate calls to Notion.

    Args:
        page_id:     Notion page ID.
        existing_id: Existing article ID to preserve (skips generating a new UUID).

    Returns:
        Tuple of (metadata dict, rendered HTML string).
    """
    auth_fn = _get_auth()
    page_data = fetch_notion_page(page_id, auth_fn)
    metadata = page_to_metadata(page_data["meta"], existing_id=existing_id)
    html = render_page_data(page_data, author=metadata["author"]["name"])
    return metadata, html
