from flask import Blueprint, current_app, jsonify, request, session

from app.services.auth import AuthError, confirm_user, forgot_password, login_user, register_user
from app.services.auth import validate_registration_payload
from app.services.email import build_confirmation_link

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/auth/register")
def register_user_route():
    payload = request.get_json(silent=True) or {}
    cleaned, errors = validate_registration_payload(payload)
    if errors:
        return jsonify({"message": "Invalid registration data", "errors": errors}), 400

    try:
        result = register_user(payload)
    except AuthError as e:
        return jsonify({"message": e.message}), e.status

    if result.get("email_error"):
        confirmation_link = build_confirmation_link(result["token"])
        current_app.logger.warning("Failed to send confirmation email: %s", result["email_error"])
        current_app.logger.info("Confirmation link for %s: %s", result["email"], confirmation_link)

    return jsonify({
        "message": "Registration successful. Check your email to confirm your account.",
        "data":    {"userId": result["userId"]},
    }), 201


@auth_bp.get("/auth/confirm/<token>")
def confirm_user_route(token):
    try:
        outcome = confirm_user(token)
    except AuthError as e:
        return jsonify({"message": e.message}), e.status

    return jsonify({"message": "Account confirmed successfully." if outcome == "confirmed" else "Account already active."}), 200


@auth_bp.post("/auth/login")
def login_user_route():
    payload   = request.get_json(silent=True) or {}
    email_raw = (payload.get("email")    or "").strip()
    password  = (payload.get("password") or "")

    try:
        data = login_user(email_raw, password)
    except AuthError as e:
        return jsonify({"message": e.message}), e.status

    session["userId"] = data["userId"]
    session["role"]   = data["role"]

    return jsonify({"message": "Login successful.", "data": data}), 200


@auth_bp.post("/auth/logout")
def logout_user():
    session.clear()
    return jsonify({"message": "Logged out successfully."}), 200


@auth_bp.post("/auth/forgot-password")
def forgot_password_route():
    payload   = request.get_json(silent=True) or {}
    email_raw = (payload.get("email") or "").strip()

    try:
        result = forgot_password(email_raw)
    except AuthError as e:
        return jsonify({"message": e.message}), e.status

    if result["sent"]:
        current_app.logger.info("Password reset link for %s: %s", result["email"], result["reset_link"])
        if result.get("email_error"):
            current_app.logger.warning("Failed to send reset email: %s", result["email_error"])

    return jsonify({"message": "If an account exists, a reset link has been sent."}), 200
