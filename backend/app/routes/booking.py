from typing import Any, Dict, List, Set

from bson import ObjectId
from flask import Blueprint, jsonify, request, session

from app.db import (
    get_bookings_collection,
    get_movies_collection,
    get_seats_collection,
    get_shows_collection,
    get_showrooms_collection,
    get_ticket_prices_collection,
    get_tickets_collection,
    get_users_collection
)
from app.utils import movie_to_json

booking_bp = Blueprint("booking", __name__)


def _serialize_object_id(value: Any) -> str:
    return str(value) if value is not None else ""


def _get_price_map() -> Dict[str, float]:
    """
    Reads ticket prices from DB and returns:
    {
        "ADULT": 12.99,
        "CHILD": 7.99,
        "SENIOR": 9.99
    }
    """
    price_map: Dict[str, float] = {}
    cursor = get_ticket_prices_collection().find({})
    for doc in cursor:
        ticket_type = str(doc.get("ticketType", "")).strip().upper()
        try:
            price = float(doc.get("price", 0))
        except (TypeError, ValueError):
            price = 0.0

        if ticket_type:
            price_map[ticket_type] = price

    return price_map


def _normalize_ticket_type(value: str) -> str:
    return str(value or "").strip().upper()


def _build_showtime_string(show_doc: Dict[str, Any], showroom_doc: Dict[str, Any]) -> str:
    date = str(show_doc.get("date", "")).strip()
    time = str(show_doc.get("time", "")).strip()
    showroom_name = str(showroom_doc.get("name", "")).strip()
    return f"{date} {time} - {showroom_name}".strip()


def _get_booked_seat_ids_for_show(show_id: ObjectId) -> Set[ObjectId]:
    """
    Finds all bookings for a show, then all tickets under those bookings,
    and returns the booked seat ObjectIds for that show.
    """
    booked_seat_ids: Set[ObjectId] = set()

    bookings = list(get_bookings_collection().find({"showId": show_id}, {"_id": 1}))
    if not bookings:
        return booked_seat_ids

    booking_ids = [doc["_id"] for doc in bookings]

    tickets = get_tickets_collection().find(
        {"bookingId": {"$in": booking_ids}},
        {"seatId": 1}
    )

    for ticket in tickets:
        seat_id = ticket.get("seatId")
        if isinstance(seat_id, ObjectId):
            booked_seat_ids.add(seat_id)

    return booked_seat_ids


def _get_show_and_showroom(show_id_str: str):
    try:
        show_id = ObjectId(show_id_str)
    except Exception:
        return None, None, (jsonify({"message": "Invalid show id."}), 400)

    show_doc = get_shows_collection().find_one({"_id": show_id})
    if not show_doc:
        return None, None, (jsonify({"message": "Show not found."}), 404)

    showroom_id = show_doc.get("showroomId")
    showroom_doc = get_showrooms_collection().find_one({"_id": showroom_id})
    if not showroom_doc:
        return None, None, (jsonify({"message": "Showroom not found for this show."}), 404)

    return show_doc, showroom_doc, None

def _get_current_user_email() -> str:
    """
    Try to resolve the current user's email from:
    1. X-User-Email header (demo-friendly)
    2. Flask session userId (real login flow)
    Returns empty string if no user email is available.
    """
    users = get_users_collection()

    x_user_email = request.headers.get("X-User-Email", "").strip()
    if x_user_email:
        user = users.find_one({"emailLower": x_user_email.lower()})
        if user and user.get("email"):
            return str(user.get("email", "")).strip()

        user = users.find_one({"email": x_user_email})
        if user and user.get("email"):
            return str(user.get("email", "")).strip()

    session_user_id = session.get("userId")
    if session_user_id:
        try:
            user = users.find_one({"_id": ObjectId(session_user_id)})
            if user and user.get("email"):
                return str(user.get("email", "")).strip()
        except Exception:
            pass

    return ""


@booking_bp.get("/booking/showtimes/<string:show_id>/seats")
def get_seat_map(show_id: str):
    """
    Returns seat layout for the selected showtime/show.
    Marks seats as available or booked based on tickets already sold.
    """
    show_doc, showroom_doc, error_response = _get_show_and_showroom(show_id)
    if error_response:
        return error_response

    booked_seat_ids = _get_booked_seat_ids_for_show(show_doc["_id"])

    seat_cursor = get_seats_collection().find(
        {"showroomId": showroom_doc["_id"]},
        {"row": 1, "seatNumber": 1, "showroomId": 1}
    )

    seats: List[Dict[str, Any]] = []
    rows_in_order: List[str] = []

    for seat in seat_cursor:
        row = str(seat.get("row", "")).strip()
        seat_number = str(seat.get("seatNumber", "")).strip()
        seat_label = f"{row}{seat_number}"

        if row and row not in rows_in_order:
            rows_in_order.append(row)

        seats.append({
            "seatId": _serialize_object_id(seat["_id"]),
            "seatLabel": seat_label,
            "row": row,
            "seatNumber": seat_number,
            "status": "booked" if seat["_id"] in booked_seat_ids else "available",
            "isBooked": seat["_id"] in booked_seat_ids,
        })

    def sort_key(seat: Dict[str, Any]):
        row = seat.get("row", "")
        seat_num_raw = str(seat.get("seatNumber", ""))
        try:
            seat_num = int(seat_num_raw)
        except ValueError:
            seat_num = 9999
        return (row, seat_num)

    seats.sort(key=sort_key)

    max_seats_per_row = 0
    row_counts: Dict[str, int] = {}
    for seat in seats:
        row = seat["row"]
        row_counts[row] = row_counts.get(row, 0) + 1
        if row_counts[row] > max_seats_per_row:
            max_seats_per_row = row_counts[row]

    return jsonify({
        "data": {
            "showId": _serialize_object_id(show_doc["_id"]),
            "showroom": {
                "id": _serialize_object_id(showroom_doc["_id"]),
                "name": showroom_doc.get("name", ""),
                "numberOfSeats": showroom_doc.get("numberOfSeats", 0),
            },
            "layout": {
                "rows": rows_in_order,
                "seatsPerRow": max_seats_per_row,
            },
            "seats": seats,
        }
    }), 200


