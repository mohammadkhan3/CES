import re
from datetime import datetime

from bson import ObjectId

from app.db import (
    get_movies_collection,
    get_promotions_collection,
    get_showrooms_collection,
    get_shows_collection,
    get_users_collection,
)
from app.services.email import send_promotion_email

_VALID_RATINGS  = {"G", "PG", "PG-13", "R", "NC-17"}
_VALID_STATUSES = {"currently_running", "coming_soon"}


class AdminError(Exception):
    def __init__(self, message: str, status: int = 400):
        self.message = message
        self.status = status
        super().__init__(message)


def _parse_minutes(time_str: str):
    for fmt in ("%I:%M %p", "%H:%M"):
        try:
            t = datetime.strptime(time_str.strip(), fmt)
            return t.hour * 60 + t.minute
        except ValueError:
            continue
    return None


def find_overlap(showroom_id: ObjectId, date: str, time_str: str, duration: int):
    new_start = _parse_minutes(time_str)
    if new_start is None:
        return get_shows_collection().find_one({
            "showroomId": showroom_id,
            "date":       date,
            "time":       time_str,
        })

    new_end = new_start + duration

    for show in get_shows_collection().find({"showroomId": showroom_id, "date": date}):
        exist_start = _parse_minutes(str(show.get("time", "")))
        if exist_start is None:
            continue
        exist_end = exist_start + int(show.get("duration", 120))

        if new_start < exist_end and exist_start < new_end:
            return show

    return None


def create_movie(payload: dict) -> dict:
    title       = (payload.get("title")       or "").strip()
    rating      = (payload.get("rating")      or "").strip()
    genre       = (payload.get("genre")       or "").strip()
    description = (payload.get("description") or "").strip()
    trailer_url = (payload.get("trailerLink") or payload.get("trailer_url") or "").strip()
    poster_url  = (payload.get("posterUrl")   or payload.get("poster_url")  or "").strip()
    status      = (payload.get("status")      or "currently_running").strip()

    errors = {}
    if not title:
        errors["title"]       = "Title is required."
    if not rating or rating not in _VALID_RATINGS:
        errors["rating"]      = f"Rating must be one of: {', '.join(sorted(_VALID_RATINGS))}."
    if not genre:
        errors["genre"]       = "Genre is required."
    if not description:
        errors["description"] = "Description is required."
    if not trailer_url:
        errors["trailerLink"] = "Trailer link is required."
    if not poster_url:
        errors["posterUrl"]   = "Poster URL is required."
    if status not in _VALID_STATUSES:
        errors["status"]      = f"Status must be one of: {', '.join(_VALID_STATUSES)}."

    if errors:
        raise AdminError("Validation failed.", 400)

    movies = get_movies_collection()
    if movies.find_one({"title": {"$regex": f"^{re.escape(title)}$", "$options": "i"}}):
        raise AdminError(f"A movie titled '{title}' already exists.", 409)

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
    return {"id": str(result.inserted_id), "title": title, "errors": errors}


def list_showrooms() -> list:
    return [
        {
            "id":            str(doc["_id"]),
            "name":          doc.get("name", ""),
            "numberOfSeats": doc.get("numberOfSeats", 0),
        }
        for doc in get_showrooms_collection().find({})
    ]


def create_showtime(payload: dict) -> dict:
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
        raise AdminError("Validation failed.", 400)

    try:
        movie_id = ObjectId(movie_id_str)
    except Exception:
        raise AdminError("Invalid movie ID format.")

    try:
        showroom_id = ObjectId(showroom_id_str)
    except Exception:
        raise AdminError("Invalid showroom ID format.")

    if not get_movies_collection().find_one({"_id": movie_id}):
        raise AdminError("Movie not found.", 404)

    if not get_showrooms_collection().find_one({"_id": showroom_id}):
        raise AdminError("Showroom not found.", 404)

    try:
        duration = int(duration_raw) if duration_raw is not None else 120
    except (TypeError, ValueError):
        duration = 120

    conflict = find_overlap(showroom_id, date, time_str, duration)
    if conflict:
        conflict_time = conflict.get("time", "unknown time")
        raise AdminError(
            f"Scheduling conflict: this showroom already has a show at {conflict_time} on {date} "
            f"that overlaps the requested {time_str} slot.",
            409,
        )

    result = get_shows_collection().insert_one({
        "movieId":    movie_id,
        "showroomId": showroom_id,
        "date":       date,
        "time":       time_str,
        "duration":   duration,
    })

    return {"id": str(result.inserted_id)}


def create_promotion(payload: dict) -> dict:
    promo_code      = (payload.get("code")           or "").strip().upper()
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
        raise AdminError("Validation failed.", 400)

    promos = get_promotions_collection()
    if promos.find_one({"promoCode": promo_code}):
        raise AdminError(f"Promo code '{promo_code}' already exists.", 409)

    result = promos.insert_one({
        "promoCode": promo_code,
        "discount":  round(discount_pct / 100, 4),
        "startDate": "",
        "endDate":   expiration_date,
    })

    email_count = 0
    if send_email_flag:
        for user_doc in get_users_collection().find(
            {"role": "customer", "status": "ACTIVE"}, {"email": 1}
        ):
            email_addr = (user_doc.get("email") or "").strip()
            if email_addr:
                try:
                    send_promotion_email(email_addr, promo_code, discount_pct, expiration_date)
                    email_count += 1
                except Exception:
                    pass

    return {
        "id":         str(result.inserted_id),
        "promoCode":  promo_code,
        "emailsSent": email_count,
    }


def is_admin(role: str, email: str) -> bool:
    if role == "admin":
        return True
    if email:
        user = get_users_collection().find_one(
            {"emailLower": email.lower()}, {"role": 1}
        )
        if user and user.get("role") == "admin":
            return True
    return False
