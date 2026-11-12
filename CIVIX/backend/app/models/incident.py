"""Incident model."""

from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey

from app.database.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    road_id = Column(Integer, ForeignKey("roads.id"), nullable=True, index=True)
    incident_type = Column(String(30), nullable=False)  # waterlogging, blocked, partial, drainage_overflow, other
    description = Column(Text)
    reported_by = Column(String(100))
    reported_at = Column(DateTime, default=datetime.utcnow)
    verification_status = Column(String(30), default="reported")  # reported, under_verification, verified, rejected, resolved
    resolution_status = Column(String(30))
    latitude = Column(Float)
    longitude = Column(Float)
    photo_path = Column(String(500))
    verified_by = Column(String(100))
    verified_at = Column(DateTime)
    comments = Column(Text)
