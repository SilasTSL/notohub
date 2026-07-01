import json
import uuid
from datetime import datetime, timezone

from lib.cognito import get_verified_user
from lib.users import get_user
from lib.notion import fetch_page_for_publish
from lib.notion_to_html import _extract_page_id
from lib.s3 import put_article_html, delete_article_html
from lib.dynamodb import put_article, delete_article, list_user_articles, get_user_article_by_slug, get_user_notion_token
from lib.response import ok, bad_request, unauthorized, not_found, server_error


def handle_user_publish(event: dict) -> dict:
    """
    POST /articles/publish

    Single-shot publish: takes a Notion page URL and a user-chosen slug,
    renders the page to HTML, uploads to S3, and records it in DynamoDB.
    Uses the user's stored Notion OAuth token — the user must connect their
    Notion workspace via /auth/notion/connect before publishing.
    """
    try:
        user_info = get_verified_user(event)
    except ValueError as exc:
        return unauthorized(str(exc))

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return bad_request("Request body must be valid JSON")

    notion_url = (body.get("notionUrl") or "").strip()
    slug = (body.get("slug") or "").strip()

    if not notion_url:
        return bad_request("notionUrl is required")
    if not slug:
        return bad_request("slug is required")

    try:
        notion_page_id = _extract_page_id(notion_url)
    except ValueError:
        return bad_request(
            "notionUrl does not look like a valid Notion page URL. "
            "Expected: https://www.notion.so/Page-Title-<32hexchars>"
        )

    user_sub = user_info["sub"]
    username = user_info["username"]

    # custom:username is set at signup; fall back to the DynamoDB record
    # in case an older token was issued before the attribute was set.
    if not username:
        user_record = get_user(user_sub)
        if not user_record:
            return not_found("User record not found — please sign out and back in")
        username = user_record.get("username", "unknown")

    notion_token = get_user_notion_token(user_sub)
    if not notion_token:
        return bad_request(
            "Notion workspace not connected. "
            "Go to the onboarding page to connect your Notion account."
        )

    try:
        metadata, html = fetch_page_for_publish(
            notion_page_id,
            access_token=notion_token,
            author_name=username,
            author_slug=username,
            current_slug=slug,
        )
    except Exception as exc:
        return server_error(exc)

    # The user chose this slug in the publish modal — honour it over Notion's.
    metadata["slug"] = slug

    try:
        s3_key = put_article_html(username, slug, html)
    except Exception as exc:
        return server_error(exc)

    # Reuse the existing article ID if this user already published under this slug
    # so that put_article overwrites the record rather than creating a duplicate.
    existing = get_user_article_by_slug(user_sub, slug)
    article_id = existing["id"] if existing else str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    # Preserve the original publish date when refreshing an existing article.
    published_at = (existing or {}).get("publishedAt") or now

    record = {
        "PK": f"ARTICLE#{article_id}",
        "SK": "ARTICLE",
        "id": article_id,
        "userId": user_sub,
        # GSI1 enables public GET /articles/{slug} lookups
        "GSI1PK": f"SLUG#{slug}",
        "GSI1SK": "ARTICLE",
        # GSI2 enables GET /v1/articles (user's own articles)
        "GSI2PK": user_sub,
        "GSI2SK": now,
        "title": metadata.get("title", ""),
        "slug": slug,
        "notionPageId": metadata.get("notionPageId", notion_page_id),
        "notionLink": notion_url,
        "excerpt": metadata.get("excerpt", ""),
        "coverImageUrl": metadata.get("coverImageUrl"),
        "tagsJson": json.dumps(metadata.get("tags", [])),
        "authorJson": json.dumps({"id": user_sub, "name": username}),
        "authorName": username,
        "s3Key": s3_key,
        "notionLastEditedAt": metadata.get("notionLastEditedAt", now),
        "status": "published",
        "createdAt": (existing or {}).get("createdAt") or now,
        "updatedAt": now,
        "publishedAt": published_at,
    }

    try:
        put_article(record)
    except Exception as exc:
        return server_error(exc)

    article_url = f"https://www.notohub.com/{username}/{slug}/"
    return ok({"url": article_url}, status_code=201)


def handle_user_delete(event: dict, slug: str) -> dict:
    """DELETE /v1/articles/{slug} — delete the caller's article by slug."""
    try:
        user_info = get_verified_user(event)
    except ValueError as exc:
        return unauthorized(str(exc))

    article = get_user_article_by_slug(user_info["sub"], slug)
    if not article:
        return not_found("Article not found")

    try:
        delete_article_html(article["s3Key"])
    except Exception as exc:
        return server_error(exc)

    try:
        delete_article(article["id"])
    except Exception as exc:
        return server_error(exc)

    return ok({"message": "Article deleted"})


def handle_user_list(event: dict) -> dict:
    """GET /v1/articles — returns the authenticated user's published articles."""
    try:
        user_info = get_verified_user(event)
    except ValueError as exc:
        return unauthorized(str(exc))

    try:
        articles = list_user_articles(user_info["sub"])
    except Exception as exc:
        return server_error(exc)

    return ok(articles)
