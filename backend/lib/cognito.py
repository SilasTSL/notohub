from __future__ import annotations

from typing import Any

import jwt
from jwt import PyJWKClient

from lib.config import config

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        if not config.cognito_user_pool_id:
            raise EnvironmentError(
                "COGNITO_USER_POOL_ID is not set — add it to your .env"
            )
        url = (
            f"https://cognito-idp.{config.cognito_region}"
            f".amazonaws.com/{config.cognito_user_pool_id}"
            f"/.well-known/jwks.json"
        )
        _jwks_client = PyJWKClient(url, cache_jwk_set=True, lifespan=300)
    return _jwks_client


def verify_token(token: str) -> dict[str, Any]:
    """Verify a Cognito ID token and return its decoded payload."""
    if not config.cognito_app_client_id:
        raise EnvironmentError(
            "COGNITO_APP_CLIENT_ID is not set — add it to your .env"
        )
    client = _get_jwks_client()
    signing_key = client.get_signing_key_from_jwt(token)
    payload: dict[str, Any] = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=config.cognito_app_client_id,
    )
    if payload.get("token_use") != "id":
        raise jwt.InvalidTokenError("Expected an ID token, got access token")
    return payload


def get_verified_user(event: dict) -> dict[str, str]:
    """
    Extract the Bearer token from the Lambda event's Authorization header,
    verify it against Cognito's JWKS, and return the caller's identity.

    Returns {"sub", "email", "username"}.
    Raises ValueError with a human-readable message on any auth failure.
    """
    headers: dict = event.get("headers") or {}
    # API Gateway normalises header names to lowercase
    auth_header: str = (
        headers.get("authorization")
        or headers.get("Authorization")
        or ""
    )
    if not auth_header.lower().startswith("bearer "):
        raise ValueError("Missing or invalid Authorization header")

    token = auth_header[7:].strip()
    try:
        payload = verify_token(token)
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired — please sign in again")
    except (jwt.InvalidTokenError, Exception) as exc:
        raise ValueError(f"Invalid token: {exc}")

    return {
        "sub": payload["sub"],
        "email": payload.get("email", ""),
        "username": payload.get("custom:username", ""),
    }
