"""Dataset schemas."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DatasetRead(BaseModel):
    id: int
    filename: str
    original_filename: str
    dataset_type: Optional[str] = None
    upload_timestamp: Optional[datetime] = None
    processing_status: Optional[str] = None
    metadata_json: Optional[str] = None
    file_path: str

    class Config:
        from_attributes = True


class DatasetUploadResponse(BaseModel):
    id: int
    filename: str
    message: str
