import os
import re
from datetime import datetime, timedelta
from flask import Blueprint, current_app, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.db import get_users_collection
from app.security import hash_password
from app.services.email import build_confirmation_link, send_confirmation_email

auth_bp = Blueprint("auth", __name__)

_EMAIL_REGEX = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
_PASSWORD_COMPLEXITY = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,}$")
_CONFIRMATION_SALT = "user-confirmation"


def _get_serializer() -> URLSafeTimedSerializer:
    secret_key = current_app.config.get("SECRET_KEY")
    if not secret_key:
        raise RuntimeError("SECRET_KEY must be configured before using auth routes")
    return URLSafeTimedSerializer(secret_key)


def _validate_payload(payload):
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
        "firstName": first_name,
        "lastName": last_name,
        "emailRaw": email_raw,
        "emailLower": email_raw.lower(),
        "password": password,
    }
    return cleaned, errors


def _confirmation_ttl_hours() -> int:
    return int(os.getenv("EMAIL_CONFIRM_TTL_HOURS", "24"))


@auth_bp.post("/auth/register")
def register_user():
    payload = request.get_json(silent=True) or {}
    cleaned, errors = _validate_payload(payload)

    if errors:
        return jsonify({"message": "Invalid registration data", "errors": errors}), 400

    users = get_users_collection()

    if users.find_one({"emailLower": cleaned["emailLower"]}):
        return jsonify({"message": "An account with this email already exists."}), 409

    serializer = _get_serializer()
    now = datetime.utcnow()
    token = serializer.dumps(cleaned["emailLower"], salt=_CONFIRMATION_SALT)
    expires_at = now + timedelta(hours=_confirmation_ttl_hours())

    user_doc = {
        "firstName": cleaned["firstName"],
        "lastName": cleaned["lastName"],
        "email": cleaned["emailRaw"],
        "emailLower": cleaned["emailLower"],
        "password": hash_password(cleaned["password"]),
        "status": "INACTIVE",
        "role": "customer",
        "confirmationToken": token,
        "confirmationExpiresAt": expires_at,
        "createdAt": now,
        "updatedAt": now,
    }

    result = users.insert_one(user_doc)

    try:
        send_confirmation_email(cleaned["emailRaw"], token)
    except Exception as exc:
        confirmation_link = build_confirmation_link(token)
        current_app.logger.warning("Failed to send confirmation email: %s", exc)
        current_app.logger.info("Confirmation link for %s: %s", cleaned["emailRaw"], confirmation_link)

    return (
        jsonify({
            "message": "Registration successful. Check your email to confirm your account.",
            "data": {"userId": str(result.inserted_id)},
        }),
        201,
    )


@auth_bp.get("/auth/confirm/<token>")
def confirm_user(token):
    serializer = _get_serializer()
    max_age_seconds = _confirmation_ttl_hours() * 3600

    try:
        email_lower = serializer.loads(token, salt=_CONFIRMATION_SALT, max_age=max_age_seconds)
    except SignatureExpired:
        return jsonify({"message": "Confirmation link has expired."}), 400
    except BadSignature:
        return jsonify({"message": "Invalid confirmation token."}), 400

    users = get_users_collection()
    user = users.find_one({"emailLower": email_lower})

    if not user:
        return jsonify({"message": "User not found."}), 404

    if user.get("status") == "ACTIVE":
        return jsonify({"message": "Account already active."}), 200

    stored_token = user.get("confirmationToken")
    if not stored_token or stored_token != token:
        return jsonify({"message": "Confirmation token does not match."}), 400

    expires_at = user.get("confirmationExpiresAt")
    if expires_at and expires_at < datetime.utcnow():
        return jsonify({"message": "Confirmation link has expired."}), 400

    users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "status": "ACTIVE",
                "confirmationToken": None,
                "confirmationExpiresAt": None,
                "updatedAt": datetime.utcnow(),
            }
        },
    )

    return jsonify({"message": "Account confirmed successfully."}), 200
