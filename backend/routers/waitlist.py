import hmac
import html
import logging
import os
import re
import secrets
import smtplib
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from threading import Lock

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.exc import IntegrityError

from database import SessionLocal
from models import WaitlistEntry

log = logging.getLogger("waitlist")

router = APIRouter(prefix="/waitlist", tags=["waitlist"])

# In-memory store: email -> { code, data, expires_at, cooldown, attempts }
# NOTE: this is per-process. For multi-worker deploys move to Redis.
_pending: dict[str, dict] = {}
_pending_lock = Lock()

# Per-IP rate limit window for /send-code
# ip -> list[timestamp]
_ip_hits: dict[str, list[float]] = {}
_ip_lock = Lock()
_IP_WINDOW_SECONDS = 3600         # 1 hour
_IP_MAX_REQUESTS = 10             # 10 send-code calls per IP per hour
_MAX_PENDING = 10_000             # cap to prevent memory DoS
_MAX_ATTEMPTS = 5                 # max verify attempts per pending entry

SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

_CONTROL_CHARS_RE = re.compile(r"[\x00-\x1f\x7f]")


def _clean_text(value: str, max_len: int) -> str:
    """Strip control chars (incl. CR/LF for header injection), trim, cap length."""
    cleaned = _CONTROL_CHARS_RE.sub("", value).strip()
    return cleaned[:max_len]


def _sweep_pending() -> None:
    """Drop expired entries. Called on every write; cheap at N<10k."""
    now = time.time()
    with _pending_lock:
        expired = [k for k, v in _pending.items() if v["expires_at"] < now]
        for k in expired:
            _pending.pop(k, None)


def _check_ip_rate_limit(ip: str) -> None:
    now = time.time()
    cutoff = now - _IP_WINDOW_SECONDS
    with _ip_lock:
        hits = [t for t in _ip_hits.get(ip, []) if t > cutoff]
        if len(hits) >= _IP_MAX_REQUESTS:
            raise HTTPException(429, "Too many requests. Please try again later.")
        hits.append(now)
        _ip_hits[ip] = hits
        # Opportunistic cleanup to keep the dict bounded
        if len(_ip_hits) > 50_000:
            for k in list(_ip_hits.keys()):
                if not _ip_hits[k] or _ip_hits[k][-1] < cutoff:
                    _ip_hits.pop(k, None)


def _send_email(to_email: str, subject: str, text: str, html_body: str) -> None:
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        return
    msg = MIMEMultipart("alternative")
    msg["From"] = f"Optima <{SMTP_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        log.warning("SMTP send failed for %s: %s", to_email, e)


def _send_welcome_email(to_email: str, name: str, role: str) -> None:
    first = name.split()[0] if name.split() else name
    first_h = html.escape(first)
    if role == "company":
        what_next = (
            "When early access opens, you\u2019ll be able to post jobs, add custom "
            "interview questions, and receive a ranked list of qualified candidates "
            "\u2014 all powered by AI."
        )
    else:
        what_next = (
            "When early access opens, you\u2019ll be able to take AI-powered interviews, "
            "get matched to top companies, and track your progress \u2014 all from one place."
        )

    step_three_title = (
        "Start hiring smarter" if role == "company" else "Take your first interview"
    )
    step_three_body = (
        "post jobs and receive AI-ranked candidates."
        if role == "company"
        else "let AI match you to the right opportunities."
    )

    text = (
        f"Hi {first},\n\n"
        f"Welcome to the Optima waitlist! You\u2019re officially in.\n\n"
        f"{what_next}\n\n"
        f"We\u2019ll send you an email the moment your spot is ready. "
        f"In the meantime, thank you for believing in a better way to hire.\n\n"
        f"See you soon,\n"
        f"The Optima Team"
    )

    html_body = f"""\
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;color:#374151;">
  <div style="text-align:center;margin-bottom:36px;">
    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#14b8a6);margin-right:8px;vertical-align:middle;"></span>
    <span style="font-size:20px;font-weight:700;letter-spacing:-0.5px;color:#111827;vertical-align:middle;">Optima</span>
  </div>
  <h1 style="font-size:26px;font-weight:700;color:#111827;text-align:center;margin:0 0 8px;">You\u2019re on the list!</h1>
  <p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 32px;line-height:1.6;">Welcome aboard, {first_h}. We\u2019re excited to have you.</p>

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:28px 24px;margin-bottom:28px;">
    <h2 style="font-size:16px;font-weight:600;color:#111827;margin:0 0 12px;">What happens next?</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:8px 12px 8px 0;vertical-align:top;width:28px;">
          <div style="width:24px;height:24px;border-radius:50%;background:#eef2ff;border:1px solid #c7d2fe;color:#4f46e5;font-size:12px;font-weight:700;text-align:center;line-height:24px;">1</div>
        </td>
        <td style="padding:8px 0;font-size:14px;color:#374151;line-height:1.5;"><strong>Watch your inbox</strong> \u2014 we\u2019ll notify you when early access opens.</td>
      </tr>
      <tr>
        <td style="padding:8px 12px 8px 0;vertical-align:top;">
          <div style="width:24px;height:24px;border-radius:50%;background:#eef2ff;border:1px solid #c7d2fe;color:#4f46e5;font-size:12px;font-weight:700;text-align:center;line-height:24px;">2</div>
        </td>
        <td style="padding:8px 0;font-size:14px;color:#374151;line-height:1.5;"><strong>Set up your profile</strong> \u2014 the more complete it is, the better your matches.</td>
      </tr>
      <tr>
        <td style="padding:8px 12px 8px 0;vertical-align:top;">
          <div style="width:24px;height:24px;border-radius:50%;background:#eef2ff;border:1px solid #c7d2fe;color:#4f46e5;font-size:12px;font-weight:700;text-align:center;line-height:24px;">3</div>
        </td>
        <td style="padding:8px 0;font-size:14px;color:#374151;line-height:1.5;"><strong>{step_three_title}</strong> \u2014 {step_three_body}</td>
      </tr>
    </table>
  </div>

  <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:0 0 28px;">{html.escape(what_next)}</p>

  <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:0 0 4px;">Thank you for believing in a better way to hire.</p>
  <p style="font-size:14px;color:#374151;font-weight:600;margin:0;">The Optima Team</p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:36px 0 20px;" />
  <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">You\u2019re receiving this because you joined the Optima waitlist.</p>
</div>"""

    _send_email(to_email, "Welcome to Optima \u2014 you\u2019re on the list!", text, html_body)


