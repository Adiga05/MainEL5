"""Create all tables and seed the default admin user."""

import logging

from app.database.database import engine, Base, SessionLocal
from app.core.security import hash_password

logger = logging.getLogger(__name__)


def init_db():
    """Create all tables defined on Base.metadata and seed default admin."""
    # Import all models so they register with Base
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    logger.info("All tables created.")

    _seed_admin()


def _seed_admin():
    from app.models.user import User

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if admin is None:
            admin = User(
                username="admin",
                password_hash=hash_password("admin123"),
                role="admin",
            )
            db.add(admin)
            db.commit()
            logger.info("Default admin user created (admin / admin123).")
        else:
            logger.info("Admin user already exists – skipping seed.")

        driver = db.query(User).filter(User.username == "driver1").first()
        if driver is None:
            driver = User(
                username="driver1",
                password_hash=hash_password("driver123"),
                role="driver",
            )
            db.add(driver)
            db.commit()
            logger.info("Default driver user created (driver1 / driver123).")
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_db()
