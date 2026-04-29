from typing import Dict

from app.services.booking import confirm_booking, get_checkout_summary, get_seat_map, reserve_seats
from app.services.email import BookingConfirmationEmail


class BookingFacade:
    """
    Facade pattern — exposes the cinema booking subsystem through a single,
    simplified interface. Hides the coordination between seat reservation,
    checkout validation, booking confirmation, and email notification.
    """

    def get_seat_map(self, show_id: str, email: str) -> Dict:
        return get_seat_map(show_id, email)

    def reserve_seats(self, show_id: str, seat_ids: list, email: str) -> Dict:
        return reserve_seats(show_id, seat_ids, email)

    def get_checkout_summary(
        self,
        show_id: str,
        seat_ids: list,
        ticket_counts: dict,
        email: str,
    ) -> Dict:
        return get_checkout_summary(show_id, seat_ids, ticket_counts, email)

    def confirm_booking(
        self,
        show_id: str,
        seat_ids: list,
        ticket_counts: dict,
        email: str,
    ) -> Dict:
        result = confirm_booking(show_id, seat_ids, ticket_counts, email)
        try:
            BookingConfirmationEmail(
                booking_id=result["bookingId"],
                movie_title=result["movieTitle"],
                show_date=result["showDate"],
                show_time=result["showTime"],
                showroom_name=result["showroomName"],
                seats=result["seats"],
                ticket_counts=result["ticketCounts"],
                total_price=result["totalPrice"],
            ).send(result["email"])
        except Exception:
            pass
        return result
