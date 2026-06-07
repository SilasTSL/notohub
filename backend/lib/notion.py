from __future__ import annotations

import re
import uuid

from lib.notion_to_html import (
    fetch_notion_page,
    render_page_data,
    token_auth,
)


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


def fetch_page_for_publish(
    page_id: str,
    access_token: str,
    existing_id: str | None = None,
    author_name: str | None = None,
) -> tuple[dict, str]:
    """
    Fetch a Notion page and return (metadata, html).

    Args:
        page_id:      Notion page ID.
        access_token: Notion OAuth token for the user, or a private integration token.
        existing_id:  Existing article ID to reuse (skips generating a new UUID).
        author_name:  Override the author displayed in the rendered HTML.
    """
    auth_fn = token_auth(access_token)
    page_data = fetch_notion_page(page_id, auth_fn)
    metadata = page_to_metadata(page_data["meta"], existing_id=existing_id)
    display_author = author_name or metadata["author"]["name"]
    html = render_page_data(page_data, author=display_author)
    return metadata, html
