import json
from decimal import Decimal
from typing import Any

from lib.config import config


def _cors_headers() -> dict[str, str]:
    return {
        "Access-Control-Allow-Origin": config.allowed_origin,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    }


class _DecimalEncoder(json.JSONEncoder):
    """boto3 returns DynamoDB numbers as Decimal; coerce them to float."""

    def default(self, o: Any) -> Any:
        if isinstance(o, Decimal):
            return float(o)
        return super().default(o)


def _json(body: Any) -> str:
    return json.dumps(body, cls=_DecimalEncoder)


def ok(data: Any, status_code: int = 200) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", **_cors_headers()},
        "body": _json({"success": True, "data": data}),
    }


def not_found(message: str = "Not found") -> dict:
    return {
        "statusCode": 404,
        "headers": {"Content-Type": "application/json", **_cors_headers()},
        "body": _json({"success": False, "error": message}),
    }


def server_error(exc: Exception) -> dict:
    print(f"[ERROR] {exc}", flush=True)
    return {
        "statusCode": 500,
        "headers": {"Content-Type": "application/json", **_cors_headers()},
        "body": _json({"success": False, "error": str(exc)}),
    }


def no_content() -> dict:
    return {"statusCode": 204, "headers": _cors_headers(), "body": ""}


def unauthorized(message: str = "Unauthorized") -> dict:
    return {
        "statusCode": 401,
        "headers": {"Content-Type": "application/json", **_cors_headers()},
        "body": _json({"success": False, "error": message}),
    }


def bad_request(message: str) -> dict:
    return {
        "statusCode": 400,
        "headers": {"Content-Type": "application/json", **_cors_headers()},
        "body": _json({"success": False, "error": message}),
    }


def method_not_allowed() -> dict:
    return {
        "statusCode": 405,
        "headers": {"Content-Type": "application/json", **_cors_headers()},
        "body": _json({"success": False, "error": "Method not allowed"}),
    }
