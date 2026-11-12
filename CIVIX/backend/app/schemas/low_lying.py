"""Low-lying area schemas."""

from pydantic import BaseModel
from typing import Optional


class LowLyingAreaRead(BaseModel):
    id: int
    name: Optional[str] = None
    geometry_json: Optional[str] = None
    source_file: Optional[str] = None

    class Config:
        from_attributes = True
