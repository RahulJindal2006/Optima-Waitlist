from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from database import Base


def _utcnow() -> datetime:
    """Naive UTC timestamp. Replaces deprecated datetime.utcnow while keeping the
    stored value naive so existing code that compares against naive datetimes
    continues to work."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class WaitlistEntry(Base):
    __tablename__ = "waitlist"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, nullable=False)          # "candidate" | "company"
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    age = Column(Integer, nullable=True)
    company_name = Column(String, nullable=True)
    company_location = Column(String, nullable=True)
    created_at = Column(DateTime, default=_utcnow)
