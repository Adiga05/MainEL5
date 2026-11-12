"""Road schemas."""

from pydantic import BaseModel
from typing import Optional, Any, List


class RoadRead(BaseModel):
    id: int
    osm_id: Optional[str] = None
    road_name: Optional[str] = None
    road_type: Optional[str] = None
    geometry_json: Optional[str] = None
    length_m: Optional[float] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    centroid_lat: Optional[float] = None
    centroid_lon: Optional[float] = None

    class Config:
        from_attributes = True


class RoadGeoFeature(BaseModel):
    type: str = "Feature"
    properties: dict
    geometry: Any


class RoadGeoJSON(BaseModel):
    type: str = "FeatureCollection"
    features: List[RoadGeoFeature]
