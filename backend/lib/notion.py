from __future__ import annotations

import re
import uuid
import urllib.request

from lib.config import config
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


# ─── Image helpers ───────────────────────────────────────────────────────────

def _collect_image_blocks(blocks: list) -> list[dict]:
    """Recursively collect all image blocks from the fetched block tree."""
    images = []
    for block in blocks:
        if block.get("type") == "image":
            images.append(block)
        images.extend(_collect_image_blocks(block.get("_children", [])))
    return images


def _get_image_url(block: dict) -> str | None:
    """Extract the source URL from an image block (handles file and external types)."""
    data = block.get("image", {})
    img_type = data.get("type", "")
    return data.get(img_type, {}).get("url")


def _download_image(url: str) -> tuple[bytes, str] | None:
    """
    Download an image and return (bytes, content_type).
    Returns None on any network or HTTP error so callers can skip gracefully.
    """
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Notohub/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            content_type = resp.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
            return resp.read(), content_type
    except Exception:
        return None


def _resolve_cover_image(page_meta: dict, username: str, slug: str) -> str:
    """
    Returns a permanent cover image URL for the article page, or "" if the
    page has no cover. Notion-hosted ("file") cover URLs expire after about
    an hour, so those get downloaded and re-uploaded to S3 — the same
    treatment inline images already get. External URLs (e.g. a pasted
    Unsplash link) are already permanent and used as-is.
    """
    cover = page_meta.get("cover")
    if not cover:
        return ""
    ctype = cover.get("type", "external")
    url = cover.get(ctype, {}).get("url", "")
    if not url:
        return ""
    if ctype == "external":
        return url

    from lib.s3 import put_article_image
    result = _download_image(url)
    if result is None:
        return ""
    image_data, content_type = result
    try:
        return put_article_image(username, slug, "cover", image_data, content_type)
    except Exception:
        return ""


def _upload_article_images(blocks: list, username: str, slug: str) -> dict[str, str]:
    """
    Download all image blocks and upload them to S3.
    Returns a mapping of {block_id: s3_public_url} for successful uploads.
    Failed downloads/uploads are silently skipped — the renderer falls back
    to the original Notion URL so a single bad image doesn't break the publish.
    """
    from lib.s3 import put_article_image

    url_map: dict[str, str] = {}
    for block in _collect_image_blocks(blocks):
        block_id = block.get("id", "")
        notion_url = _get_image_url(block)
        if not notion_url or not block_id:
            continue
        result = _download_image(notion_url)
        if result is None:
            continue
        image_data, content_type = result
        try:
            s3_url = put_article_image(username, slug, block_id, image_data, content_type)
            url_map[block_id] = s3_url
        except Exception:
            pass
    return url_map


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
    author_slug: str = "",
    current_slug: str = "",
    author_avatar_url: str = "",
) -> tuple[dict, str]:
    """
    Fetch a Notion page and return (metadata, html).

    Args:
        page_id:           Notion page ID.
        access_token:      Notion OAuth token for the user, or a private integration token.
        existing_id:       Existing article ID to reuse (skips generating a new UUID).
        author_name:       Override the author displayed in the rendered HTML.
        author_slug:       NotoHub username — embedded in the "More from" section and
                           used to link the byline to the author's profile page.
        current_slug:      Slug of this article — excluded from the "More from" list.
        author_avatar_url: Author's uploaded profile picture, if any.
    """
    auth_fn = token_auth(access_token)
    page_data = fetch_notion_page(page_id, auth_fn)
    metadata = page_to_metadata(page_data["meta"], existing_id=existing_id)
    display_author = author_name or metadata["author"]["name"]

    username_for_assets = author_slug or "unknown"
    slug_for_assets = current_slug or page_id

    image_url_map = _upload_article_images(
        page_data["blocks"],
        username=username_for_assets,
        slug=slug_for_assets,
    )

    # Re-hosts Notion-hosted covers to S3 (they expire after ~1hr) so both the
    # rendered page and the stored article record (used by article cards
    # elsewhere) point at a URL that won't rot.
    cover_image_url = _resolve_cover_image(page_data["meta"], username_for_assets, slug_for_assets)
    if cover_image_url:
        metadata["coverImageUrl"] = cover_image_url

    html = render_page_data(
        page_data,
        author=display_author,
        author_slug=author_slug,
        current_slug=current_slug,
        api_base_url=config.public_api_url,
        image_url_map=image_url_map,
        author_avatar_url=author_avatar_url,
        cover_image_url=metadata.get("coverImageUrl") or "",
        excerpt=metadata.get("excerpt", ""),
    )
    return metadata, html
