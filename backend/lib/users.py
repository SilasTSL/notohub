from __future__ import annotations

from datetime import datetime, timezone

from botocore.exceptions import ClientError

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
