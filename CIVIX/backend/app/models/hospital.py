"""Hospital model."""

from sqlalchemy import Column, Integer, String, Float

from app.database.database import Base


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    category = Column(String(50))  # hospital, clinic, etc.
    osm_id = Column(String(50), index=True)
    address = Column(String(500))
