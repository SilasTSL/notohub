import json
import uuid
import boto3
from datetime import datetime, timezone

from lib.cognito import get_verified_user
from lib.users import get_user
from lib.notion import fetch_page_for_publish
from lib.notion_to_html import _extract_page_id
from lib.s3 import put_article_html, delete_article_html
from lib.dynamodb import put_article, delete_article, list_user_articles, get_user_article_by_slug, get_user_notion_token
from lib.response import ok, bad_request, unauthorized, not_found, server_error

# Marker key on the event payload used for the async self-invocation — lets
# handler.py tell a background job apart from a normal API Gateway request
# (which always has httpMethod/path instead).
PUBLISH_JOB_KIND = "publish_article"


def handle_user_publish(event: dict, context) -> dict:
    """
    POST /articles/publish

    Starts a publish job rather than doing the work inline: API Gateway
    hard-caps its integration timeout at 29 seconds (not configurable),
    while a Notion page with several images can take well over a minute to
    fetch and re-upload. So this validates the request synchronously, writes
    a "publishing" placeholder record, and hands the slow part to an async
    self-invocation of this same Lambda (see run_publish_job below) — that
    invocation isn't going through API Gateway at all, so the 29s cap
    doesn't apply to it.

    Poll GET /v1/articles/{slug} for status: "publishing" -> "published"/"failed".
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

    # Reuse the existing article ID if this user already published under this
    # slug so the background job overwrites the record rather than duplicating it.
    existing = get_user_article_by_slug(user_sub, slug)
    article_id = existing["id"] if existing else str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    published_at = (existing or {}).get("publishedAt") or now

    # Placeholder record: for a re-publish, keep the last-known-good metadata
    # intact (so a failed refresh doesn't blank out what's already live) and
    # just flip the status; for a brand-new article, seed reasonable defaults.
    record = dict(existing) if existing else {
        "PK": f"ARTICLE#{article_id}",
        "SK": "ARTICLE",
        "id": article_id,
        "userId": user_sub,
        "GSI1PK": f"SLUG#{slug}",
        "GSI1SK": "ARTICLE",
        "GSI2PK": user_sub,
        "GSI2SK": now,
        "title": slug,
        "slug": slug,
        "excerpt": "",
        "authorName": username,
        "authorJson": json.dumps({"id": user_sub, "name": username}),
        "tagsJson": json.dumps([]),
        "createdAt": now,
    }
    record.update({
        "notionLink": notion_url,
        "status": "publishing",
        "updatedAt": now,
        "publishedAt": published_at,
    })
    record.pop("publishError", None)

    try:
        put_article(record)
    except Exception as exc:
        return server_error(exc)

    job_payload = {
        "_notohub_job": PUBLISH_JOB_KIND,
        "article_id": article_id,
        "user_sub": user_sub,
        "username": username,
        "slug": slug,
        "notion_url": notion_url,
        "notion_page_id": notion_page_id,
        "notion_token": notion_token,
        "created_at": record["createdAt"],
        "published_at": published_at,
    }

    try:
        boto3.client("lambda").invoke(
            FunctionName=context.invoked_function_arn,
            InvocationType="Event",
            Payload=json.dumps(job_payload).encode(),
        )
    except Exception as exc:
        # Don't leave the record stuck on "publishing" if we couldn't even
        # start the background job.
        record["status"] = "failed"
        record["publishError"] = f"Could not start publish job: {exc}"
        put_article(record)
        return server_error(exc)

    return ok({"status": "publishing", "slug": slug}, status_code=202)


def run_publish_job(payload: dict) -> None:
    """
    Background worker for the publish job — only ever invoked via the async
    self-invocation in handle_user_publish, never reachable through API
    Gateway, so it isn't bound by the 29s integration timeout.
    """
    slug = payload["slug"]
    username = payload["username"]
    user_sub = payload["user_sub"]
    article_id = payload["article_id"]

    try:
        user_record = get_user(user_sub)
        author_avatar_url = (user_record or {}).get("avatarUrl") or ""
        social_links = (user_record or {}).get("socialLinks")

        metadata, html = fetch_page_for_publish(
            payload["notion_page_id"],
            access_token=payload["notion_token"],
            author_name=username,
            author_slug=username,
            current_slug=slug,
            author_avatar_url=author_avatar_url,
            social_links=social_links,
        )
        # The user chose this slug in the publish modal — honour it over Notion's.
        metadata["slug"] = slug

        s3_key = put_article_html(username, slug, html)

        now = datetime.now(timezone.utc).isoformat()
        record = {
            "PK": f"ARTICLE#{article_id}",
            "SK": "ARTICLE",
            "id": article_id,
            "userId": user_sub,
            "GSI1PK": f"SLUG#{slug}",
            "GSI1SK": "ARTICLE",
            "GSI2PK": user_sub,
            "GSI2SK": now,
            "title": metadata.get("title", ""),
            "slug": slug,
            "notionPageId": metadata.get("notionPageId", payload["notion_page_id"]),
            "notionLink": payload["notion_url"],
            "excerpt": metadata.get("excerpt", ""),
            "coverImageUrl": metadata.get("coverImageUrl"),
            "tagsJson": json.dumps(metadata.get("tags", [])),
            "authorJson": json.dumps({"id": user_sub, "name": username}),
            "authorName": username,
            "s3Key": s3_key,
            "notionLastEditedAt": metadata.get("notionLastEditedAt", now),
            "status": "published",
            "createdAt": payload["created_at"],
            "updatedAt": now,
            "publishedAt": payload["published_at"],
        }
        put_article(record)
    except Exception as exc:
        print(f"[ERROR] publish job failed for slug={slug}: {exc}", flush=True)
        existing = get_user_article_by_slug(user_sub, slug)
        if existing:
            existing["status"] = "failed"
            existing["publishError"] = str(exc)[:500]
            existing["updatedAt"] = datetime.now(timezone.utc).isoformat()
            put_article(existing)


def handle_user_article_status(event: dict, slug: str) -> dict:
    """
    GET /v1/articles/{slug}

    Poll target for the publish job started by POST /articles/publish.
    """
    try:
        user_info = get_verified_user(event)
    except ValueError as exc:
        return unauthorized(str(exc))

    article = get_user_article_by_slug(user_info["sub"], slug)
    if not article:
        return not_found("Article not found")

    status = article.get("status", "published")
    username = article.get("authorName", "")

    return ok({
        "status": status,
        "url": f"https://www.notohub.com/{username}/{slug}/" if status == "published" else None,
        "error": article.get("publishError"),
    })


def handle_user_delete(event: dict, slug: str) -> dict:
    """DELETE /v1/articles/{slug} — delete the caller's article by slug."""
    try:
        user_info = get_verified_user(event)
    except ValueError as exc:
        return unauthorized(str(exc))

    article = get_user_article_by_slug(user_info["sub"], slug)
    if not article:
        return not_found("Article not found")

    # A brand-new article whose first publish attempt failed never got as
    # far as uploading anything to S3 — nothing to clean up there.
    if article.get("s3Key"):
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
