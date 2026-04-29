from datetime import datetime, timedelta
from typing import Any, Dict, List, Set

from bson import ObjectId
from flask import Blueprint, jsonify, request, session

from app.db import (
    get_bookings_collection,
    get_movies_collection,
    get_seat_reservations_collection,
    get_seats_collection,
    get_shows_collection,
    get_showrooms_collection,
    get_ticket_prices_collection,
    get_tickets_collection,
    get_users_collection,
)
from app.utils import movie_to_json
from app.services.email import send_booking_confirmation_email

booking_bp = Blueprint("booking", __name__)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _serialize_id(value: Any) -> str:
    return str(value) if value is not None else ""


def _get_price_map() -> Dict[str, float]:
    price_map: Dict[str, float] = {}
    for doc in get_ticket_prices_collection().find({}):
        ticket_type = str(doc.get("ticketType", "")).strip().upper()
        try:
            price = float(doc.get("price", 0))
        except (TypeError, ValueError):
            price = 0.0
        if ticket_type:
            price_map[ticket_type] = price
    return price_map


def _build_display(show_doc: Dict, showroom_doc: Dict) -> str:
    date = str(show_doc.get("date", "")).strip()
    time = str(show_doc.get("time", "")).strip()
    room = str(showroom_doc.get("name", "")).strip()
    return f"{date} {time} – {room}".strip()


def _get_booked_seat_ids(show_id: ObjectId, exclude_email: str = "") -> Set[ObjectId]:
    """Return seat ObjectIds already confirmed-booked or actively reserved by other users."""
    # Confirmed bookings
    bookings = list(get_bookings_collection().find({"showId": show_id}, {"_id": 1}))
    booked: Set[ObjectId] = set()
    if bookings:
        booking_ids = [doc["_id"] for doc in bookings]
        for ticket in get_tickets_collection().find(
            {"bookingId": {"$in": booking_ids}}, {"seatId": 1}
        ):
            seat_id = ticket.get("seatId")
            if isinstance(seat_id, ObjectId):
                booked.add(seat_id)

    # Active reservations from other users
    now = datetime.utcnow()
    res_query: Dict = {"showId": show_id, "expiresAt": {"$gt": now}}
    if exclude_email:
        res_query["email"] = {"$not": {"$regex": f"^{exclude_email}$", "$options": "i"}}
    for res_doc in get_seat_reservations_collection().find(res_query, {"seatId": 1}):
        seat_id = res_doc.get("seatId")
        if isinstance(seat_id, ObjectId):
            booked.add(seat_id)

    return booked


def _resolve_show(show_id_str: str):
    try:
        show_id = ObjectId(show_id_str)
    except Exception:
        return None, None, (jsonify({"message": "Invalid show id."}), 400)

    show_doc = get_shows_collection().find_one({"_id": show_id})
    if not show_doc:
        return None, None, (jsonify({"message": "Show not found."}), 404)

    showroom_doc = get_showrooms_collection().find_one({"_id": show_doc.get("showroomId")})
    if not showroom_doc:
        return None, None, (jsonify({"message": "Showroom not found for this show."}), 404)

    return show_doc, showroom_doc, None


def _current_user_email() -> str:
    users = get_users_collection()

    header_email = request.headers.get("X-User-Email", "").strip()
    if header_email:
        user = users.find_one({"emailLower": header_email.lower()})
        if user and user.get("email"):
            return str(user["email"]).strip()

    session_uid = session.get("userId")
    if session_uid:
        try:
            user = users.find_one({"_id": ObjectId(session_uid)})
            if user and user.get("email"):
                return str(user["email"]).strip()
        except Exception:
            pass

    return ""


# ── Routes ────────────────────────────────────────────────────────────────────

@booking_bp.get("/booking/showtimes/<string:show_id>/seats")
def get_seat_map(show_id: str):

    show_doc, showroom_doc, err = _resolve_show(show_id)
    if err:
        return err

    current_email = _current_user_email() or request.headers.get("X-User-Email", "").strip()
    booked_ids = _get_booked_seat_ids(show_doc["_id"], exclude_email=current_email)

    seats: List[Dict[str, Any]] = []
    rows_seen: List[str] = []
    row_counts: Dict[str, int] = {}

    for seat in get_seats_collection().find(
        {"showroomId": showroom_doc["_id"]},
        {"row": 1, "seatNumber": 1},
    ):
        row        = str(seat.get("row", "")).strip()
        seat_num   = str(seat.get("seatNumber", "")).strip()
        seat_label = f"{row}{seat_num}"

        if row and row not in rows_seen:
            rows_seen.append(row)

        is_booked = seat["_id"] in booked_ids
        seats.append({
            "seatId":     _serialize_id(seat["_id"]),
            "seatLabel":  seat_label,
            "row":        row,
            "seatNumber": seat_num,
            "status":     "booked" if is_booked else "available",
            "isBooked":   is_booked,
        })
        row_counts[row] = row_counts.get(row, 0) + 1

    seats.sort(key=lambda s: (s["row"], int(s["seatNumber"]) if s["seatNumber"].isdigit() else 9999))
    max_per_row = max(row_counts.values(), default=0)

    return jsonify({
        "data": {
            "showId":   _serialize_id(show_doc["_id"]),
            "showroom": {
                "id":            _serialize_id(showroom_doc["_id"]),
                "name":          showroom_doc.get("name", ""),
                "numberOfSeats": showroom_doc.get("numberOfSeats", 0),
            },
            "layout": {"rows": rows_seen, "seatsPerRow": max_per_row},
            "seats":  seats,
        }
    }), 200


