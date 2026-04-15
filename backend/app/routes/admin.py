import re

from bson import ObjectId
from flask import Blueprint, jsonify, request, session

from app.db import (
    get_movies_collection,
    get_promotions_collection,
    get_showrooms_collection,
    get_shows_collection,
    get_users_collection,
)
from app.services.email import send_promotion_email

admin_bp = Blueprint("admin", __name__)

_VALID_RATINGS = {"G", "PG", "PG-13", "R", "NC-17"}
_VALID_STATUSES = {"currently_running", "coming_soon"}


def _require_admin():
    """
    Returns a 403 error tuple if the caller is not an admin, else None.

    Checks in order:
      1. Flask session (set on login)
      2. X-User-Email header fallback (consistent with booking.py pattern)
    """
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


# ── Movies ─────────────────────────────────────────────────────────────────

@admin_bp.post("/admin/movies")
def admin_create_movie():
    """
    Create a new movie in the database.

    Required fields: title, rating, genre, description, trailerLink, posterUrl
    Optional fields: status (defaults to 'currently_running'), cast, director, producer, releaseDate
    Returns 409 if a movie with the same title already exists.
    """
    err = _require_admin()
    if err:
        return err

    payload = request.get_json(silent=True) or {}

    title       = (payload.get("title")       or "").strip()
    rating      = (payload.get("rating")      or "").strip()
    genre       = (payload.get("genre")       or "").strip()
    description = (payload.get("description") or "").strip()
    trailer_url = (payload.get("trailerLink") or payload.get("trailer_url") or "").strip()
    poster_url  = (payload.get("posterUrl")   or payload.get("poster_url")  or "").strip()
    status      = (payload.get("status")      or "currently_running").strip()

    errors = {}
    if not title:
        errors["title"] = "Title is required."
    if not rating or rating not in _VALID_RATINGS:
        errors["rating"] = f"Rating must be one of: {', '.join(sorted(_VALID_RATINGS))}."
    if not genre:
        errors["genre"] = "Genre is required."
    if not description:
        errors["description"] = "Description is required."
    if not trailer_url:
        errors["trailerLink"] = "Trailer link is required."
    if not poster_url:
        errors["posterUrl"] = "Poster URL is required."
    if status not in _VALID_STATUSES:
        errors["status"] = f"Status must be one of: {', '.join(_VALID_STATUSES)}."

    if errors:
        return jsonify({"message": "Validation failed.", "errors": errors}), 400

    movies = get_movies_collection()
    if movies.find_one({"title": {"$regex": f"^{re.escape(title)}$", "$options": "i"}}):
        return jsonify({"message": f"A movie titled '{title}' already exists."}), 409

    movie_doc = {
        "title":       title,
        "genre":       genre,
        "status":      status,
        "description": description,
        "rating":      rating,
        "ratingCode":  rating,
        "poster_url":  poster_url,
        "trailer_url": trailer_url,
        "category":    genre,
        "cast":        (payload.get("cast")        or "").strip(),
        "director":    (payload.get("director")    or "").strip(),
        "producer":    (payload.get("producer")    or "").strip(),
        "synopsis":    description,
        "releaseDate": (payload.get("releaseDate") or "").strip(),
    }

    result = movies.insert_one(movie_doc)

    return jsonify({
        "message": "Movie created successfully.",
        "data": {"id": str(result.inserted_id), "title": title},
    }), 201


# ── Showrooms ───────────────────────────────────────────────────────────────

@admin_bp.get("/admin/showrooms")
def admin_list_showrooms():
    """
    Return all showrooms so the admin scheduling form can build a real dropdown
    with actual MongoDB ObjectIds instead of hardcoded placeholders.
    """
    err = _require_admin()
    if err:
        return err

    cursor = get_showrooms_collection().find({})
    result = [
        {
            "id":            str(doc["_id"]),
            "name":          doc.get("name", ""),
            "numberOfSeats": doc.get("numberOfSeats", 0),
        }
        for doc in cursor
    ]
    return jsonify({"data": result}), 200


# ── Showtimes ───────────────────────────────────────────────────────────────

