"""SQLAlchemy engine, session, Base, and get_db dependency."""

import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings

settings = get_settings()

# Use absolute path for SQLite to prevent relative directory issues
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite:///./") or db_url == "sqlite:///data/civix.db":
    backend_dir = Path(__file__).resolve().parents[2]  # .../CIVIX/
    data_dir = backend_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    db_path = data_dir / "civix.db"
    db_url = f"sqlite:///{db_path.as_posix()}"

connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine = create_engine(db_url, connect_args=connect_args, echo=False)

# Enable WAL mode for better concurrent reads
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    if db_url.startswith("sqlite"):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
