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