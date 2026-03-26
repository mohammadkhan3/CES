import os

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
