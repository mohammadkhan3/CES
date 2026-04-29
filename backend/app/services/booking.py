from datetime import datetime, timedelta
from typing import Any, Dict, List, Set

from bson import ObjectId

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


class BookingError(Exception):
    def __init__(self, message: str, status: int = 400):
        self.message = message
        self.status = status
        super().__init__(message)


def serialize_id(value: Any) -> str:
    return str(value) if value is not None else ""


def get_price_map() -> Dict[str, float]:
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


def build_display(show_doc: Dict, showroom_doc: Dict) -> str:
    date = str(show_doc.get("date", "")).strip()
    time = str(show_doc.get("time", "")).strip()
    room = str(showroom_doc.get("name", "")).strip()
    return f"{date} {time} – {room}".strip()


def get_booked_seat_ids(show_id: ObjectId, exclude_email: str = "") -> Set[ObjectId]:
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

    now = datetime.utcnow()
    res_query: Dict = {"showId": show_id, "expiresAt": {"$gt": now}}
    if exclude_email:
        res_query["email"] = {"$not": {"$regex": f"^{exclude_email}$", "$options": "i"}}
    for res_doc in get_seat_reservations_collection().find(res_query, {"seatId": 1}):
        seat_id = res_doc.get("seatId")
        if isinstance(seat_id, ObjectId):
            booked.add(seat_id)

    return booked


def resolve_show(show_id_str: str):
    try:
        show_id = ObjectId(show_id_str)
    except Exception:
        raise BookingError("Invalid show id.", 400)

    show_doc = get_shows_collection().find_one({"_id": show_id})
    if not show_doc:
        raise BookingError("Show not found.", 404)

    showroom_doc = get_showrooms_collection().find_one({"_id": show_doc.get("showroomId")})
    if not showroom_doc:
        raise BookingError("Showroom not found for this show.", 404)

    return show_doc, showroom_doc


def get_seat_map(show_id_str: str, current_email: str) -> Dict:
    show_doc, showroom_doc = resolve_show(show_id_str)
    booked_ids = get_booked_seat_ids(show_doc["_id"], exclude_email=current_email)

    seats: List[Dict[str, Any]] = []
    rows_seen: List[str] = []
    row_counts: Dict[str, int] = {}

    for seat in get_seats_collection().find(
        {"showroomId": showroom_doc["_id"]},
        {"row": 1, "seatNumber": 1},
    ):
        row = str(seat.get("row", "")).strip()
        seat_num = str(seat.get("seatNumber", "")).strip()
        seat_label = f"{row}{seat_num}"

        if row and row not in rows_seen:
            rows_seen.append(row)

        is_booked = seat["_id"] in booked_ids
        seats.append({
            "seatId":     serialize_id(seat["_id"]),
            "seatLabel":  seat_label,
            "row":        row,
            "seatNumber": seat_num,
            "status":     "booked" if is_booked else "available",
            "isBooked":   is_booked,
        })
        row_counts[row] = row_counts.get(row, 0) + 1

    seats.sort(key=lambda s: (s["row"], int(s["seatNumber"]) if s["seatNumber"].isdigit() else 9999))
    max_per_row = max(row_counts.values(), default=0)

    return {
        "showId":   serialize_id(show_doc["_id"]),
        "showroom": {
            "id":            serialize_id(showroom_doc["_id"]),
            "name":          showroom_doc.get("name", ""),
            "numberOfSeats": showroom_doc.get("numberOfSeats", 0),
        },
        "layout": {"rows": rows_seen, "seatsPerRow": max_per_row},
        "seats":  seats,
    }


def get_checkout_summary(
    show_id_str: str,
    selected_seat_ids: list,
    ticket_counts: dict,
    email: str,
) -> Dict:
    if not show_id_str:
        raise BookingError("showId is required.")
    if not isinstance(selected_seat_ids, list) or not selected_seat_ids:
        raise BookingError("selectedSeatIds must be a non-empty array.")
    if not isinstance(ticket_counts, dict):
        raise BookingError("ticketCounts must be an object.")
    if not email:
        raise BookingError("Authentication required. Please log in before checkout.", 401)

    show_doc, showroom_doc = resolve_show(show_id_str)

    movie_doc = get_movies_collection().find_one({"_id": show_doc.get("movieId")})
    if not movie_doc:
        raise BookingError("Movie not found for this show.", 404)

    seat_oids: List[ObjectId] = []
    for sid in selected_seat_ids:
        try:
            seat_oids.append(ObjectId(str(sid)))
        except Exception:
            raise BookingError(f"Invalid seat id: {sid}")

    seat_docs = list(get_seats_collection().find({
        "_id": {"$in": seat_oids},
        "showroomId": showroom_doc["_id"],
    }))
    if len(seat_docs) != len(seat_oids):
        raise BookingError("One or more seat IDs are invalid for this showroom.")

    booked_ids = get_booked_seat_ids(show_doc["_id"], exclude_email=email)
    for oid in seat_oids:
        if oid in booked_ids:
            raise BookingError("One or more selected seats are already booked.", 409)

    counts = {
        "ADULT":  int(ticket_counts.get("adult",  0) or 0),
        "CHILD":  int(ticket_counts.get("child",  0) or 0),
        "SENIOR": int(ticket_counts.get("senior", 0) or 0),
    }
    if any(q < 0 for q in counts.values()):
        raise BookingError("Ticket quantities cannot be negative.")

    total_tickets = sum(counts.values())
    if total_tickets == 0:
        raise BookingError("At least one ticket is required.")
    if total_tickets != len(selected_seat_ids):
        raise BookingError("Seat count must match total number of tickets.")

    price_map = get_price_map()
    ticket_summary: List[Dict[str, Any]] = []
    total_before_tax = 0.0

    for ticket_type, qty in counts.items():
        if qty == 0:
            continue
        if ticket_type not in price_map:
            raise BookingError(f"Missing ticket price for {ticket_type}.", 500)
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
            "seatId":     serialize_id(s["_id"]),
            "seatLabel":  f"{s.get('row', '')}{s.get('seatNumber', '')}",
            "row":        str(s.get("row", "")),
            "seatNumber": str(s.get("seatNumber", "")),
        }
        for s in seat_docs
    ]

    return {
        "movie": movie_to_json(movie_doc),
        "show": {
            "id":       serialize_id(show_doc["_id"]),
            "date":     show_doc.get("date", ""),
            "time":     show_doc.get("time", ""),
            "duration": show_doc.get("duration"),
            "showroom": {
                "id":   serialize_id(showroom_doc["_id"]),
                "name": showroom_doc.get("name", ""),
            },
            "display": build_display(show_doc, showroom_doc),
        },
        "selectedSeats":   selected_seats,
        "ticketSummary":   ticket_summary,
        "totalTickets":    total_tickets,
        "totalBeforeTax":  round(total_before_tax, 2),
        "email":           email,
    }


