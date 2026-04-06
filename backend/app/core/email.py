"""Transactional email (SMTP). Optional — when SMTP_HOST is unset, sends are skipped and logged."""

from __future__ import annotations

import html
import logging
import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import urlencode

from app.core.config import Settings

logger = logging.getLogger(__name__)


def _frontend_base(settings: Settings) -> str:
    return (settings.FRONTEND_BASE_URL or settings.APP_BASE_URL or "http://127.0.0.1:3000").rstrip("/")


def build_tenant_invite_url(settings: Settings, *, token: str, email: str) -> str:
    base = _frontend_base(settings)
    q = urlencode({"token": token, "email": email})
    return f"{base}/accept-invite?{q}"


def send_smtp_email(
    settings: Settings,
    *,
    to_email: str,
    subject: str,
    text_body: str,
    html_body: str | None = None,
) -> bool:
    if not settings.SMTP_HOST or not settings.SMTP_FROM:
        logger.warning(
            "Email not sent (configure SMTP_HOST and SMTP_FROM): subject=%r to=%s",
            subject,
            to_email,
        )
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg.set_content(text_body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    try:
        if settings.SMTP_USE_SSL:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context) as smtp:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
                smtp.ehlo()
                if settings.SMTP_USE_TLS:
                    smtp.starttls(context=ssl.create_default_context())
                    smtp.ehlo()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                smtp.send_message(msg)
    except Exception:
        logger.exception("SMTP send failed to %s", to_email)
        return False

    logger.info("Email sent: subject=%r to=%s", subject, to_email)
    return True


def send_tenant_admin_invite_email(
    settings: Settings,
    *,
    to_email: str,
    organisation_name: str,
    invite_token: str,
    is_resend: bool = False,
) -> bool:
    if not settings.ENABLE_TENANT_INVITE_EMAIL:
        logger.debug("Tenant invite email skipped (ENABLE_TENANT_INVITE_EMAIL is false)")
        return False

    safe_org = html.escape(organisation_name.strip() or "your organisation")
    invite_url = build_tenant_invite_url(settings, token=invite_token, email=to_email)
    safe_url = html.escape(invite_url)

    subject = (
        "Your Protexi tenant admin invite — set your password"
        if not is_resend
        else "Your Protexi tenant admin invite — link resent"
    )

    text_body = f"""Hello,

You have been added as a tenant administrator for {organisation_name.strip() or "your organisation"} on Protexi.

Open this link to set your password and activate your account (valid for 7 days):
{invite_url}

After setting your password, sign in at:
{_frontend_base(settings)}/login

If you did not expect this email, you can ignore it.

— Protexi
"""

    html_body = f"""<!DOCTYPE html>
<html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#0f172a;">
<p>Hello,</p>
<p>You have been added as a <strong>tenant administrator</strong> for <strong>{safe_org}</strong> on Protexi.</p>
<p><a href="{safe_url}" style="color:#1a4fa0;font-weight:600;">Set your password and activate your account</a></p>
<p style="font-size:13px;color:#64748b;">This link expires in 7 days. If the button does not work, copy and paste:<br/>
<code style="word-break:break-all;font-size:12px;">{safe_url}</code></p>
<p>After setting your password, sign in at <a href="{html.escape(_frontend_base(settings) + "/login")}">the login page</a>.</p>
<p style="font-size:13px;color:#94a3b8;">— Protexi</p>
</body></html>"""

    return send_smtp_email(
        settings,
        to_email=to_email,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
    )
