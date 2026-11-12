"""Prediction schemas."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PredictionRead(BaseModel):
    id: int
    road_id: Optional[int] = None
    prediction_timestamp: Optional[datetime] = None
    prediction_horizon: Optional[str] = None
    probability: Optional[float] = None
    risk_category: Optional[str] = None
    model_version: Optional[str] = None

    class Config:
        from_attributes = True


class PredictionUpdateRequest(BaseModel):
    """Trigger prediction refresh."""
    model_version: Optional[str] = None
    horizon: Optional[str] = "6h"