@booking_bp.post("/booking/checkout-summary")
def get_checkout_summary():
    """
    Validate seat selection and ticket counts, then return a priced order
    summary. Does NOT create a booking — that happens at /booking/confirm.

    Expected body:
      {
        "showId":          "<id>",
        "selectedSeatIds": ["<id>", ...],
        "ticketCounts":    {"adult": 1, "child": 0, "senior": 0},
        "email":           "optional@override.com"
      }
    """
    payload = request.get_json(silent=True) or {}

    show_id_str      = str(payload.get("showId", "")).strip()
    selected_seat_ids = payload.get("selectedSeatIds", [])
    ticket_counts    = payload.get("ticketCounts", {})
    provided_email   = str(payload.get("email", "")).strip()
    email            = provided_email or _current_user_email()

    # ── Input validation ────────────────────────────────────────────────────
    if not show_id_str:
        return jsonify({"message": "showId is required."}), 400

    if not isinstance(selected_seat_ids, list) or not selected_seat_ids:
        return jsonify({"message": "selectedSeatIds must be a non-empty array."}), 400

    if not isinstance(ticket_counts, dict):
        return jsonify({"message": "ticketCounts must be an object."}), 400

    if not email:
        return jsonify({
            "message": "Authentication required. Please log in before checkout.",
            "requiresLogin": True,
        }), 401

    # ── Resolve show / showroom ─────────────────────────────────────────────
    show_doc, showroom_doc, err = _resolve_show(show_id_str)
    if err:
        return err

    movie_doc = get_movies_collection().find_one({"_id": show_doc.get("movieId")})
    if not movie_doc:
        return jsonify({"message": "Movie not found for this show."}), 404

    # ── Validate seat IDs ───────────────────────────────────────────────────
    seat_oids: List[ObjectId] = []
    for sid in selected_seat_ids:
        try:
            seat_oids.append(ObjectId(str(sid)))
        except Exception:
            return jsonify({"message": f"Invalid seat id: {sid}"}), 400

    seat_docs = list(get_seats_collection().find({
        "_id": {"$in": seat_oids},
        "showroomId": showroom_doc["_id"],
    }))
    if len(seat_docs) != len(seat_oids):
        return jsonify({"message": "One or more seat IDs are invalid for this showroom."}), 400

    # ── Seat availability check ─────────────────────────────────────────────
    booked_ids = _get_booked_seat_ids(show_doc["_id"], exclude_email=email)
    for oid in seat_oids:
        if oid in booked_ids:
            return jsonify({"message": "One or more selected seats are already booked."}), 409

    # ── Ticket count validation ─────────────────────────────────────────────
    counts = {
        "ADULT":  int(ticket_counts.get("adult",  0) or 0),
        "CHILD":  int(ticket_counts.get("child",  0) or 0),
        "SENIOR": int(ticket_counts.get("senior", 0) or 0),
    }
    if any(q < 0 for q in counts.values()):
        return jsonify({"message": "Ticket quantities cannot be negative."}), 400

    total_tickets = sum(counts.values())
    if total_tickets == 0:
        return jsonify({"message": "At least one ticket is required."}), 400

    if total_tickets != len(selected_seat_ids):
        return jsonify({"message": "Seat count must match total number of tickets."}), 400

    # ── Price calculation ───────────────────────────────────────────────────
    price_map = _get_price_map()
    ticket_summary: List[Dict[str, Any]] = []
    total_before_tax = 0.0

    for ticket_type, qty in counts.items():
        if qty == 0:
            continue
        if ticket_type not in price_map:
            return jsonify({"message": f"Missing ticket price for {ticket_type}."}), 500
        price = float(price_map[ticket_type])
        subtotal = round(price * qty, 2)
        total_before_tax += subtotal
        ticket_summary.append({
            "type":           ticket_type,
            "quantity":       qty,
            "pricePerTicket": round(price, 2),
            "subtotal":       subtotal,
        })

    seat_docs.sort(key=lambda s: (
        str(s.get("row", "")),
        int(str(s.get("seatNumber", "0"))) if str(s.get("seatNumber", "0")).isdigit() else 9999,
    ))
    selected_seats = [
        {
            "seatId":    _serialize_id(s["_id"]),
            "seatLabel": f"{s.get('row', '')}{s.get('seatNumber', '')}",
            "row":       str(s.get("row", "")),
            "seatNumber": str(s.get("seatNumber", "")),
        }
        for s in seat_docs
    ]

    return jsonify({
        "data": {
            "movie": movie_to_json(movie_doc),
            "show": {
                "id":       _serialize_id(show_doc["_id"]),
                "date":     show_doc.get("date", ""),
                "time":     show_doc.get("time", ""),
                "duration": show_doc.get("duration"),
                "showroom": {
                    "id":   _serialize_id(showroom_doc["_id"]),
                    "name": showroom_doc.get("name", ""),
                },
                "display": _build_display(show_doc, showroom_doc),
            },
            "selectedSeats":   selected_seats,
            "ticketSummary":   ticket_summary,
            "totalTickets":    total_tickets,
            "totalBeforeTax":  round(total_before_tax, 2),
            "email":           email,
        }
    }), 200


