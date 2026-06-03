import json
import uuid
from datetime import datetime, timezone

from lib.notion import fetch_page_for_publish
from lib.notion_to_html import _extract_page_id
from lib.dynamodb import get_article_by_id, put_article
from lib.s3 import put_article_html
from lib.response import ok, bad_request, not_found, server_error


# ---------------------------------------------------------------------------
# POST /v1/article
# ---------------------------------------------------------------------------

def handle_create(event: dict) -> dict:
    """
    Register a new article by storing its title and Notion link in DynamoDB.
    The article is created in "draft" status — nothing is fetched from Notion yet.
    Call POST /v1/article/{articleId}/publish to render and host it.
    """
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return bad_request("Request body must be valid JSON")

    title = (body.get("title") or "").strip()
    notion_link = (body.get("notion_link") or "").strip()

    if not title:
        return bad_request("title is required")
    if not notion_link:
        return bad_request("notion_link is required")

    # Validate the URL and extract the page ID early so we catch bad links now
    # rather than at publish time.
    try:
        notion_page_id = _extract_page_id(notion_link)
    except ValueError:
        return bad_request(
            "notion_link does not look like a valid Notion page URL. "
            "Expected format: https://www.notion.so/Page-Title-<32hexchars>"
        )

    article_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    record = {
        "PK": f"ARTICLE#{article_id}",
        "SK": "ARTICLE",
        "id": article_id,
        "title": title,
        "notionLink": notion_link,
        "notionPageId": notion_page_id,
        "status": "draft",
        "createdAt": now,
        "updatedAt": now,
    }

    try:
        put_article(record)
    except Exception as exc:
        return server_error(exc)

    return ok(
        {
            "id": article_id,
            "title": title,
            "notionLink": notion_link,
            "status": "draft",
            "createdAt": now,
        },
        status_code=201,
    )


# ---------------------------------------------------------------------------
# POST /v1/article/{articleId}/publish
# ---------------------------------------------------------------------------

def handle_publish(event: dict, article_id: str) -> dict:
    """
    Publish an article:
      1. Look up the article record in DynamoDB.
      2. Fetch the Notion page (metadata + blocks) in one API call.
      3. Render blocks → styled HTML.
      4. Upload to S3 at  {author_slug}/{article_slug}/index.html
         → hosted at      https://www.notohub.com/{author}/{slug}/
      5. Update the DynamoDB record to status=published with the S3 key.

    Calling this endpoint again re-fetches from Notion and re-uploads,
    so it can be used to refresh a published article too.
    """
    try:
        record = get_article_by_id(article_id)
    except Exception as exc:
        return server_error(exc)

    if record is None:
        return not_found(f"Article '{article_id}' not found")

    notion_page_id = record.get("notionPageId")
    if not notion_page_id:
        return bad_request("Article record is missing notionPageId — was it created via POST /v1/article?")

    try:
        # Single Notion API roundtrip: fetches page metadata + blocks, renders HTML
        metadata, html = fetch_page_for_publish(notion_page_id, existing_id=article_id)
    except Exception as exc:
        return server_error(exc)

    author_name = metadata["author"]["name"]
    slug = metadata["slug"]

    try:
        # Uploads to s3://<bucket>/{author_slug}/{slug}/index.html
        # Served at https://www.notohub.com/{author_slug}/{slug}/
        s3_key = put_article_html(author_name, slug, html)
    except Exception as exc:
        return server_error(exc)

    now = datetime.now(timezone.utc).isoformat()

    # Preserve the original publishedAt if re-publishing an already-live article
    published_at = record.get("publishedAt") or now

    updated_record = {
        **record,
        # GSI1 keys enable slug-based lookup (GET /articles/{slug})
        "GSI1PK": f"SLUG#{slug}",
        "GSI1SK": "ARTICLE",
        "slug": slug,
        "excerpt": metadata.get("excerpt", ""),
        "coverImageUrl": metadata.get("coverImageUrl"),
        "tagsJson": json.dumps(metadata.get("tags", [])),
        "authorJson": json.dumps(metadata["author"]),
        "authorName": author_name,
        "s3Key": s3_key,
        "notionLastEditedAt": metadata["notionLastEditedAt"],
        "status": "published",
        "publishedAt": published_at,
        "updatedAt": now,
    }

    try:
        put_article(updated_record)
    except Exception as exc:
        return server_error(exc)

    return ok({
        "id": article_id,
        "title": record["title"],
        "authorName": author_name,
        "url": f"https://www.notohub.com/{author_name.lower().replace(' ', '-')}/{slug}/",
        "status": "published",
        "publishedAt": published_at,
    })
