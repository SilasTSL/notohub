import re
import uuid
from typing import Any

from notion_client import Client
from notion2md.exporter.block import StringExporter

from lib.config import config

# ─── Singleton ───────────────────────────────────────────────────────────────

_notion_client: Client | None = None


def _get_client() -> Client:
    global _notion_client
    if _notion_client is None:
        _notion_client = Client(auth=config.notion_api_key)
    return _notion_client


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

def fetch_notion_pages() -> list[dict]:
    """Return all Published pages from the configured Notion database."""
    notion = _get_client()
    pages: list[dict] = []
    cursor: str | None = None

    while True:
        kwargs: dict[str, Any] = {
            "database_id": config.notion_database_id,
            "filter": {"property": "Status", "select": {"equals": "Published"}},
            "sorts": [{"property": "Published Date", "direction": "descending"}],
            "page_size": 100,
        }
        if cursor:
            kwargs["start_cursor"] = cursor

        response = notion.databases.query(**kwargs)
        pages.extend(
            r for r in response.get("results", []) if r.get("object") == "page"
        )

        if not response.get("has_more"):
            break
        cursor = response.get("next_cursor")

    return pages


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


def page_to_markdown(page_id: str) -> str:
    """Convert a Notion page's block content to a Markdown string."""
    exporter = StringExporter(block_id=page_id, token=config.notion_api_key)
    return exporter.export()