def reserve_seats(show_id_str: str, seat_ids: list, email: str) -> Dict:
    if not show_id_str:
        raise BookingError("showId is required.")
    if not isinstance(seat_ids, list) or not seat_ids:
        raise BookingError("seatIds must be a non-empty array.")
    if not email:
        raise BookingError("Authentication required. Please log in before reserving seats.", 401)

    show_doc, showroom_doc = resolve_show(show_id_str)

    seat_oids: List[ObjectId] = []
    for sid in seat_ids:
        try:
            seat_oids.append(ObjectId(str(sid)))
        except Exception:
            raise BookingError(f"Invalid seat id: {sid}")

    seat_docs = list(get_seats_collection().find({
        "_id": {"$in": seat_oids},
        "showroomId": showroom_doc["_id"],
    }))
    if len(seat_docs) != len(seat_oids):
        raise BookingError("One or more seat IDs are invalid for this showroom.")

    booked_ids = get_booked_seat_ids(show_doc["_id"], exclude_email=email)
    for oid in seat_oids:
        if oid in booked_ids:
            raise BookingError("One or more selected seats are already taken.", 409)

    reservations = get_seat_reservations_collection()
    now = datetime.utcnow()
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

    return {
        "reservedSeatIds": [str(oid) for oid in seat_oids],
        "expiresAt":       expires_at.isoformat() + "Z",
    }


def confirm_booking(
    show_id_str: str,
    selected_seat_ids: list,
    ticket_counts: dict,
    email: str,
) -> Dict:
    if not show_id_str:
        raise BookingError("showId is required.")
    if not isinstance(selected_seat_ids, list) or not selected_seat_ids:
        raise BookingError("selectedSeatIds must be a non-empty array.")
    if not isinstance(ticket_counts, dict):
        raise BookingError("ticketCounts must be an object.")
    if not email:
        raise BookingError("Authentication required. Please log in before confirming.", 401)

    show_doc, showroom_doc = resolve_show(show_id_str)

    seat_oids: List[ObjectId] = []
    for sid in selected_seat_ids:
        try:
            seat_oids.append(ObjectId(str(sid)))
        except Exception:
            raise BookingError(f"Invalid seat id: {sid}")

    seat_docs = list(get_seats_collection().find({
        "_id": {"$in": seat_oids},
        "showroomId": showroom_doc["_id"],
    }))
    if len(seat_docs) != len(seat_oids):
        raise BookingError("One or more seat IDs are invalid for this showroom.")

    booked_ids = get_booked_seat_ids(show_doc["_id"], exclude_email=email)
    for oid in seat_oids:
        if oid in booked_ids:
            raise BookingError("One or more selected seats are no longer available.", 409)

    counts = {
        "ADULT":  int(ticket_counts.get("adult",  0) or 0),
        "CHILD":  int(ticket_counts.get("child",  0) or 0),
        "SENIOR": int(ticket_counts.get("senior", 0) or 0),
    }
    if any(q < 0 for q in counts.values()):
        raise BookingError("Ticket quantities cannot be negative.")
    total_tickets = sum(counts.values())
    if total_tickets == 0:
        raise BookingError("At least one ticket is required.")
    if total_tickets != len(selected_seat_ids):
        raise BookingError("Seat count must match total number of tickets.")

    price_map = get_price_map()
    total_price = 0.0
    for ticket_type, qty in counts.items():
        if qty == 0:
            continue
        if ticket_type not in price_map:
            raise BookingError(f"Missing ticket price for {ticket_type}.", 500)
        total_price += price_map[ticket_type] * qty

    user_doc = get_users_collection().find_one({"emailLower": email.lower()})
    if not user_doc:
        raise BookingError("User account not found.", 404)

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

    get_seat_reservations_collection().delete_many({
        "showId": show_doc["_id"],
        "email":  email,
    })

    movie_doc = get_movies_collection().find_one({"_id": show_doc["movieId"]})
    movie_title = movie_doc.get("title", "Your Movie") if movie_doc else "Your Movie"
    seat_info = [
        {"row": s.get("row", ""), "seatNumber": str(s.get("seatNumber", ""))}
        for s in seat_docs
    ]

    return {
        "bookingId":  str(booking_id),
        "email":      email,
        "totalPrice": round(total_price, 2),
        "movieTitle": movie_title,
        "showDate":   str(show_doc.get("date", "")),
        "showTime":   str(show_doc.get("time", "")),
        "showroomName": str(showroom_doc.get("name", "")),
        "seats":      seat_info,
        "ticketCounts": {k.lower(): v for k, v in counts.items()},
    }
