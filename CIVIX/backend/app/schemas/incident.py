"""Incident schemas."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class IncidentCreate(BaseModel):
    road_id: Optional[int] = None
    incident_type: str
    description: Optional[str] = None
    reported_by: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class IncidentRead(BaseModel):
    id: int
    road_id: Optional[int] = None
    incident_type: str
    description: Optional[str] = None
    reported_by: Optional[str] = None
    reported_at: Optional[datetime] = None
    verification_status: Optional[str] = None
    resolution_status: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photo_path: Optional[str] = None
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    comments: Optional[str] = None

    class Config:
        from_attributes = True


class IncidentVerify(BaseModel):
    verified_by: str
    comments: Optional[str] = None


class IncidentResolve(BaseModel):
    resolution_status: str = "resolved"
    comments: Optional[str] = None