@booking_bp.post("/booking/reserve-seats")
def reserve_seats():
    """
    Temporarily reserve seats for the current session (15-minute TTL).
    Call this when the user proceeds from seat selection to checkout.

    Expected body:
      {
        "showId":  "<id>",
        "seatIds": ["<id>", ...],
        "email":   "optional@override.com"
      }
    """
    payload = request.get_json(silent=True) or {}

    show_id_str    = str(payload.get("showId", "")).strip()
    seat_ids       = payload.get("seatIds", [])
    provided_email = str(payload.get("email", "")).strip()
    email          = provided_email or _current_user_email()

    if not show_id_str:
        return jsonify({"message": "showId is required."}), 400
    if not isinstance(seat_ids, list) or not seat_ids:
        return jsonify({"message": "seatIds must be a non-empty array."}), 400
    if not email:
        return jsonify({
            "message": "Authentication required. Please log in before reserving seats.",
            "requiresLogin": True,
        }), 401

    show_doc, showroom_doc, err = _resolve_show(show_id_str)
    if err:
        return err

    # Validate seat IDs belong to this showroom
    seat_oids: List[ObjectId] = []
    for sid in seat_ids:
        try:
            seat_oids.append(ObjectId(str(sid)))
        except Exception:
            return jsonify({"message": f"Invalid seat id: {sid}"}), 400

    seat_docs = list(get_seats_collection().find({
        "_id": {"$in": seat_oids},
        "showroomId": showroom_doc["_id"],
    }))
    if len(seat_docs) != len(seat_oids):
        return jsonify({"message": "One or more seat IDs are invalid for this showroom."}), 400

    # Check not already booked or reserved by someone else
    booked_ids = _get_booked_seat_ids(show_doc["_id"], exclude_email=email)
    for oid in seat_oids:
        if oid in booked_ids:
            return jsonify({"message": "One or more selected seats are already taken."}), 409

    # Replace any existing reservation for this user+show, then insert new ones
    reservations = get_seat_reservations_collection()
    now        = datetime.utcnow()
    expires_at = now + timedelta(minutes=15)

    reservations.delete_many({"showId": show_doc["_id"], "email": email})
    reservations.insert_many([
        {
            "showId":    show_doc["_id"],
            "seatId":    oid,
            "email":     email,
            "expiresAt": expires_at,
        }
        for oid in seat_oids
    ])

    return jsonify({
        "message": "Seats reserved successfully.",
        "data": {
            "reservedSeatIds": [str(oid) for oid in seat_oids],
            "expiresAt":       expires_at.isoformat() + "Z",
        },
    }), 200


