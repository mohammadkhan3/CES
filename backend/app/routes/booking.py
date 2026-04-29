from bson import ObjectId
from flask import Blueprint, jsonify, request, session

from app.db import get_users_collection
from app.services.booking import BookingError, confirm_booking, get_checkout_summary, get_seat_map, reserve_seats
from app.services.email import send_booking_confirmation_email

booking_bp = Blueprint("booking", __name__)


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


@booking_bp.get("/booking/showtimes/<string:show_id>/seats")
def get_seat_map_route(show_id: str):
    current_email = _current_user_email() or request.headers.get("X-User-Email", "").strip()
    try:
        data = get_seat_map(show_id, current_email)
    except BookingError as e:
        return jsonify({"message": e.message}), e.status
    return jsonify({"data": data}), 200


@booking_bp.post("/booking/checkout-summary")
def get_checkout_summary_route():
    payload          = request.get_json(silent=True) or {}
    provided_email   = str(payload.get("email", "")).strip()
    email            = provided_email or _current_user_email()
    try:
        data = get_checkout_summary(
            show_id_str=str(payload.get("showId", "")).strip(),
            selected_seat_ids=payload.get("selectedSeatIds", []),
            ticket_counts=payload.get("ticketCounts", {}),
            email=email,
        )
    except BookingError as e:
        resp = {"message": e.message}
        if e.status == 401:
            resp["requiresLogin"] = True
        return jsonify(resp), e.status
    return jsonify({"data": data}), 200


@booking_bp.post("/booking/reserve-seats")
def reserve_seats_route():
    payload        = request.get_json(silent=True) or {}
    provided_email = str(payload.get("email", "")).strip()
    email          = provided_email or _current_user_email()
    try:
        data = reserve_seats(
            show_id_str=str(payload.get("showId", "")).strip(),
            seat_ids=payload.get("seatIds", []),
            email=email,
        )
    except BookingError as e:
        resp = {"message": e.message}
        if e.status == 401:
            resp["requiresLogin"] = True
        return jsonify(resp), e.status
    return jsonify({"message": "Seats reserved successfully.", "data": data}), 200


@booking_bp.post("/booking/confirm")
def confirm_booking_route():
    payload        = request.get_json(silent=True) or {}
    provided_email = str(payload.get("email", "")).strip()
    email          = provided_email or _current_user_email()
    try:
        result = confirm_booking(
            show_id_str=str(payload.get("showId", "")).strip(),
            selected_seat_ids=payload.get("selectedSeatIds", []),
            ticket_counts=payload.get("ticketCounts", {}),
            email=email,
        )
    except BookingError as e:
        resp = {"message": e.message}
        if e.status == 401:
            resp["requiresLogin"] = True
        return jsonify(resp), e.status

    try:
        send_booking_confirmation_email(
            recipient_email=result["email"],
            booking_id=result["bookingId"],
            movie_title=result["movieTitle"],
            show_date=result["showDate"],
            show_time=result["showTime"],
            showroom_name=result["showroomName"],
            seats=result["seats"],
            ticket_counts=result["ticketCounts"],
            total_price=result["totalPrice"],
        )
    except Exception:
        pass

    return jsonify({
        "message": "Booking confirmed.",
        "data": {
            "bookingId":  result["bookingId"],
            "email":      result["email"],
            "totalPrice": result["totalPrice"],
        },
    }), 201
