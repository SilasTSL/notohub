from __future__ import annotations

import json
from typing import Any

import boto3
from boto3.dynamodb.conditions import Attr, Key

from lib.config import config

# ─── Singleton ───────────────────────────────────────────────────────────────

_table: Any = None  # boto3 Table resource


def _get_table() -> Any:
    global _table
    if _table is None:
        dynamodb = boto3.resource("dynamodb", region_name=config.aws_region)
        _table = dynamodb.Table(config.dynamodb_table_name)
    return _table


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _record_to_metadata(record: dict) -> dict:
    return {
        "id": record["id"],
        "notionPageId": record.get("notionPageId", ""),
        "notionLink": record.get("notionLink", ""),
        "title": record["title"],
        "slug": record.get("slug", ""),
        "excerpt": record.get("excerpt", ""),
        "coverImageUrl": record.get("coverImageUrl"),
        "tags": json.loads(record["tagsJson"]) if "tagsJson" in record else [],
        "author": json.loads(record["authorJson"]) if "authorJson" in record else {"id": "unknown", "name": record.get("authorName", "Unknown")},
        "publishedAt": record.get("publishedAt", record.get("createdAt", "")),
        "updatedAt": record.get("updatedAt", ""),
        "notionLastEditedAt": record.get("notionLastEditedAt", ""),
    }


# ─── Public API ──────────────────────────────────────────────────────────────

def put_article(record: dict) -> None:
    """Upsert an article record."""
    # Remove None values — DynamoDB rejects them
    clean = {k: v for k, v in record.items() if v is not None}
    _get_table().put_item(Item=clean)


def delete_article(article_id: str) -> None:
    """Delete an article record by its ID."""
    _get_table().delete_item(Key={"PK": f"ARTICLE#{article_id}", "SK": "ARTICLE"})


def get_article_by_slug(slug: str) -> dict | None:
    """Fetch a raw article record by slug via GSI1."""
    response = _get_table().query(
        IndexName="GSI1",
        KeyConditionExpression=Key("GSI1PK").eq(f"SLUG#{slug}")
        & Key("GSI1SK").eq("ARTICLE"),
        Limit=1,
    )
    items = response.get("Items", [])
    return items[0] if items else None


def get_user_article_by_slug(user_id: str, slug: str) -> dict | None:
    """Fetch this user's article with the given slug, or None if it doesn't exist.

    Queries GSI1 (slug index) and filters by userId so two users with the same
    slug don't collide — slugs are only unique per user, not globally.
    """
    response = _get_table().query(
        IndexName="GSI1",
        KeyConditionExpression=Key("GSI1PK").eq(f"SLUG#{slug}")
        & Key("GSI1SK").eq("ARTICLE"),
        FilterExpression=Attr("userId").eq(user_id),
    )
    items = response.get("Items", [])
    return items[0] if items else None


def get_article_by_id(article_id: str) -> dict | None:
    """Fetch a raw article record by its ID (primary key lookup)."""
    response = _get_table().get_item(
        Key={"PK": f"ARTICLE#{article_id}", "SK": "ARTICLE"}
    )
    return response.get("Item")


def list_user_articles(user_id: str) -> list[dict]:
    """List a user's published articles via GSI2, newest first."""
    response = _get_table().query(
        IndexName="GSI2",
        KeyConditionExpression=Key("GSI2PK").eq(user_id),
        ScanIndexForward=False,
    )
    return [_record_to_metadata(item) for item in response.get("Items", [])]


def save_notion_token(user_id: str, access_token: str) -> None:
    """Persist the user's Notion OAuth access token on their user record."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    _get_table().update_item(
        Key={"PK": f"USER#{user_id}", "SK": "USER"},
        UpdateExpression="SET notionAccessToken = :token, updatedAt = :now",
        ExpressionAttributeValues={":token": access_token, ":now": now},
    )


def clear_notion_token(user_id: str) -> None:
    """Disconnect Notion — remove the stored OAuth access token."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    _get_table().update_item(
        Key={"PK": f"USER#{user_id}", "SK": "USER"},
        UpdateExpression="REMOVE notionAccessToken SET updatedAt = :now",
        ExpressionAttributeValues={":now": now},
    )


def get_user_notion_token(user_id: str) -> str | None:
    """Return the user's stored Notion OAuth access token, or None if not connected."""
    response = _get_table().get_item(
        Key={"PK": f"USER#{user_id}", "SK": "USER"},
        ProjectionExpression="notionAccessToken",
    )
    return response.get("Item", {}).get("notionAccessToken")


def list_articles_by_author(author_name: str) -> list[dict]:
    """Return all published articles by a given author, newest first."""
    response = _get_table().scan(
        FilterExpression=Attr("SK").eq("ARTICLE")
            & Attr("authorName").eq(author_name)
            & Attr("status").eq("published"),
    )
    items = [_record_to_metadata(item) for item in response.get("Items", [])]
    items.sort(key=lambda a: a["publishedAt"], reverse=True)
    return items


def list_articles(limit: int = 50) -> list[dict]:
    """Scan and return published article metadata sorted by publishedAt desc."""
    response = _get_table().scan(
        FilterExpression=Attr("SK").eq("ARTICLE") & Attr("status").eq("published"),
        Limit=limit,
    )
    items = [_record_to_metadata(item) for item in response.get("Items", [])]
    items.sort(key=lambda a: a["publishedAt"], reverse=True)
    return items
