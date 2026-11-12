"""Scenario schemas."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ScenarioCreate(BaseModel):
    name: str
    description: Optional[str] = None
    scenario_type: Optional[str] = "rainfall_event"
    parameters_json: Optional[str] = None  # JSON string


class ScenarioRead(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    scenario_type: Optional[str] = None
    parameters_json: Optional[str] = None
    results_json: Optional[str] = None
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None

    class Config:
        from_attributes = True
