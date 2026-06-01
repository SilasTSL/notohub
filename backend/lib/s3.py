import boto3

from lib.config import config

# ─── Singleton ───────────────────────────────────────────────────────────────

_s3_client = None


def _get_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client("s3", region_name=config.aws_region)
    return _s3_client


# ─── Helpers ─────────────────────────────────────────────────────────────────

def article_s3_key(article_id: str) -> str:
    return f"{config.s3_content_prefix}{article_id}.html"


# ─── Public API ──────────────────────────────────────────────────────────────

def put_article_html(article_id: str, html: str) -> str:
    """Store rendered HTML in S3. Returns the S3 key."""
    key = article_s3_key(article_id)
    _get_client().put_object(
        Bucket=config.s3_bucket_name,
        Key=key,
        Body=html.encode("utf-8"),
        ContentType="text/html; charset=utf-8",
        CacheControl="public, max-age=3600",
    )
    return key


def get_article_html(s3_key: str) -> str | None:
    """Fetch rendered HTML from S3. Returns None if the object doesn't exist."""
    try:
        response = _get_client().get_object(
            Bucket=config.s3_bucket_name,
            Key=s3_key,
        )
        return response["Body"].read().decode("utf-8")
    except _get_client().exceptions.NoSuchKey:
        return None
    except Exception as exc:
        # ClientError with code NoSuchKey also surfaces this way
        code = getattr(getattr(exc, "response", {}).get("Error", {}), "get", lambda k, d=None: d)("Code")
        if code == "NoSuchKey":
            return None
        raise
