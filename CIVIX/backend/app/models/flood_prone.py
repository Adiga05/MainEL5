"""Flood-prone locations model."""

from sqlalchemy import Column, Integer, String, Float

from app.database.database import Base


class FloodProneLocation(Base):
    __tablename__ = "flood_prone_locations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    source_file = Column(String(255))
