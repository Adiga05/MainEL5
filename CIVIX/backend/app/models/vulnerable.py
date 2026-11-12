"""Vulnerable points model."""

from sqlalchemy import Column, Integer, String, Float

from app.database.database import Base


class VulnerablePoint(Base):
    __tablename__ = "vulnerable_points"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    source_file = Column(String(255))
