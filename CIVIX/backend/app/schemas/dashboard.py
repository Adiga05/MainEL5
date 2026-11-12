"""Dashboard schemas."""

from pydantic import BaseModel
from typing import Optional, Dict, List, Any


class DashboardOverview(BaseModel):
    total_roads: int = 0
    total_hospitals: int = 0
    total_incidents: int = 0
    active_incidents: int = 0
    flood_prone_count: int = 0
    rainfall_stations: int = 0
    latest_rainfall_mm: Optional[float] = None
    risk_distribution: Dict[str, int] = {}
    recent_incidents: List[Any] = []
    complaint_summary: Dict[str, int] = {}
