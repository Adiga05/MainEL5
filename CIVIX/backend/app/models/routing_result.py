"""Routing result and query log model."""

from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, Text
from app.database.database import Base


class RoutingResult(Base):
    """Stores computed emergency routing results and navigation queries."""
    __tablename__ = "routing_results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String(100), nullable=True)
    origin_lat = Column(Float, nullable=False)
    origin_lon = Column(Float, nullable=False)
    dest_lat = Column(Float, nullable=False)
    dest_lon = Column(Float, nullable=False)
    dest_name = Column(String(200), nullable=True)
    vehicle_type = Column(String(50), default="ambulance")
    risk_weight = Column(Float, default=2.0)
    rainfall_mm = Column(Float, default=0.0)
    
    # Metrics
    recommended_distance_m = Column(Float, nullable=True)
    recommended_duration_s = Column(Float, nullable=True)
    recommended_risk_score = Column(Float, nullable=True)
    
    alternative_distance_m = Column(Float, nullable=True)
    alternative_duration_s = Column(Float, nullable=True)
    alternative_risk_score = Column(Float, nullable=True)
    
    # GeoJSON payload
    route_geojson = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

