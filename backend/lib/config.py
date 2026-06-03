import os


def _required(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise EnvironmentError(f"Missing required environment variable: {key}")
    return value


class Config:
    notion_api_key: str = ""
    dynamodb_table_name: str = ""
    s3_bucket_name: str = ""
    s3_content_prefix: str = ""
    aws_region: str = ""
    allowed_origin: str = ""

    def __init__(self) -> None:
        self.notion_api_key = _required("NOTION_API_KEY")
        self.dynamodb_table_name = _required("DYNAMODB_TABLE_NAME")
        self.s3_bucket_name = _required("S3_BUCKET_NAME")
        self.s3_content_prefix = os.environ.get("S3_CONTENT_PREFIX", "articles/")
        self.aws_region = os.environ.get("AWS_REGION", "ap-southeast-1")
        self.allowed_origin = os.environ.get("ALLOWED_ORIGIN", "*")


# Instantiated lazily at first import so Lambda init is fast during packaging
config = Config()
