from flask import Blueprint, jsonify, request, session

from app.db import get_users_collection
from app.services.admin import AdminError, create_movie, create_promotion, create_showtime, list_showrooms

admin_bp = Blueprint("admin", __name__)


def _require_admin():
    if session.get("role") == "admin":
        return None

    x_email = request.headers.get("X-User-Email", "").strip()
    if x_email:
        user = get_users_collection().find_one(
            {"emailLower": x_email.lower()}, {"role": 1}
        )
        if user and user.get("role") == "admin":
            return None

    return jsonify({"message": "Admin access required."}), 403


@admin_bp.post("/admin/movies")
def admin_create_movie():
    err = _require_admin()
    if err:
        return err

    payload = request.get_json(silent=True) or {}
    try:
        data = create_movie(payload)
    except AdminError as e:
        return jsonify({"message": e.message}), e.status

    return jsonify({
        "message": "Movie created successfully.",
        "data":    {"id": data["id"], "title": data["title"]},
    }), 201


@admin_bp.get("/admin/showrooms")
def admin_list_showrooms():
    err = _require_admin()
    if err:
        return err

    return jsonify({"data": list_showrooms()}), 200


@admin_bp.post("/admin/showtimes")
def admin_create_showtime():
    err = _require_admin()
    if err:
        return err

    payload = request.get_json(silent=True) or {}
    try:
        data = create_showtime(payload)
    except AdminError as e:
        return jsonify({"message": e.message}), e.status

    return jsonify({
        "message": "Showtime scheduled successfully.",
        "data":    {"id": data["id"]},
    }), 201


@admin_bp.post("/admin/promotions")
def admin_create_promotion():
    err = _require_admin()
    if err:
        return err

    payload = request.get_json(silent=True) or {}
    try:
        data = create_promotion(payload)
    except AdminError as e:
        return jsonify({"message": e.message}), e.status

    return jsonify({
        "message": "Promotion created successfully.",
        "data":    data,
    }), 201