@admin_bp.post("/admin/showtimes")
def admin_create_showtime():
    """
    Schedule a showtime for a movie in a showroom.

    Conflict rule: a showroom cannot have two shows at the exact same date + time.
    Returns 409 with a descriptive message if a conflict is detected.
    """
    err = _require_admin()
    if err:
        return err

    payload = request.get_json(silent=True) or {}

    movie_id_str    = (payload.get("movieId")   or "").strip()
    date            = (payload.get("date")       or "").strip()
    time_str        = (payload.get("time")       or "").strip()
    showroom_id_str = (payload.get("showroomId") or "").strip()
    duration_raw    = payload.get("duration")

    errors = {}
    if not movie_id_str:
        errors["movieId"]    = "Movie is required."
    if not date:
        errors["date"]       = "Date is required."
    if not time_str:
        errors["time"]       = "Time is required."
    if not showroom_id_str:
        errors["showroomId"] = "Showroom is required."

    if errors:
        return jsonify({"message": "Validation failed.", "errors": errors}), 400

    try:
        movie_id = ObjectId(movie_id_str)
    except Exception:
        return jsonify({"message": "Invalid movie ID format."}), 400

    try:
        showroom_id = ObjectId(showroom_id_str)
    except Exception:
        return jsonify({"message": "Invalid showroom ID format."}), 400

    if not get_movies_collection().find_one({"_id": movie_id}):
        return jsonify({"message": "Movie not found."}), 404

    if not get_showrooms_collection().find_one({"_id": showroom_id}):
        return jsonify({"message": "Showroom not found."}), 404

    # Conflict check: same showroom, same date, same time
    conflict = get_shows_collection().find_one({
        "showroomId": showroom_id,
        "date":       date,
        "time":       time_str,
    })
    if conflict:
        return jsonify({
            "message": f"Conflict: this showroom is already booked on {date} at {time_str}."
        }), 409

    try:
        duration = int(duration_raw) if duration_raw is not None else 120
    except (TypeError, ValueError):
        duration = 120

    show_doc = {
        "movieId":    movie_id,
        "showroomId": showroom_id,
        "date":       date,
        "time":       time_str,
        "duration":   duration,
    }

    result = get_shows_collection().insert_one(show_doc)

    return jsonify({
        "message": "Showtime scheduled successfully.",
        "data": {"id": str(result.inserted_id)},
    }), 201


# ── Promotions ──────────────────────────────────────────────────────────────

@admin_bp.post("/admin/promotions")
def admin_create_promotion():
    """
    Create a promo code and optionally email all active customers.

    Discount is stored as a decimal (e.g. 25% -> 0.25) to match the existing
    promotions collection schema used by the booking checkout.
    Returns 409 if the promo code already exists.
    """
    err = _require_admin()
    if err:
        return err

    payload = request.get_json(silent=True) or {}

    promo_code      = (payload.get("code") or "").strip().upper()
    discount_raw    = payload.get("discountPercentage")
    expiration_date = (payload.get("expirationDate") or "").strip()
    send_email_flag = bool(payload.get("sendEmail", False))

    errors = {}
    if not promo_code:
        errors["code"]           = "Promo code is required."
    if not expiration_date:
        errors["expirationDate"] = "Expiration date is required."

    discount_pct = None
    if discount_raw is None:
        errors["discountPercentage"] = "Discount percentage is required."
    else:
        try:
            discount_pct = float(discount_raw)
            if not (1 <= discount_pct <= 100):
                errors["discountPercentage"] = "Discount must be between 1 and 100."
        except (TypeError, ValueError):
            errors["discountPercentage"] = "Discount must be a valid number."

    if errors:
        return jsonify({"message": "Validation failed.", "errors": errors}), 400

    promos = get_promotions_collection()
    if promos.find_one({"promoCode": promo_code}):
        return jsonify({"message": f"Promo code '{promo_code}' already exists."}), 409

    promo_doc = {
        "promoCode": promo_code,
        "discount":  round(discount_pct / 100, 4),
        "startDate": "",
        "endDate":   expiration_date,
    }
    result = promos.insert_one(promo_doc)

    email_count = 0
    if send_email_flag:
        subscribed = list(
            get_users_collection().find(
                {"role": "customer", "status": "ACTIVE"},
                {"email": 1},
            )
        )
        for user_doc in subscribed:
            email_addr = (user_doc.get("email") or "").strip()
            if email_addr:
                try:
                    send_promotion_email(
                        email_addr, promo_code, discount_pct, expiration_date
                    )
                    email_count += 1
                except Exception:
                    pass  # don't abort the whole request if one email fails

    return jsonify({
        "message": "Promotion created successfully.",
        "data": {
            "id":         str(result.inserted_id),
            "promoCode":  promo_code,
            "emailsSent": email_count,
        },
    }), 201
