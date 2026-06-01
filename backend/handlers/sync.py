import json
from datetime import datetime, timezone

import markdown as md

from lib.notion import fetch_notion_pages, page_to_metadata, page_to_markdown
from lib.dynamodb import put_article, get_article_by_notion_id
from lib.s3 import put_article_html
from lib.response import ok, server_error


def handle_sync(event: dict) -> dict:
    """
    POST /sync — fetch all Published Notion pages, render to HTML,
    store in S3, and upsert metadata in DynamoDB.
    """
    synced_at = datetime.now(timezone.utc).isoformat()
    errors: list[str] = []
    processed = 0
    updated = 0

    try:
        pages = fetch_notion_pages()
        processed = len(pages)

        for page in pages:
            page_id = page["id"]
            try:
                existing = get_article_by_notion_id(page_id)
                existing_id = existing["id"] if existing else None

                # Skip pages that haven't changed since last sync
                if existing and existing.get("notionLastEditedAt") == page["last_edited_time"]:
                    continue

                # Notion blocks → Markdown → HTML
                markdown_content = page_to_markdown(page_id)
                html = md.markdown(
                    markdown_content,
                    extensions=["fenced_code", "tables", "attr_list"],
                )

                metadata = page_to_metadata(page, existing_id=existing_id)

                s3_key = put_article_html(metadata["id"], html)

                record = {
                    "PK": f"ARTICLE#{metadata['id']}",
                    "SK": "ARTICLE",
                    "GSI1PK": f"SLUG#{metadata['slug']}",
                    "GSI1SK": "ARTICLE",
                    "id": metadata["id"],
                    "notionPageId": page_id,
                    "title": metadata["title"],
                    "slug": metadata["slug"],
                    "excerpt": metadata["excerpt"],
                    "coverImageUrl": metadata.get("coverImageUrl"),
                    "s3Key": s3_key,
                    "tagsJson": json.dumps(metadata["tags"]),
                    "authorJson": json.dumps(metadata["author"]),
                    "publishedAt": metadata["publishedAt"],
                    "updatedAt": datetime.now(timezone.utc).isoformat(),
                    "notionLastEditedAt": page["last_edited_time"],
                }

                put_article(record)
                updated += 1

            except Exception as exc:
                msg = f"Page {page_id}: {exc}"
                errors.append(msg)
                print(f"[SYNC] Error — {msg}", flush=True)

        return ok({
            "status": "succeeded" if not errors else "failed",
            "syncedAt": synced_at,
            "articlesProcessed": processed,
            "articlesUpdated": updated,
            "errors": errors,
        })

    except Exception as exc:
        return server_error(exc)
