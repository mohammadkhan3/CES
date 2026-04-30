import os
import re
from datetime import datetime, timedelta

from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.db import get_users_collection
from app.security import hash_password, verify_password
from app.services.email import build_confirmation_link, send_confirmation_email, send_password_reset_email

_EMAIL_REGEX = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
_PASSWORD_COMPLEXITY = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,}$")
_CONFIRMATION_SALT = "user-confirmation"


class AuthError(Exception):
    def __init__(self, message: str, status: int = 400):
        self.message = message
        self.status = status
        super().__init__(message)


def _get_serializer() -> URLSafeTimedSerializer:
    secret_key = current_app.config.get("SECRET_KEY")
    if not secret_key:
        raise RuntimeError("SECRET_KEY must be configured before using auth routes")
    return URLSafeTimedSerializer(secret_key)


def _confirmation_ttl_hours() -> int:
    return int(os.getenv("EMAIL_CONFIRM_TTL_HOURS", "24"))


def validate_registration_payload(payload: dict) -> tuple:
    errors = {}

    first_name = (payload.get("firstName") or "").strip()
    last_name = (payload.get("lastName") or "").strip()
    email_raw = (payload.get("email") or "").strip()
    password = payload.get("password") or ""

    if not first_name:
        errors["firstName"] = "First name is required."
    if not last_name:
        errors["lastName"] = "Last name is required."
    if not email_raw or not _EMAIL_REGEX.match(email_raw):
        errors["email"] = "A valid email address is required."
    if not password or not _PASSWORD_COMPLEXITY.match(password):
        errors["password"] = "Password must be at least 8 characters and include letters and numbers."

    cleaned = {
        "firstName":  first_name,
        "lastName":   last_name,
        "emailRaw":   email_raw,
        "emailLower": email_raw.lower(),
        "password":   password,
    }
    return cleaned, errors


def register_user(payload: dict) -> dict:
    cleaned, errors = validate_registration_payload(payload)
    if errors:
        raise AuthError("Invalid registration data", 400)

    users = get_users_collection()
    if users.find_one({"emailLower": cleaned["emailLower"]}):
        raise AuthError("An account with this email already exists.", 409)

    serializer = _get_serializer()
    now = datetime.utcnow()
    token = serializer.dumps(cleaned["emailLower"], salt=_CONFIRMATION_SALT)
    expires_at = now + timedelta(hours=_confirmation_ttl_hours())

    user_doc = {
        "firstName":              cleaned["firstName"],
        "lastName":               cleaned["lastName"],
        "email":                  cleaned["emailRaw"],
        "emailLower":             cleaned["emailLower"],
        "password":               hash_password(cleaned["password"]),
        "status":                 "INACTIVE",
        "role":                   "customer",
        "confirmationToken":      token,
        "confirmationExpiresAt":  expires_at,
        "createdAt":              now,
        "updatedAt":              now,
    }

    result = users.insert_one(user_doc)

    email_error = None
    try:
        send_confirmation_email(cleaned["emailRaw"], token)
    except Exception as exc:
        email_error = exc

    return {
        "userId":      str(result.inserted_id),
        "email":       cleaned["emailRaw"],
        "token":       token,
        "email_error": email_error,
    }


def confirm_user(token: str) -> str:
    serializer = _get_serializer()
    max_age_seconds = _confirmation_ttl_hours() * 3600

    try:
        email_lower = serializer.loads(token, salt=_CONFIRMATION_SALT, max_age=max_age_seconds)
    except SignatureExpired:
        raise AuthError("Confirmation link has expired.")
    except BadSignature:
        raise AuthError("Invalid confirmation token.")

    users = get_users_collection()
    user = users.find_one({"emailLower": email_lower})

    if not user:
        raise AuthError("User not found.", 404)

    if user.get("status") == "ACTIVE":
        return "already_active"

    stored_token = user.get("confirmationToken")
    if not stored_token or stored_token != token:
        raise AuthError("Confirmation token does not match.")

    expires_at = user.get("confirmationExpiresAt")
    if expires_at and expires_at < datetime.utcnow():
        raise AuthError("Confirmation link has expired.")

    users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "status":                "ACTIVE",
                "confirmationToken":     None,
                "confirmationExpiresAt": None,
                "updatedAt":             datetime.utcnow(),
            }
        },
    )

    return "confirmed"


def login_user(email_raw: str, password: str) -> dict:
    if not email_raw or not password:
        raise AuthError("Email and password are required.")

    users = get_users_collection()
    user = users.find_one({"emailLower": email_raw.lower()})

    if not user or not verify_password(password, user["password"]):
        raise AuthError("Invalid email or password.", 401)

    if user.get("status") != "ACTIVE":
        raise AuthError("Please confirm your email before logging in.", 403)

    return {
        "userId":    str(user["_id"]),
        "firstName": user["firstName"],
        "lastName":  user["lastName"],
        "email":     user["email"],
        "role":      user.get("role", "customer"),
    }


def forgot_password(email_raw: str) -> dict:
    if not email_raw:
        raise AuthError("Email is required.")

    users = get_users_collection()
    user = users.find_one({"emailLower": email_raw.lower()})

    if not user:
        return {"sent": False}

    serializer = _get_serializer()
    token = serializer.dumps(email_raw.lower(), salt="password-reset")
    reset_link = f"{os.getenv('APP_BASE_URL', 'http://localhost:3000')}/reset-password?token={token}"

    email_error = None
    try:
        send_password_reset_email(email_raw, reset_link)
    except Exception as exc:
        email_error = exc

    return {"sent": True, "reset_link": reset_link, "email": email_raw, "email_error": email_error}


def reset_password(token: str, new_password: str) -> None:
    if not token:
        raise AuthError("Reset token is required.")
    if not new_password:
        raise AuthError("New password is required.")
    if not _PASSWORD_COMPLEXITY.match(new_password):
        raise AuthError("Password must be at least 8 characters and include a letter and a number.")

    serializer = _get_serializer()
    try:
        email = serializer.loads(token, salt="password-reset", max_age=3600)
    except SignatureExpired:
        raise AuthError("Reset link has expired. Please request a new one.", 400)
    except BadSignature:
        raise AuthError("Invalid reset link.", 400)

    users = get_users_collection()
    user = users.find_one({"emailLower": email.lower()})
    if not user:
        raise AuthError("Invalid reset link.", 400)

    users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": hash_password(new_password)}},
    )
