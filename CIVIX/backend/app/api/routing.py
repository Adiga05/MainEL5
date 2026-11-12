"""Emergency vehicle routing and critical links API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.incident import Incident
from app.api.gis import get_road_risk
from app.routing.graph_builder import build_road_graph
from app.routing.router import find_routes
from app.routing.critical_links import identify_critical_roads

router = APIRouter(prefix="/api/routes", tags=["Emergency Routing"])

_CACHED_GRAPH = None


class RouteRequest(BaseModel):
    origin_lon: float = Field(..., description="Origin longitude")
    origin_lat: float = Field(..., description="Origin latitude")
    dest_lon: float = Field(..., description="Destination longitude (e.g. Hospital)")
    dest_lat: float = Field(..., description="Destination latitude")
    risk_weight: float = Field(2.0, ge=0.0, le=10.0, description="Risk penalty parameter (lambda)")
    vehicle_type: str = Field("ambulance", description="ambulance | fire_engine | general")
    rainfall_1h_mm: float = Field(0.0, ge=0.0, description="Current or simulated rainfall in mm")


def _get_active_graph(db: Session, rainfall_mm: float = 0.0):
    # Fetch road segments with current risk evaluations
    roads_fc = get_road_risk(rainfall_1h_mm=rainfall_mm)
    roads = roads_fc.get("features", [])

    # Fetch verified closures
    blocked_incidents = (
        db.query(Incident)
        .filter(Incident.verification_status == "verified")
        .filter(Incident.resolution_status != "resolved")
        .all()
    )
    blocked_ids = {inc.road_id for inc in blocked_incidents if inc.road_id is not None}

    G = build_road_graph(roads, blocked_road_ids=blocked_ids)
    return G


@router.post("/recommend")
def calculate_recommended_route(req: RouteRequest, db: Session = Depends(get_db)):
    """
    Calculate flood-aware recommended emergency route and alternatives.
    Incorporates real-time road risk and excludes verified road closures.
    """
    G = _get_active_graph(db, rainfall_mm=req.rainfall_1h_mm)
    res = find_routes(
        G=G,
        origin_lon=req.origin_lon,
        origin_lat=req.origin_lat,
        dest_lon=req.dest_lon,
        dest_lat=req.dest_lat,
        risk_weight_lambda=req.risk_weight,
        vehicle_type=req.vehicle_type
    )
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@router.get("/critical-links")
def get_critical_road_links(db: Session = Depends(get_db)):
    """
    Identify high-betweenness bottleneck roads critical for hospital and emergency connectivity.
    """
    G = _get_active_graph(db, rainfall_mm=0.0)
    critical_roads = identify_critical_roads(G, top_n=15)
    return {
        "status": "success",
        "study_area": "Bommanahalli–Marathahalli Corridor",
        "description": "Road segments whose disruption significantly impairs emergency vehicle transit and hospital accessibility.",
        "critical_roads": critical_roads
    }

