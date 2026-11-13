"""SQLAlchemy engine, session, Base, and get_db dependency.

Supports PostgreSQL with PostGIS extension, with automatic resilient fallback
to SQLite for offline local academic development.
"""

import os
import logging
from pathlib import Path
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

backend_dir = Path(__file__).resolve().parents[2]  # .../CIVIX/
data_dir = backend_dir / "data"
data_dir.mkdir(parents=True, exist_ok=True)
sqlite_fallback_path = data_dir / "civix.db"
sqlite_fallback_url = f"sqlite:///{sqlite_fallback_path.as_posix()}"

active_db_url = settings.DATABASE_URL
engine = None
is_postgres = False
has_postgis = False
db_error = None

# Normalize SQLite path if relative
if active_db_url.startswith("sqlite:///./") or active_db_url == "sqlite:///data/civix.db":
    active_db_url = sqlite_fallback_url

if active_db_url.startswith("postgresql"):
    # Ensure driver format
    pg_url = active_db_url
    if pg_url.startswith("postgresql://"):
        pg_url = pg_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    try:
        candidate_engine = create_engine(
            pg_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            echo=False
        )
        # Test active connection
        with candidate_engine.connect() as conn:
            # Check for PostGIS extension
            try:
                result = conn.execute(text("SELECT PostGIS_Version();")).fetchone()
                if result:
                    has_postgis = True
                    logger.info(f"Connected to PostgreSQL with PostGIS: {result[0]}")
            except Exception:
                logger.info("Connected to PostgreSQL (standard schema).")
        engine = candidate_engine
        is_postgres = True
    except Exception as e:
        db_error = str(e)
        logger.warning(
            f"PostgreSQL connection to {active_db_url} failed ({e}). "
            f"Falling back to local SQLite database at {sqlite_fallback_url}."
        )
        active_db_url = sqlite_fallback_url

if engine is None:
    connect_args = {"check_same_thread": False} if active_db_url.startswith("sqlite") else {}
    engine = create_engine(active_db_url, connect_args=connect_args, echo=False)
    if active_db_url.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def _set_sqlite_pragma(dbapi_conn, connection_record):
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


def get_db_info():
    """Return runtime metadata regarding the active database connection."""
    dialect = engine.dialect.name
    return {
        "dialect": dialect,
        "is_postgres": is_postgres or (dialect == "postgresql"),
        "has_postgis": has_postgis,
        "connection_url": engine.url.render_as_string(hide_password=True),
        "status": "connected",
        "error": db_error
    }
