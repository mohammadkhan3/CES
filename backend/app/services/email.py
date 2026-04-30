import ssl
ssl._create_default_https_context = ssl._create_unverified_context
import os
from abc import ABC, abstractmethod

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail


def build_confirmation_link(token: str) -> str:
    base_url = os.getenv("APP_BASE_URL", "http://localhost:3000").rstrip("/")
    path = os.getenv("EMAIL_CONFIRM_PATH", "/confirm")
    return f"{base_url}{path}?token={token}"


# ── Factory Method pattern ─────────────────────────────────────────────────────
# EmailNotification defines the interface; build_message() is the factory method
# that each concrete subclass overrides to construct its specific Mail object.

class EmailNotification(ABC):
    def __init__(self):
        self._api_key = os.getenv("SENDGRID_API_KEY")
        self._sender  = os.getenv("EMAIL_SENDER", "no-reply@ces.local")

    @abstractmethod
    def build_message(self, recipient: str) -> Mail:
        """Factory method — subclasses create and return the Mail object."""

    def send(self, recipient: str) -> None:
        if not self._api_key:
            raise RuntimeError("SENDGRID_API_KEY is not configured")
        message = self.build_message(recipient)
        SendGridAPIClient(self._api_key).send(message)


class AccountConfirmationEmail(EmailNotification):
    def __init__(self, token: str):
        super().__init__()
        self._token = token

    def build_message(self, recipient: str) -> Mail:
        link = build_confirmation_link(self._token)
        return Mail(
            from_email=self._sender,
            to_emails=recipient,
            subject="Confirm your CES Cinema account",
            plain_text_content=(
                "Hello,\n\n"
                "Thanks for creating a CES Cinema account.\n"
                "Please confirm your email address by opening the link below:\n"
                f"{link}\n\n"
                "If you did not request this, please ignore this email."
            ),
            html_content=(
                "<p>Hello,</p>"
                "<p>Thanks for creating a CES Cinema account.</p>"
                f"<p><a href='{link}'>Click here to confirm your email address</a>.</p>"
                "<p>If you did not request this, you can ignore this email.</p>"
            ),
        )


class PromotionEmail(EmailNotification):
    def __init__(self, promo_code: str, discount_pct: float, expiration_date: str):
        super().__init__()
        self._promo_code      = promo_code
        self._discount_pct    = discount_pct
        self._expiration_date = expiration_date

    def build_message(self, recipient: str) -> Mail:
        pct  = int(self._discount_pct) if self._discount_pct == int(self._discount_pct) else self._discount_pct
        code = self._promo_code
        exp  = self._expiration_date
        return Mail(
            from_email=self._sender,
            to_emails=recipient,
            subject=f"CES Cinema: {pct}% Off – Use Code {code}",
            plain_text_content=(
                f"Hello,\n\nGreat news! Use promo code {code} at checkout to get "
                f"{pct}% off your next booking.\nOffer expires on {exp}.\n\n"
                "Book your tickets at CES Cinema today!\n\n"
                "To stop receiving promotional emails, update your profile preferences."
            ),
            html_content=(
                f"<p>Hello,</p>"
                f"<p>Great news! Use promo code <strong>{code}</strong> at checkout "
                f"to get <strong>{pct}% off</strong> your next booking.</p>"
                f"<p>Offer expires on <strong>{exp}</strong>.</p>"
                f"<p>Book your tickets at CES Cinema today!</p>"
                f"<p style='font-size:12px;color:#999;'>"
                f"To stop receiving promotional emails, update your profile preferences.</p>"
            ),
        )


