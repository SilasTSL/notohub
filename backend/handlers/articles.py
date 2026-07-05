import json

from lib.dynamodb import get_article_by_slug, list_articles, list_articles_by_author
from lib.s3 import get_article_html
from lib.response import public_ok, not_found, server_error


def handle_list(event: dict) -> dict:
    """GET /articles — return paginated article metadata."""
    try:
        qs = event.get("queryStringParameters") or {}
        page = max(1, int(qs.get("page", 1)))
        page_size = min(int(qs.get("pageSize", 20)), 100)
        tag_filter = qs.get("tag")

        items = list_articles(limit=page_size)

        if tag_filter:
            items = [
                a for a in items
                if any(
                    t["slug"] == tag_filter or t["name"] == tag_filter
                    for t in a["tags"]
                )
            ]

        return public_ok({
            "items": items,
            "total": len(items),
            "page": page,
            "pageSize": page_size,
            "hasNextPage": False,
        })
    except Exception as exc:
        return server_error(exc)


def handle_user_articles_public(event: dict, username: str) -> dict:
    """GET /users/{username}/articles — public list of a user's published articles."""
    try:
        articles = list_articles_by_author(username)
    except Exception as exc:
        return server_error(exc)
    return public_ok(articles)


def handle_detail(event: dict, slug: str) -> dict:
    """GET /articles/{slug} — return full article with HTML content."""
    try:
        record = get_article_by_slug(slug)
        if record is None:
            return not_found(f'Article "{slug}" not found')

        html = get_article_html(record["s3Key"])
        if html is None:
            return not_found("Article content not available")

        article = {
            "id": record["id"],
            "notionPageId": record["notionPageId"],
            "title": record["title"],
            "slug": record["slug"],
            "excerpt": record["excerpt"],
            "coverImageUrl": record.get("coverImageUrl"),
            "content": html,
            "tags": json.loads(record["tagsJson"]),
            "author": json.loads(record["authorJson"]),
            "publishedAt": record["publishedAt"],
            "updatedAt": record["updatedAt"],
            "notionLastEditedAt": record["notionLastEditedAt"],
        }

        return public_ok(article)
    except Exception as exc:
        return server_error(exc)
