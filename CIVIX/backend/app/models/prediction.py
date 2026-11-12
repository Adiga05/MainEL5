"""Road prediction model."""

from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey

from app.database.database import Base


class RoadPrediction(Base):
    __tablename__ = "road_predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    road_id = Column(Integer, ForeignKey("roads.id"), index=True)
    prediction_timestamp = Column(DateTime, default=datetime.utcnow)
    prediction_horizon = Column(String(20))  # e.g. "1h", "6h", "24h"
    probability = Column(Float)
    risk_category = Column(String(20))  # low, moderate, high, very_high
    model_version = Column(String(50))