@booking_bp.post("/booking/confirm")
def confirm_booking():
    """
    Finalise the booking: create a booking record and one ticket per seat.
    Clears the session reservation on success.

    Expected body:
      {
        "showId":          "<id>",
        "selectedSeatIds": ["<id>", ...],
        "ticketCounts":    {"adult": 1, "child": 0, "senior": 0},
        "email":           "optional@override.com"
      }
    """
    payload = request.get_json(silent=True) or {}

    show_id_str       = str(payload.get("showId", "")).strip()
    selected_seat_ids = payload.get("selectedSeatIds", [])
    ticket_counts     = payload.get("ticketCounts", {})
    provided_email    = str(payload.get("email", "")).strip()
    email             = provided_email or _current_user_email()

    if not show_id_str:
        return jsonify({"message": "showId is required."}), 400
    if not isinstance(selected_seat_ids, list) or not selected_seat_ids:
        return jsonify({"message": "selectedSeatIds must be a non-empty array."}), 400
    if not isinstance(ticket_counts, dict):
        return jsonify({"message": "ticketCounts must be an object."}), 400
    if not email:
        return jsonify({
            "message": "Authentication required. Please log in before confirming.",
            "requiresLogin": True,
        }), 401

    show_doc, showroom_doc, err = _resolve_show(show_id_str)
    if err:
        return err

    # Validate seat IDs
    seat_oids: List[ObjectId] = []
    for sid in selected_seat_ids:
        try:
            seat_oids.append(ObjectId(str(sid)))
        except Exception:
            return jsonify({"message": f"Invalid seat id: {sid}"}), 400

    seat_docs = list(get_seats_collection().find({
        "_id": {"$in": seat_oids},
        "showroomId": showroom_doc["_id"],
    }))
    if len(seat_docs) != len(seat_oids):
        return jsonify({"message": "One or more seat IDs are invalid for this showroom."}), 400

    # Final conflict check (exclude current user's own reservation)
    booked_ids = _get_booked_seat_ids(show_doc["_id"], exclude_email=email)
    for oid in seat_oids:
        if oid in booked_ids:
            return jsonify({"message": "One or more selected seats are no longer available."}), 409

    # Ticket count validation
    counts = {
        "ADULT":  int(ticket_counts.get("adult",  0) or 0),
        "CHILD":  int(ticket_counts.get("child",  0) or 0),
        "SENIOR": int(ticket_counts.get("senior", 0) or 0),
    }
    if any(q < 0 for q in counts.values()):
        return jsonify({"message": "Ticket quantities cannot be negative."}), 400
    total_tickets = sum(counts.values())
    if total_tickets == 0:
        return jsonify({"message": "At least one ticket is required."}), 400
    if total_tickets != len(selected_seat_ids):
        return jsonify({"message": "Seat count must match total number of tickets."}), 400

    # Pricing
    price_map    = _get_price_map()
    total_price  = 0.0
    for ticket_type, qty in counts.items():
        if qty == 0:
            continue
        if ticket_type not in price_map:
            return jsonify({"message": f"Missing ticket price for {ticket_type}."}), 500
        total_price += price_map[ticket_type] * qty

    # Resolve user
    user_doc = get_users_collection().find_one({"emailLower": email.lower()})
    if not user_doc:
        return jsonify({"message": "User account not found."}), 404

    # Create booking document
    now = datetime.utcnow()
    booking_doc = {
        "userId":     user_doc["_id"],
        "showId":     show_doc["_id"],
        "email":      email,
        "totalPrice": round(total_price, 2),
        "status":     "confirmed",
        "createdAt":  now,
    }
    booking_id = get_bookings_collection().insert_one(booking_doc).inserted_id

    # Create one ticket per seat, consuming seat_oids in ticket-type order
    seat_iter = iter(seat_oids)
    for ticket_type, qty in counts.items():
        price = price_map.get(ticket_type, 0.0)
        for _ in range(qty):
            get_tickets_collection().insert_one({
                "bookingId":  booking_id,
                "seatId":     next(seat_iter),
                "ticketType": ticket_type,
                "price":      round(float(price), 2),
                "createdAt":  now,
            })

    # Clear this user's reservations for the show
    get_seat_reservations_collection().delete_many({
        "showId": show_doc["_id"],
        "email":  email,
    })

    # Send confirmation email (best-effort — don't fail the booking if email errors)
    try:
        movie_doc = get_movies_collection().find_one({"_id": show_doc["movieId"]})
        movie_title = movie_doc.get("title", "Your Movie") if movie_doc else "Your Movie"
        seat_info = [
            {"row": s.get("row", ""), "seatNumber": str(s.get("seatNumber", ""))}
            for s in seat_docs
        ]
        send_booking_confirmation_email(
            recipient_email=email,
            booking_id=str(booking_id),
            movie_title=movie_title,
            show_date=str(show_doc.get("date", "")),
            show_time=str(show_doc.get("time", "")),
            showroom_name=str(showroom_doc.get("name", "")),
            seats=seat_info,
            ticket_counts={k.lower(): v for k, v in counts.items()},
            total_price=round(total_price, 2),
        )
    except Exception:
        pass  # email failure must not roll back a confirmed booking

    return jsonify({
        "message": "Booking confirmed.",
        "data": {
            "bookingId":  str(booking_id),
            "email":      email,
            "totalPrice": round(total_price, 2),
        },
    }), 201
