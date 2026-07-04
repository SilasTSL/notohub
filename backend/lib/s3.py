from __future__ import annotations

import re

import boto3
from botocore.exceptions import ClientError

from lib.config import config

# ─── Singleton ───────────────────────────────────────────────────────────────

_s3_client = None


def _get_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client("s3", region_name=config.s3_bucket_region)
    return _s3_client


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _slugify(value: str) -> str:
    """Lowercase and replace any non-alphanumeric run with a hyphen."""
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def article_s3_key(username: str, slug: str) -> str:
    """
    Build the S3 object key for a hosted article page.

    The key follows the pattern:
        {username}/{slug}/index.html

    This means the article is served at:
        https://<your-domain>/{username}/{slug}/

    Args:
        username: Author identifier (will be slugified, e.g. "John Doe" → "john-doe").
        slug:     Article slug (already slugified, e.g. "my-first-article").
    """
    return f"{_slugify(username)}/{slug}/index.html"


# ─── Public API ──────────────────────────────────────────────────────────────

def put_article_html(username: str, slug: str, html: str) -> str:
    """
    Upload rendered article HTML to S3 for static website hosting.

    Stores the file at:
        s3://<bucket>/{username}/{slug}/index.html

    Args:
        username: Author identifier used as the first path segment.
        slug:     Article slug used as the second path segment.
        html:     Rendered HTML content to upload.

    Returns:
        The S3 object key (e.g. "john-doe/my-first-article/index.html").
    """
    key = article_s3_key(username, slug)

    _get_client().put_object(
        Bucket=config.s3_bucket_name,
        Key=key,
        Body=html.encode("utf-8"),
        ContentType="text/html; charset=utf-8",
        CacheControl="public, max-age=3600",
    )

    return key


def get_article_html(s3_key: str) -> str | None:
    """
    Fetch rendered HTML for an article from S3.

    Args:
        s3_key: The full S3 object key (as returned by put_article_html).

    Returns:
        The HTML string, or None if the object does not exist.
    """
    try:
        response = _get_client().get_object(
            Bucket=config.s3_bucket_name,
            Key=s3_key,
        )
        return response["Body"].read().decode("utf-8")
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "NoSuchKey":
            return None
        raise


def delete_article_html(s3_key: str) -> None:
    """Delete an article's HTML object from S3 (e.g. when unpublishing)."""
    _get_client().delete_object(
        Bucket=config.s3_bucket_name,
        Key=s3_key,
    )


_CONTENT_TYPE_TO_EXT: dict[str, str] = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

ALLOWED_AVATAR_CONTENT_TYPES = frozenset(_CONTENT_TYPE_TO_EXT)

_IMAGE_CONTENT_TYPE_TO_EXT: dict[str, str] = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
}


def put_article_image(
    username: str,
    slug: str,
    block_id: str,
    image_data: bytes,
    content_type: str,
) -> str:
    """
    Upload an article inline image to S3 and return its public URL.

    Stores at: s3://<bucket>/{username}/{slug}/images/{block_id}.{ext}
    Re-publishing overwrites the same key (deterministic, no orphans).
    """
    ext = _IMAGE_CONTENT_TYPE_TO_EXT.get(content_type, "jpg")
    clean_id = block_id.replace("-", "")
    key = f"{_slugify(username)}/{slug}/images/{clean_id}.{ext}"

    _get_client().put_object(
        Bucket=config.s3_bucket_name,
        Key=key,
        Body=image_data,
        ContentType=content_type,
        CacheControl="public, max-age=31536000",
    )

    return f"https://{config.s3_bucket_name}/{key}"


def generate_presigned_put_url(username: str, content_type: str) -> tuple[str, str]:
    """
    Generate a pre-signed PUT URL for direct avatar upload from the browser.

    Returns (upload_url, public_url) where public_url is the final URL after
    the client completes the upload.
    """
    ext = _CONTENT_TYPE_TO_EXT[content_type]
    key = f"{username}/avatar.{ext}"
    upload_url: str = _get_client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": config.s3_bucket_name,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=300,
    )
    public_url = f"https://{config.s3_bucket_name}/{key}"
    return upload_url, public_url


def put_profile_html(username: str, html: str) -> str:
    """Upload profile index HTML to S3 at {username}/index.html."""
    key = f"{username}/index.html"
    _get_client().put_object(
        Bucket=config.s3_bucket_name,
        Key=key,
        Body=html.encode("utf-8"),
        ContentType="text/html; charset=utf-8",
        CacheControl="public, max-age=300",
    )
    return key
