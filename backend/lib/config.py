import os


def _required(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise EnvironmentError(f"Missing required environment variable: {key}")
    return value


class Config:
    notion_api_key: str = ""
    public_api_url: str = ""
    notion_client_id: str = ""
    notion_client_secret: str = ""
    notion_redirect_uri: str = ""
    dynamodb_table_name: str = ""
    s3_bucket_name: str = ""
    s3_bucket_region: str = ""
    s3_content_prefix: str = ""
    aws_region: str = ""
    allowed_origin: str = ""
    cognito_user_pool_id: str = ""
    cognito_app_client_id: str = ""
    cognito_region: str = ""

    def __init__(self) -> None:
        # Notion legacy shared key — only used by the /v1/article legacy routes
        self.notion_api_key = os.environ.get("NOTION_API_KEY", "")

        # Notion OAuth public integration credentials
        self.notion_client_id = os.environ.get("NOTION_CLIENT_ID", "")
        self.notion_client_secret = os.environ.get("NOTION_CLIENT_SECRET", "")
        self.notion_redirect_uri = os.environ.get(
            "NOTION_REDIRECT_URI", "http://localhost:8000/auth/notion/callback"
        )

        self.dynamodb_table_name = _required("DYNAMODB_TABLE_NAME")
        self.s3_bucket_name = _required("S3_BUCKET_NAME")
        self.aws_region = os.environ.get("AWS_REGION", "ap-southeast-1")
        # The content bucket (www.notohub.com) lives in us-east-1, independent of
        # AWS_REGION — the S3 client must be signed for the bucket's own region or
        # presigned URLs (which can't transparently follow a redirect) will 301.
        self.s3_bucket_region = os.environ.get("S3_BUCKET_REGION", "us-east-1")
        self.s3_content_prefix = os.environ.get("S3_CONTENT_PREFIX", "articles/")
        self.allowed_origin = os.environ.get("ALLOWED_ORIGIN", "*")
        self.public_api_url = os.environ.get("PUBLIC_API_URL", "http://localhost:8000")

        # Cognito — optional so existing routes keep working if not yet set;
        # lib/cognito.py raises a clear EnvironmentError at call time if missing.
        self.cognito_user_pool_id = os.environ.get("COGNITO_USER_POOL_ID", "")
        self.cognito_app_client_id = os.environ.get("COGNITO_APP_CLIENT_ID", "")
        self.cognito_region = os.environ.get("COGNITO_REGION", self.aws_region)


# Instantiated lazily at first import so Lambda init is fast during packaging
config = Config()
