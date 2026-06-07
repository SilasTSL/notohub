import base64
import json
import urllib.request
import urllib.error
from urllib.parse import urlencode

from lib.config import config
from lib.cognito import get_verified_user
from lib.users import put_user
from lib.dynamodb import save_notion_token
from lib.response import ok, bad_request, unauthorized, server_error, redirect


def handle_register(event: dict) -> dict:
    """
    POST /auth/register

    Creates (or verifies) the DynamoDB user record for the caller.
    Email and username are read from the verified JWT — no request body needed.
    Idempotent: safe to call on every sign-in, not just at confirmation time.
    """
    try:
        user_info = get_verified_user(event)
    except ValueError as exc:
        return unauthorized(str(exc))

    try:
        put_user(user_info["sub"], user_info["email"], user_info["username"])
    except Exception as exc:
        return server_error(exc)

    return ok({"message": "User registered"}, status_code=201)


def handle_notion_connect(event: dict) -> dict:
    """
    GET /auth/notion/connect

    Returns the Notion OAuth authorization URL. The caller's Cognito sub is
    embedded in the state parameter so the callback can identify the user.
    """
    try:
        user_info = get_verified_user(event)
    except ValueError as exc:
        return unauthorized(str(exc))

    params = urlencode({
        "client_id": config.notion_client_id,
        "response_type": "code",
        "owner": "user",
        "redirect_uri": config.notion_redirect_uri,
        "state": user_info["sub"],
    })
    return ok({"url": f"https://api.notion.com/v1/oauth/authorize?{params}"})


def handle_notion_callback(event: dict) -> dict:
    """
    GET /auth/notion/callback

    Exchanges the authorization code for an access token, stores it in
    DynamoDB, then redirects the browser to the frontend onboarding page.
    No JWT auth — this endpoint is hit by a browser redirect from Notion.
    """
    qs = event.get("queryStringParameters") or {}
    code = qs.get("code", "")
    user_sub = qs.get("state", "")

    if not code or not user_sub:
        return bad_request("Missing code or state parameter")

    try:
        access_token = _exchange_notion_code(code)
    except Exception as exc:
        return server_error(exc)

    try:
        save_notion_token(user_sub, access_token)
    except Exception as exc:
        return server_error(exc)

    return redirect(f"{config.allowed_origin}/onboarding?notion=connected")


def _exchange_notion_code(code: str) -> str:
    """Exchange a Notion authorization code for an OAuth access token."""
    credentials = base64.b64encode(
        f"{config.notion_client_id}:{config.notion_client_secret}".encode()
    ).decode()
    payload = json.dumps({
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": config.notion_redirect_uri,
    }).encode()
    req = urllib.request.Request(
        "https://api.notion.com/v1/oauth/token",
        data=payload,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    return data["access_token"]
