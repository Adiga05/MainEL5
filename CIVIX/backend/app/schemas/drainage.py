"""Drainage schemas."""

from pydantic import BaseModel
from typing import Optional


class DrainageRead(BaseModel):
    id: int
    drainage_type: str
    geometry_json: Optional[str] = None
    attributes_json: Optional[str] = None
    source_file: Optional[str] = None

    class Config:
        from_attributes = True