@booking_bp.post("/booking/checkout-summary")
def get_checkout_summary():
    """
    Validates selected seats and ticket counts/types, then returns a summary:
    - movie
    - showtime
    - selected seats
    - price per ticket
    - totals before tax
    """
    payload = request.get_json(silent=True) or {}

    show_id_str = str(payload.get("showId", "")).strip()
    selected_seat_ids = payload.get("selectedSeatIds", [])
    ticket_counts = payload.get("ticketCounts", {})
    provided_email = str(payload.get("email", "")).strip()
    resolved_email = provided_email or _get_current_user_email()

    if not show_id_str:
        return jsonify({"message": "showId is required."}), 400

    if not isinstance(selected_seat_ids, list) or not selected_seat_ids:
        return jsonify({"message": "selectedSeatIds must be a non-empty array."}), 400

    if not isinstance(ticket_counts, dict):
        return jsonify({"message": "ticketCounts must be an object."}), 400
    
    if not resolved_email:
        return jsonify({
        "message": "Authentication required or email must be provided before checkout.",
        "requiresLogin": True
    }), 401

    show_doc, showroom_doc, error_response = _get_show_and_showroom(show_id_str)
    if error_response:
        return error_response

    movie_doc = get_movies_collection().find_one({"_id": show_doc.get("movieId")})
    if not movie_doc:
        return jsonify({"message": "Movie not found for this show."}), 404

    seat_object_ids: List[ObjectId] = []
    for seat_id in selected_seat_ids:
        try:
            seat_object_ids.append(ObjectId(str(seat_id)))
        except Exception:
            return jsonify({"message": f"Invalid seat id: {seat_id}"}), 400

    seat_docs = list(get_seats_collection().find({
        "_id": {"$in": seat_object_ids},
        "showroomId": showroom_doc["_id"],
    }))

    if len(seat_docs) != len(seat_object_ids):
        return jsonify({"message": "One or more selected seats are invalid for this showroom."}), 400

    booked_seat_ids = _get_booked_seat_ids_for_show(show_doc["_id"])
    for seat_id in seat_object_ids:
        if seat_id in booked_seat_ids:
            return jsonify({"message": "One or more selected seats are already booked."}), 409

    normalized_counts = {
        "ADULT": int(ticket_counts.get("adult", 0) or 0),
        "CHILD": int(ticket_counts.get("child", 0) or 0),
        "SENIOR": int(ticket_counts.get("senior", 0) or 0),
    }

    if any(qty < 0 for qty in normalized_counts.values()):
        return jsonify({"message": "Ticket quantities cannot be negative."}), 400

    total_tickets = sum(normalized_counts.values())
    if total_tickets <= 0:
        return jsonify({"message": "At least one ticket is required."}), 400

    if total_tickets != len(selected_seat_ids):
        return jsonify({"message": "Selected seat count must match the total number of tickets."}), 400

    price_map = _get_price_map()

    ticket_summary: List[Dict[str, Any]] = []
    total_before_tax = 0.0

    for ticket_type, qty in normalized_counts.items():
        if qty <= 0:
            continue

        if ticket_type not in price_map:
            return jsonify({"message": f"Missing ticket price for {ticket_type}."}), 500

        price_per_ticket = float(price_map[ticket_type])
        subtotal = round(price_per_ticket * qty, 2)
        total_before_tax += subtotal

        ticket_summary.append({
            "type": ticket_type,
            "quantity": qty,
            "pricePerTicket": round(price_per_ticket, 2),
            "subtotal": subtotal,
        })

    total_before_tax = round(total_before_tax, 2)

    def seat_sort_key(seat_doc: Dict[str, Any]):
        row = str(seat_doc.get("row", ""))
        seat_num_raw = str(seat_doc.get("seatNumber", ""))
        try:
            seat_num = int(seat_num_raw)
        except ValueError:
            seat_num = 9999
        return (row, seat_num)

    seat_docs.sort(key=seat_sort_key)

    selected_seats = [
        {
            "seatId": _serialize_object_id(seat["_id"]),
            "seatLabel": f"{seat.get('row', '')}{seat.get('seatNumber', '')}",
            "row": str(seat.get("row", "")),
            "seatNumber": str(seat.get("seatNumber", "")),
        }
        for seat in seat_docs
    ]

    return jsonify({
        "data": {
            "movie": movie_to_json(movie_doc),
            "show": {
                "id": _serialize_object_id(show_doc["_id"]),
                "date": show_doc.get("date", ""),
                "time": show_doc.get("time", ""),
                "duration": show_doc.get("duration"),
                "showroom": {
                    "id": _serialize_object_id(showroom_doc["_id"]),
                    "name": showroom_doc.get("name", ""),
                },
                "display": _build_showtime_string(show_doc, showroom_doc),
            },
            "selectedSeats": selected_seats,
            "ticketSummary": ticket_summary,
            "totalTickets": total_tickets,
            "totalBeforeTax": total_before_tax,
            "email": resolved_email,
        }
    }), 200