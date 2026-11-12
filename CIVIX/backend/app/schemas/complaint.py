"""Complaint schemas."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ComplaintRead(BaseModel):
    id: int
    complaint_id_original: Optional[str] = None
    category: Optional[str] = None
    sub_category: Optional[str] = None
    complaint_date: Optional[datetime] = None
    ward_name: Optional[str] = None
    status: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source_file: Optional[str] = None
    year: Optional[int] = None

    class Config:
        from_attributes = True
