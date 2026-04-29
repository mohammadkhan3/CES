import ssl
ssl._create_default_https_context = ssl._create_unverified_context
import os
import certifi

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail


def build_confirmation_link(token: str) -> str:
    base_url = os.getenv("APP_BASE_URL", "http://localhost:3000").rstrip("/")
    path = os.getenv("EMAIL_CONFIRM_PATH", "/confirm")
    return f"{base_url}{path}?token={token}"


def send_confirmation_email(recipient_email: str, token: str) -> None:
    api_key = os.getenv("SENDGRID_API_KEY")
    sender = os.getenv("EMAIL_SENDER", "no-reply@ces.local")

    if not api_key:
        raise RuntimeError("SENDGRID_API_KEY is not configured")

    link = build_confirmation_link(token)

    subject = "Confirm your CES Cinema account"
    text_body = (
        "Hello,\n\n"
        "Thanks for creating a CES Cinema account.\n"
        "Please confirm your email address by opening the link below:\n"
        f"{link}\n\n"
        "If you did not request this, please ignore this email."
    )
    html_body = (
        "<p>Hello,</p>"
        "<p>Thanks for creating a CES Cinema account.</p>"
        f"<p><a href='{link}'>Click here to confirm your email address</a>.</p>"
        "<p>If you did not request this, you can ignore this email.</p>"
    )

    message = Mail(
        from_email=sender,
        to_emails=recipient_email,
        subject=subject,
        plain_text_content=text_body,
        html_content=html_body,
    )

    client = SendGridAPIClient(api_key)
    client.send(message)

def send_promotion_email(
    recipient_email: str,
    promo_code: str,
    discount_pct: float,
    expiration_date: str,
) -> None:
    api_key = os.getenv("SENDGRID_API_KEY")
    sender  = os.getenv("EMAIL_SENDER", "no-reply@ces.local")

    if not api_key:
        raise RuntimeError("SENDGRID_API_KEY is not configured")

    pct_display = int(discount_pct) if discount_pct == int(discount_pct) else discount_pct
    subject = f"CES Cinema: {pct_display}% Off – Use Code {promo_code}"

    text_body = (
        f"Hello,\n\n"
        f"Great news! Use promo code {promo_code} at checkout to get "
        f"{pct_display}% off your next booking.\n"
        f"Offer expires on {expiration_date}.\n\n"
        f"Book your tickets at CES Cinema today!\n\n"
        f"To stop receiving promotional emails, update your profile preferences."
    )
    html_body = (
        f"<p>Hello,</p>"
        f"<p>Great news! Use promo code <strong>{promo_code}</strong> at checkout "
        f"to get <strong>{pct_display}% off</strong> your next booking.</p>"
        f"<p>Offer expires on <strong>{expiration_date}</strong>.</p>"
        f"<p>Book your tickets at CES Cinema today!</p>"
        f"<p style='font-size:12px;color:#999;'>"
        f"To stop receiving promotional emails, update your profile preferences.</p>"
    )

    message = Mail(
        from_email=sender,
        to_emails=recipient_email,
        subject=subject,
        plain_text_content=text_body,
        html_content=html_body,
    )

    client = SendGridAPIClient(api_key)
    client.send(message)


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
    api_key = os.getenv("SENDGRID_API_KEY")
    sender = os.getenv("EMAIL_SENDER", "no-reply@ces.local")

    if not api_key:
        raise RuntimeError("SENDGRID_API_KEY is not configured")

    seat_labels = ", ".join(f"{s['row']}{s['seatNumber']}" for s in seats)
    ticket_lines_text = "\n".join(
        f"  {t_type.capitalize()}: {qty}"
        for t_type, qty in ticket_counts.items()
        if qty > 0
    )
    ticket_lines_html = "".join(
        f"<li>{t_type.capitalize()}: {qty}</li>"
        for t_type, qty in ticket_counts.items()
        if qty > 0
    )

    subject = f"Booking Confirmed – {movie_title} | CES Cinema"

    text_body = (
        f"Hello,\n\n"
        f"Your booking is confirmed! Here are your details:\n\n"
        f"Movie:       {movie_title}\n"
        f"Date:        {show_date}\n"
        f"Time:        {show_time}\n"
        f"Showroom:    {showroom_name}\n"
        f"Seats:       {seat_labels}\n"
        f"Tickets:\n{ticket_lines_text}\n"
        f"Total Paid:  ${total_price:.2f}\n"
        f"Booking ID:  {booking_id}\n\n"
        f"Enjoy the show!\n"
        f"– CES Cinema"
    )
    html_body = (
        f"<h2>Booking Confirmed!</h2>"
        f"<table style='border-collapse:collapse;'>"
        f"<tr><td><strong>Movie</strong></td><td>{movie_title}</td></tr>"
        f"<tr><td><strong>Date</strong></td><td>{show_date}</td></tr>"
        f"<tr><td><strong>Time</strong></td><td>{show_time}</td></tr>"
        f"<tr><td><strong>Showroom</strong></td><td>{showroom_name}</td></tr>"
        f"<tr><td><strong>Seats</strong></td><td>{seat_labels}</td></tr>"
        f"<tr><td><strong>Tickets</strong></td><td><ul>{ticket_lines_html}</ul></td></tr>"
        f"<tr><td><strong>Total Paid</strong></td><td>${total_price:.2f}</td></tr>"
        f"<tr><td><strong>Booking ID</strong></td><td>{booking_id}</td></tr>"
        f"</table>"
        f"<p>Enjoy the show! – CES Cinema</p>"
    )

    message = Mail(
        from_email=sender,
        to_emails=recipient_email,
        subject=subject,
        plain_text_content=text_body,
        html_content=html_body,
    )

    client = SendGridAPIClient(api_key)
    client.send(message)


def send_profile_update_email(recipient_email: str) -> None:
    api_key = os.getenv("SENDGRID_API_KEY")
    sender = os.getenv("EMAIL_SENDER", "no-reply@ces.local")

    if not api_key:
        raise RuntimeError("SENDGRID_API_KEY is not configured")

    subject = "Your CES Profile Was Updated"
    text_body = (
        "Hello,\n\n"
        "Your CES Cinema profile information was recently updated.\n"
        "If you made this change, no further action is required.\n\n"
        "If you did NOT make this change, please contact support immediately."
    )
    html_body = (
        "<p>Hello,</p>"
        "<p>Your CES Cinema profile information was recently updated.</p>"
        "<p>If you made this change, no further action is required.</p>"
        "<p><strong>If you did NOT make this change, please contact support immediately.</strong></p>"
    )

    message = Mail(
        from_email=sender,
        to_emails=recipient_email,
        subject=subject,
        plain_text_content=text_body,
        html_content=html_body,
    )

    client = SendGridAPIClient(api_key)
    client.send(message)