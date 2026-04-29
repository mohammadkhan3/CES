from typing import Any, Dict, Optional

from flask import Blueprint, jsonify, request

from app.db import get_users_collection
from app.services.email import send_profile_update_email
from app.services.profile import ProfileError, add_favorite, get_profile, remove_favorite, update_profile

profile_bp = Blueprint("profile", __name__)


def _get_current_user() -> Optional[Dict[str, Any]]:
    """
    Demo-friendly current-user lookup since auth/login is not fully wired yet.
    Priority:
    1. X-User-Email header
    2. first ACTIVE customer
    3. first customer
    """
    users = get_users_collection()

    x_user_email = request.headers.get("X-User-Email", "").strip()
    if x_user_email:
        user = users.find_one({"emailLower": x_user_email.lower()})
        if user:
            return user

        user = users.find_one({"email": x_user_email})
        if user:
            return user

    user = users.find_one({"role": "customer", "status": "ACTIVE"})
    if user:
        return user

    return users.find_one({"role": "customer"})


@profile_bp.get("/profile")
def get_profile_route():
    user = _get_current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify(get_profile(user)), 200


@profile_bp.put("/profile")
def update_profile_route():
    user = _get_current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    data = request.get_json(silent=True) or {}
    try:
        update_profile(user, data)
    except ProfileError as e:
        return jsonify({"message": e.message}), e.status

    try:
        send_profile_update_email(str(user.get("email", "")).strip())
    except Exception:
        pass

    return jsonify({"message": "Profile updated successfully."}), 200


@profile_bp.post("/profile/favorites/<movie_id>")
def add_favorite_route(movie_id: str):
    user = _get_current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    try:
        add_favorite(user, movie_id)
    except ProfileError as e:
        return jsonify({"message": e.message}), e.status

    return jsonify({"message": "Movie added to favorites."}), 200


@profile_bp.delete("/profile/favorites/<movie_id>")
def remove_favorite_route(movie_id: str):
    user = _get_current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    try:
        remove_favorite(user, movie_id)
    except ProfileError as e:
        return jsonify({"message": e.message}), e.status

    return jsonify({"message": "Movie removed from favorites."}), 200