class BookingConfirmationEmail(EmailNotification):
    def __init__(
        self,
        booking_id: str,
        movie_title: str,
        show_date: str,
        show_time: str,
        showroom_name: str,
        seats: list,
        ticket_counts: dict,
        total_price: float,
    ):
        super().__init__()
        self._booking_id    = booking_id
        self._movie_title   = movie_title
        self._show_date     = show_date
        self._show_time     = show_time
        self._showroom_name = showroom_name
        self._seats         = seats
        self._ticket_counts = ticket_counts
        self._total_price   = total_price

    def build_message(self, recipient: str) -> Mail:
        seat_labels       = ", ".join(f"{s['row']}{s['seatNumber']}" for s in self._seats)
        ticket_lines_text = "\n".join(
            f"  {t.capitalize()}: {q}" for t, q in self._ticket_counts.items() if q > 0
        )
        ticket_lines_html = "".join(
            f"<li>{t.capitalize()}: {q}</li>" for t, q in self._ticket_counts.items() if q > 0
        )
        return Mail(
            from_email=self._sender,
            to_emails=recipient,
            subject=f"Booking Confirmed – {self._movie_title} | CES Cinema",
            plain_text_content=(
                f"Hello,\n\nYour booking is confirmed! Here are your details:\n\n"
                f"Movie:       {self._movie_title}\n"
                f"Date:        {self._show_date}\n"
                f"Time:        {self._show_time}\n"
                f"Showroom:    {self._showroom_name}\n"
                f"Seats:       {seat_labels}\n"
                f"Tickets:\n{ticket_lines_text}\n"
                f"Total Paid:  ${self._total_price:.2f}\n"
                f"Booking ID:  {self._booking_id}\n\nEnjoy the show!\n– CES Cinema"
            ),
            html_content=(
                f"<h2>Booking Confirmed!</h2>"
                f"<table style='border-collapse:collapse;'>"
                f"<tr><td><strong>Movie</strong></td><td>{self._movie_title}</td></tr>"
                f"<tr><td><strong>Date</strong></td><td>{self._show_date}</td></tr>"
                f"<tr><td><strong>Time</strong></td><td>{self._show_time}</td></tr>"
                f"<tr><td><strong>Showroom</strong></td><td>{self._showroom_name}</td></tr>"
                f"<tr><td><strong>Seats</strong></td><td>{seat_labels}</td></tr>"
                f"<tr><td><strong>Tickets</strong></td><td><ul>{ticket_lines_html}</ul></td></tr>"
                f"<tr><td><strong>Total Paid</strong></td><td>${self._total_price:.2f}</td></tr>"
                f"<tr><td><strong>Booking ID</strong></td><td>{self._booking_id}</td></tr>"
                f"</table><p>Enjoy the show! – CES Cinema</p>"
            ),
        )


class ProfileUpdateEmail(EmailNotification):
    def build_message(self, recipient: str) -> Mail:
        return Mail(
            from_email=self._sender,
            to_emails=recipient,
            subject="Your CES Profile Was Updated",
            plain_text_content=(
                "Hello,\n\nYour CES Cinema profile information was recently updated.\n"
                "If you made this change, no further action is required.\n\n"
                "If you did NOT make this change, please contact support immediately."
            ),
            html_content=(
                "<p>Hello,</p>"
                "<p>Your CES Cinema profile information was recently updated.</p>"
                "<p>If you made this change, no further action is required.</p>"
                "<p><strong>If you did NOT make this change, please contact support immediately.</strong></p>"
            ),
        )


class PasswordResetEmail(EmailNotification):
    def __init__(self, reset_link: str):
        super().__init__()
        self._reset_link = reset_link

    def build_message(self, recipient: str) -> Mail:
        link = self._reset_link
        return Mail(
            from_email=self._sender,
            to_emails=recipient,
            subject="Reset your CES Cinema password",
            plain_text_content=(
                "Hello,\n\n"
                "We received a request to reset your CES Cinema password.\n"
                "Click the link below to choose a new password (expires in 1 hour):\n\n"
                f"{link}\n\n"
                "If you did not request this, you can safely ignore this email."
            ),
            html_content=(
                "<p>Hello,</p>"
                "<p>We received a request to reset your CES Cinema password.</p>"
                f"<p><a href='{link}'>Click here to reset your password</a> (expires in 1 hour).</p>"
                "<p>If you did not request this, you can safely ignore this email.</p>"
            ),
        )


# ── Backward-compatible module-level functions ─────────────────────────────────

def send_confirmation_email(recipient_email: str, token: str) -> None:
    AccountConfirmationEmail(token).send(recipient_email)


def send_promotion_email(
    recipient_email: str,
    promo_code: str,
    discount_pct: float,
    expiration_date: str,
) -> None:
    PromotionEmail(promo_code, discount_pct, expiration_date).send(recipient_email)


def send_booking_confirmation_email(
    recipient_email: str,
    booking_id: str,
    movie_title: str,
    show_date: str,
    show_time: str,
    showroom_name: str,
    seats: list,
    ticket_counts: dict,
    total_price: float,
) -> None:
    BookingConfirmationEmail(
        booking_id, movie_title, show_date, show_time,
        showroom_name, seats, ticket_counts, total_price,
    ).send(recipient_email)


def send_profile_update_email(recipient_email: str) -> None:
    ProfileUpdateEmail().send(recipient_email)


def send_password_reset_email(recipient_email: str, reset_link: str) -> None:
    PasswordResetEmail(reset_link).send(recipient_email)
