from __future__ import annotations

from datetime import datetime, timezone

from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Attr

from lib.dynamodb import _get_table


def put_user(sub: str, email: str, username: str) -> None:
    """
    Create a user record keyed by Cognito sub.
    Idempotent: silently succeeds if the record already exists,
    so it is safe to call on duplicate confirmation attempts.
    """
    now = datetime.now(timezone.utc).isoformat()
    try:
        _get_table().put_item(
            Item={
                "PK": f"USER#{sub}",
                "SK": "USER",
                "userId": sub,
                "email": email,
                "username": username,
                "createdAt": now,
                "updatedAt": now,
            },
            ConditionExpression="attribute_not_exists(PK)",
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise


def get_user(sub: str) -> dict | None:
    """Fetch a user record by Cognito sub. Returns None if not found."""
    response = _get_table().get_item(
        Key={"PK": f"USER#{sub}", "SK": "USER"}
    )
    return response.get("Item")


def get_user_by_username(username: str) -> dict | None:
    """Scan for a user record by username. Returns None if not found."""
    response = _get_table().scan(
        FilterExpression=Attr("SK").eq("USER") & Attr("username").eq(username)
    )
    items = response.get("Items", [])
    return items[0] if items else None


def update_user_profile(
    sub: str,
    bio: str | None = None,
    avatar_url: str | None = None,
    social_links: dict | None = None,
) -> None:
    """Partial update of profile fields. Only overwrites the fields provided."""
    now = datetime.now(timezone.utc).isoformat()
    update_parts = ["updatedAt = :now"]
    expr_values: dict = {":now": now}

    if bio is not None:
        update_parts.append("bio = :bio")
        expr_values[":bio"] = bio
    if avatar_url is not None:
        update_parts.append("avatarUrl = :avatarUrl")
        expr_values[":avatarUrl"] = avatar_url
    if social_links is not None:
        update_parts.append("socialLinks = :socialLinks")
        expr_values[":socialLinks"] = social_links

    _get_table().update_item(
        Key={"PK": f"USER#{sub}", "SK": "USER"},
        UpdateExpression="SET " + ", ".join(update_parts),
        ExpressionAttributeValues=expr_values,
    )


def set_profile_published(sub: str) -> None:
    """Mark the user's profile as published."""
    now = datetime.now(timezone.utc).isoformat()
    _get_table().update_item(
        Key={"PK": f"USER#{sub}", "SK": "USER"},
        UpdateExpression="SET profilePublished = :t, updatedAt = :now",
        ExpressionAttributeValues={":t": True, ":now": now},
    )


def delete_user(sub: str) -> None:
    """Delete a user's record. Caller is responsible for deleting their
    articles and S3 content first."""
    _get_table().delete_item(Key={"PK": f"USER#{sub}", "SK": "USER"})
