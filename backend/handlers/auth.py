from lib.cognito import get_verified_user
from lib.users import put_user
from lib.response import ok, unauthorized, server_error


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
