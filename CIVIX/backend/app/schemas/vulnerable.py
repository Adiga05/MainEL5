"""Vulnerable point schemas."""

from pydantic import BaseModel
from typing import Optional


class VulnerablePointRead(BaseModel):
    id: int
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source_file: Optional[str] = None

    class Config:
        from_attributes = True