def _send_already_on_list_email(to_email: str, name: str) -> None:
    """Sent when someone tries to re-join with an email that's already on the list.
    Used to avoid leaking membership via the API response."""
    first = name.split()[0] if name.split() else "there"
    first_h = html.escape(first)
    text = (
        f"Hi {first},\n\n"
        f"Good news \u2014 you\u2019re already on the Optima waitlist. "
        f"We\u2019ll reach out as soon as early access opens.\n\n"
        f"\u2014 The Optima Team"
    )
    html_body = f"""\
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:32px;">
    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#14b8a6);margin-right:8px;vertical-align:middle;"></span>
    <span style="font-size:20px;font-weight:700;letter-spacing:-0.5px;color:#111827;vertical-align:middle;">Optima</span>
  </div>
  <h1 style="font-size:22px;font-weight:700;color:#111827;text-align:center;margin:0 0 12px;">You\u2019re already on the list</h1>
  <p style="font-size:15px;color:#6b7280;text-align:center;line-height:1.6;">Hi {first_h}, you\u2019re already on the Optima waitlist \u2014 no need to sign up again. We\u2019ll reach out as soon as early access opens.</p>
</div>"""
    _send_email(to_email, "You\u2019re already on the Optima waitlist", text, html_body)


def _send_code_email(to_email: str, code: str, name: str) -> None:
    name_h = html.escape(name)
    text = (
        f"Hi {name},\n\n"
        f"Your verification code is: {code}\n\n"
        f"This code expires in 10 minutes.\n\n\u2014 Optima"
    )
    html_body = f"""\
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:32px;">
    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#14b8a6);margin-right:8px;vertical-align:middle;"></span>
    <span style="font-size:20px;font-weight:700;letter-spacing:-0.5px;color:#111827;vertical-align:middle;">Optima</span>
  </div>
  <h1 style="font-size:24px;font-weight:700;color:#111827;text-align:center;margin:0 0 8px;">Verify your email</h1>
  <p style="font-size:15px;color:#6b7280;text-align:center;margin:0 0 32px;">Hi {name_h}, enter this code to join the waitlist.</p>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
    <span style="font-family:'SF Mono',SFMono-Regular,Consolas,monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#4f46e5;">{code}</span>
  </div>
  <p style="font-size:13px;color:#9ca3af;text-align:center;">This code expires in 10 minutes.</p>
</div>"""

    _send_email(to_email, f"Your Optima verification code: {code}", text, html_body)


