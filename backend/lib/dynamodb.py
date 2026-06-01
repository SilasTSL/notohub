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
        "notionPageId": record["notionPageId"],
        "title": record["title"],
        "slug": record["slug"],
        "excerpt": record["excerpt"],
        "coverImageUrl": record.get("coverImageUrl"),
        "tags": json.loads(record["tagsJson"]),
        "author": json.loads(record["authorJson"]),
        "publishedAt": record["publishedAt"],
        "updatedAt": record["updatedAt"],
        "notionLastEditedAt": record["notionLastEditedAt"],
    }


# ─── Public API ──────────────────────────────────────────────────────────────

def put_article(record: dict) -> None:
    """Upsert an article record."""
    # Remove None values — DynamoDB rejects them
    clean = {k: v for k, v in record.items() if v is not None}
    _get_table().put_item(Item=clean)


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


def get_article_by_notion_id(notion_page_id: str) -> dict | None:
    """Fetch a raw article record by Notion page ID."""
    response = _get_table().query(
        IndexName="NotionPageIndex",
        KeyConditionExpression=Key("notionPageId").eq(notion_page_id),
        Limit=1,
    )
    items = response.get("Items", [])
    return items[0] if items else None


def list_articles(limit: int = 50) -> list[dict]:
    """Scan and return article metadata sorted by publishedAt desc."""
    response = _get_table().scan(
        FilterExpression=Attr("SK").eq("ARTICLE"),
        Limit=limit,
    )
    items = [_record_to_metadata(item) for item in response.get("Items", [])]
    items.sort(key=lambda a: a["publishedAt"], reverse=True)
    return items
