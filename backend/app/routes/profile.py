from typing import Any, Dict, Optional

from flask import Blueprint, jsonify, request

from app.services.email import send_profile_update_email
from app.services.profile import ProfileError, add_favorite, get_current_user, get_profile, remove_favorite, update_profile

profile_bp = Blueprint("profile", __name__)


def _get_current_user() -> Optional[Dict[str, Any]]:
    return get_current_user(request.headers.get("X-User-Email", "").strip())


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
