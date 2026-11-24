"""
Outbound email over SMTP (works with Google Workspace, Microsoft 365, Amazon SES, Resend, Brevo, ...).

Configure SMTP_HOST / SMTP_PORT / SMTP_USERNAME / SMTP_PASSWORD / SMTP_FROM.
Without SMTP_HOST: in development messages are printed to the console; elsewhere sending
fails closed (returns False) so callers can tell the user delivery isn't configured.
"""
import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings

log = logging.getLogger("klarves.email")


def email_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


def send_email(to: str, subject: str, text: str) -> bool:
    if not email_configured():
        if settings.is_development:
            print(f"\n[dev email] to={to}\nsubject={subject}\n{text}\n")
            return True
        log.error("Email not sent to %s: SMTP is not configured", to)
        return False

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    try:
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ssl.create_default_context(), timeout=15) as s:
                if settings.SMTP_USERNAME:
                    s.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                s.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as s:
                s.starttls(context=ssl.create_default_context())
                if settings.SMTP_USERNAME:
                    s.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                s.send_message(msg)
        return True
    except Exception as e:  # network / auth failures must not crash the request
        log.error("Email to %s failed: %s", to, type(e).__name__)
        return False


def send_login_code(to: str, name: str, code: str) -> bool:
    return send_email(
        to, f"Your {settings.PROJECT_NAME} sign-in code: {code}",
        f"Hi {name},\n\nYour verification code is {code}. It expires in 10 minutes.\n\n"
        "If you didn't try to sign in, ignore this email and tell your administrator.\n",
    )


def send_invitation(to: str, name: str, inviter: str, role_label: str) -> bool:
    link = f"{settings.FRONTEND_URL.rstrip('/')}/login"
    return send_email(
        to, "You've been invited to KLARVES",
        f"Hi {name},\n\n{inviter} has invited you to the KLARVES workspace as {role_label}.\n\n"
        f"Sign in with this email address at {link} - your profile is already set up.\n",
    )
