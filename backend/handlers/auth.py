import json

from lib.cognito import get_verified_user
from lib.users import put_user
from lib.response import ok, bad_request, unauthorized, server_error


def handle_register(event: dict) -> dict:
    """
    POST /auth/register

    Creates a DynamoDB user record for a newly confirmed Cognito user.
    Must be called with a valid Cognito ID token so the stable sub (UUID)
    can be extracted from the JWT without an extra Cognito API call.

    Idempotent — calling it twice for the same user is safe.
    """
    try:
        user_info = get_verified_user(event)
    except ValueError as exc:
        return unauthorized(str(exc))

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return bad_request("Request body must be valid JSON")

    email = (body.get("email") or "").strip()
    username = (body.get("username") or "").strip()

    if not email:
        return bad_request("email is required")
    if not username:
        return bad_request("username is required")

    try:
        put_user(user_info["sub"], email, username)
    except Exception as exc:
        return server_error(exc)

    return ok({"message": "User registered"}, status_code=201)
