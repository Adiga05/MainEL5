"""Routing schemas."""

from pydantic import BaseModel
from typing import Optional, List, Any


class RouteRequest(BaseModel):
    origin_lat: float
    origin_lon: float
    dest_lat: float
    dest_lon: float
    vehicle_type: Optional[str] = "ambulance"
    risk_weight: Optional[float] = 0.5  # lambda: 0=fastest, 1=safest


class RouteSegment(BaseModel):
    road_id: int
    road_name: Optional[str] = None
    risk_category: Optional[str] = None
    length_m: Optional[float] = None
    geometry: Any = None


class RouteResponse(BaseModel):
    total_distance_m: float
    total_risk_score: float
    risk_summary: str
    segments: List[RouteSegment]
    geometry: Any = None  # Full route GeoJSON


class CriticalLink(BaseModel):
    road_id: int
    road_name: Optional[str] = None
    betweenness_centrality: float
    risk_category: Optional[str] = None