class WaitlistJoin(BaseModel):
    role: str
    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    age: int | None = Field(default=None, ge=13, le=120)
    company_name: str | None = Field(default=None, max_length=160)
    company_location: str | None = Field(default=None, max_length=160)

    @field_validator("full_name", "company_name", "company_location")
    @classmethod
    def _no_control_chars(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if _CONTROL_CHARS_RE.search(v):
            raise ValueError("Contains invalid characters")
        return v


class VerifyCode(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


@router.post("/send-code")
def send_code(
    data: WaitlistJoin,
    request: Request,
    background_tasks: BackgroundTasks,
):
    if data.role not in ("candidate", "company"):
        raise HTTPException(400, "Role must be 'candidate' or 'company'")

    full_name = _clean_text(data.full_name, 120)
    if not full_name or not full_name.split():
        raise HTTPException(400, "Full name is required")

    if data.role == "company":
        company_name = _clean_text(data.company_name or "", 160)
        if not company_name:
            raise HTTPException(400, "Company name is required")
    else:
        if data.age is None:
            raise HTTPException(400, "Age is required for candidates")

    if not SMTP_EMAIL or not SMTP_PASSWORD:
        raise HTTPException(500, "Email service is not configured")

    email = data.email.lower().strip()

    # Per-IP rate limit (independent of email rotation)
    client_ip = request.client.host if request.client else "unknown"
    _check_ip_rate_limit(client_ip)

    _sweep_pending()

    # Check if already on waitlist — do NOT leak via response (enumeration).
    db = SessionLocal()
    try:
        existing = db.query(WaitlistEntry).filter(WaitlistEntry.email == email).first()
    finally:
        db.close()

    if existing:
        # Tell the real owner via email; keep the API response identical.
        background_tasks.add_task(_send_already_on_list_email, email, full_name)
        return {"ok": True, "message": "Verification code sent"}

    # Per-email resend cooldown (defense against resend spam from same email)
    with _pending_lock:
        pending = _pending.get(email)
        if pending and time.time() < pending.get("cooldown", 0):
            raise HTTPException(429, "Please wait before requesting a new code")

        if len(_pending) >= _MAX_PENDING:
            raise HTTPException(503, "Service temporarily busy. Please try again shortly.")

        code = f"{secrets.randbelow(1_000_000):06d}"
        cleaned = data.model_dump()
        cleaned["full_name"] = full_name
        if cleaned.get("company_name"):
            cleaned["company_name"] = _clean_text(cleaned["company_name"], 160)
        if cleaned.get("company_location"):
            cleaned["company_location"] = _clean_text(cleaned["company_location"], 160)

        _pending[email] = {
            "code": code,
            "data": cleaned,
            "expires_at": time.time() + 600,   # 10 min
            "cooldown": time.time() + 60,      # 1 min between resends
            "attempts": 0,
        }

    first_name = full_name.split()[0]
    background_tasks.add_task(_send_code_email, email, code, first_name)

    return {"ok": True, "message": "Verification code sent"}


@router.post("/verify")
def verify_code(body: VerifyCode, background_tasks: BackgroundTasks):
    email = body.email.lower().strip()
    submitted = body.code.strip()

    with _pending_lock:
        pending = _pending.get(email)

        if not pending:
            raise HTTPException(
                400,
                "No verification code found for this email. Please request a new one.",
            )

        if time.time() > pending["expires_at"]:
            _pending.pop(email, None)
            raise HTTPException(
                410, "Verification code has expired. Please request a new one."
            )

        if pending["attempts"] >= _MAX_ATTEMPTS:
            _pending.pop(email, None)
            raise HTTPException(
                429,
                "Too many incorrect attempts. Please request a new code.",
            )

        pending["attempts"] += 1

        if not hmac.compare_digest(pending["code"], submitted):
            remaining = _MAX_ATTEMPTS - pending["attempts"]
            if remaining <= 0:
                _pending.pop(email, None)
                raise HTTPException(
                    429,
                    "Too many incorrect attempts. Please request a new code.",
                )
            raise HTTPException(400, "Incorrect verification code")

        # Correct — remove pending and proceed
        data = pending["data"]
        _pending.pop(email, None)

    db = SessionLocal()
    try:
        entry = WaitlistEntry(
            role=data["role"],
            full_name=data["full_name"],
            email=email,
            age=data.get("age"),
            company_name=data.get("company_name"),
            company_location=data.get("company_location"),
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)

        background_tasks.add_task(
            _send_welcome_email, email, data["full_name"], data["role"]
        )

        return {
            "ok": True,
            "message": "You're on the waitlist!",
            "entry": {
                "id": entry.id,
                "role": entry.role,
                "full_name": entry.full_name,
                "email": entry.email,
            },
        }
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "This email is already on the waitlist")
    finally:
        db.close()
