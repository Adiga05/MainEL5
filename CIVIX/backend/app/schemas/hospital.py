"""Hospital schemas."""

from pydantic import BaseModel
from typing import Optional


class HospitalRead(BaseModel):
    id: int
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: Optional[str] = None
    osm_id: Optional[str] = None
    address: Optional[str] = None

    class Config:
        from_attributes = True
