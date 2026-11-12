"""Rainfall schemas."""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class RainfallObservationRead(BaseModel):
    id: int
    station_id: Optional[str] = None
    station_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: Optional[datetime] = None
    rainfall_mm: Optional[float] = None
    source: Optional[str] = None
    quality_flag: Optional[str] = None

    class Config:
        from_attributes = True


class RainfallManualInput(BaseModel):
    station_id: str
    station_name: str
    latitude: float
    longitude: float
    timestamp: datetime
    rainfall_mm: float
    quality_flag: Optional[str] = "manual"


class RainfallStationRead(BaseModel):
    id: int
    station_id: str
    station_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source: Optional[str] = None

    class Config:
        from_attributes = True


class RainfallSummary(BaseModel):
    total_observations: int
    station_count: int
    latest_timestamp: Optional[datetime] = None
    avg_rainfall_mm: Optional[float] = None
    max_rainfall_mm: Optional[float] = None
