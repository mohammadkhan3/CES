from flask import Blueprint, jsonify, request, session

from app.services.booking import BookingError, get_current_user_email
from app.services.booking_facade import BookingFacade

booking_bp = Blueprint("booking", __name__)
_facade = BookingFacade()


def _current_user_email() -> str:
    return get_current_user_email(
        request.headers.get("X-User-Email", "").strip(),
        session.get("userId", ""),
    )


@booking_bp.get("/booking/showtimes/<string:show_id>/seats")
def get_seat_map_route(show_id: str):
    current_email = _current_user_email() or request.headers.get("X-User-Email", "").strip()
    try:
        data = _facade.get_seat_map(show_id, current_email)
    except BookingError as e:
        return jsonify({"message": e.message}), e.status
    return jsonify({"data": data}), 200


@booking_bp.post("/booking/checkout-summary")
def get_checkout_summary_route():
    payload        = request.get_json(silent=True) or {}
    provided_email = str(payload.get("email", "")).strip()
    email          = provided_email or _current_user_email()
    try:
        data = _facade.get_checkout_summary(
            show_id=str(payload.get("showId", "")).strip(),
            seat_ids=payload.get("selectedSeatIds", []),
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
        data = _facade.reserve_seats(
            show_id=str(payload.get("showId", "")).strip(),
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
        result = _facade.confirm_booking(
            show_id=str(payload.get("showId", "")).strip(),
            seat_ids=payload.get("selectedSeatIds", []),
            ticket_counts=payload.get("ticketCounts", {}),
            email=email,
        )
    except BookingError as e:
        resp = {"message": e.message}
        if e.status == 401:
            resp["requiresLogin"] = True
        return jsonify(resp), e.status

    return jsonify({
        "message": "Booking confirmed.",
        "data": {
            "bookingId":  result["bookingId"],
            "email":      result["email"],
            "totalPrice": result["totalPrice"],
        },
    }), 201
