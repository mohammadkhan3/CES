from flask import Blueprint, jsonify, request

from app.services.history_ai import HistoryError, get_ai_recommendations, get_order_history

history_ai_bp = Blueprint("history_ai", __name__, url_prefix="/api")


@history_ai_bp.get("/orders/history")
def get_order_history_route():
    user_email = request.headers.get("X-User-Email", "").strip()
    try:
        orders = get_order_history(user_email)
    except HistoryError as e:
        return jsonify({"success": False, "message": e.message}), e.status
    return jsonify({"success": True, "orders": orders}), 200


@history_ai_bp.post("/recommendations")
def get_ai_recommendations_route():
    user_email = request.headers.get("X-User-Email", "").strip()
    try:
        result = get_ai_recommendations(user_email)
    except HistoryError as e:
        return jsonify({"success": False, "message": e.message}), e.status

    return jsonify({
        "success":      True,
        "source":       result["source"],
        "basedOn": {
            "watchedTitles": result["watchedTitles"],
            "watchedGenres": result["watchedGenres"],
        },
        "recommendations": result["recommendations"],
    }), 200
