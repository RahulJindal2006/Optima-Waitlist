import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

# In production (Vercel), DATABASE_URL is injected by Vercel Postgres (Neon).
# Locally, fall back to SQLite for development.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nexus.db")

# Neon connection strings start with "postgres://" but SQLAlchemy requires "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # NullPool is critical for serverless — prevents stale connections across invocations
    engine = create_engine(DATABASE_URL, poolclass=NullPool)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from models import Base  # noqa: F401 — ensures all models are registered
    Base.metadata.create_all(bind=engine)
