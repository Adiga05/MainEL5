"""Model run schemas."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ModelRunRead(BaseModel):
    id: int
    model_name: Optional[str] = None
    training_timestamp: Optional[datetime] = None
    metrics_json: Optional[str] = None
    dataset_version: Optional[str] = None
    feature_importance_json: Optional[str] = None
    model_path: Optional[str] = None
    is_active: Optional[bool] = None

    class Config:
        from_attributes = True


class TrainRequest(BaseModel):
    model_name: Optional[str] = "gradient_boosting"
    dataset_version: Optional[str] = "latest"
