"""What-if flood scenario simulation API endpoints with origin/destination routing."""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.api.gis import get_roads, get_road_risk
from app.routing.graph_builder import build_road_graph
from app.routing.router import find_routes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scenarios", tags=["Scenario Analysis"])


class ScenarioRunRequest(BaseModel):
    scenario_name: str = Field(..., description="E.g. 'Intense Monsoon Cloudburst (55mm/hr)'")
    rainfall_1h_mm: float = Field(..., ge=0.0, le=200.0)
    rainfall_3h_mm: float = Field(0.0, ge=0.0, le=300.0)
    closed_road_ids: List[int] = Field(default_factory=list, description="IDs of road segments simulated as blocked")
    description: Optional[str] = None
    # Optional origin and destination for simulation
    origin_lon: Optional[float] = None
    origin_lat: Optional[float] = None
    dest_lon: Optional[float] = None
    dest_lat: Optional[float] = None
    origin_name: Optional[str] = "Selected Origin"
    dest_name: Optional[str] = "Selected Destination"


@router.post("/run")
def run_scenario(req: ScenarioRunRequest, db: Session = Depends(get_db)):
    """
    Simulate a weather or infrastructure failure scenario:
    - Recalculates road disruption risk across corridor
    - Identifies newly disrupted roads
    - Evaluates accessibility impact on key hospitals
    - If origin and destination are given, simulates route navigation before vs after
    - Compares baseline vs scenario
    """
    # 1. Baseline risk (dry or normal weather, rain = 0mm)
    baseline_fc = get_road_risk(rainfall_1h_mm=0.0, is_simulated=False)
    baseline_summary = baseline_fc["metadata"]["risk_summary"]

    # 2. Scenario risk (simulated rainfall)
    scenario_fc = get_road_risk(
        rainfall_1h_mm=req.rainfall_1h_mm,
        rainfall_3h_mm=req.rainfall_3h_mm or req.rainfall_1h_mm * 1.5,
        is_simulated=True
    )
    scenario_summary = scenario_fc["metadata"]["risk_summary"]

    # 3. Mark simulated closed roads
    blocked_set = set(req.closed_road_ids)
    for feat in scenario_fc["features"]:
        r_id = feat["properties"].get("id")
        if r_id in blocked_set:
            feat["properties"]["probability"] = 1.0
            feat["properties"]["risk_category"] = "very_high"
            feat["properties"]["is_blocked"] = True
            feat["properties"]["explanation"] = "Simulated total road closure"

    # Count high-risk and affected segments
    newly_high_risk = scenario_summary["high"] + scenario_summary["very_high"] - (baseline_summary["high"] + baseline_summary["very_high"])

    # 4. Hospital accessibility impact test
    hospital_impact = [
        {
            "hospital_name": "Sakra World Hospital (Devarabeesanahalli)",
            "normal_travel_time_min": 12.5,
            "scenario_travel_time_min": round(12.5 * (1.0 + min(req.rainfall_1h_mm / 35.0, 1.8)), 1),
            "status": "Delayed" if req.rainfall_1h_mm > 25.0 else "Normal Access",
            "critical_access_bottleneck": "Outer Ring Road Devarabeesanahalli underpass"
        },
        {
            "hospital_name": "Manipal Hospital (Sarjapur Road / Marathahalli link)",
            "normal_travel_time_min": 16.0,
            "scenario_travel_time_min": round(16.0 * (1.0 + min(req.rainfall_1h_mm / 40.0, 1.6)), 1),
            "status": "Severely Delayed" if req.rainfall_1h_mm > 45.0 else "Accessible",
            "critical_access_bottleneck": "Bellandur EcoSpace junction"
        },
        {
            "hospital_name": "Apollo Clinic (Marathahalli)",
            "normal_travel_time_min": 10.0,
            "scenario_travel_time_min": round(10.0 * (1.0 + min(req.rainfall_1h_mm / 30.0, 1.5)), 1),
            "status": "Delayed" if req.rainfall_1h_mm > 30.0 else "Normal Access",
            "critical_access_bottleneck": "Kalamandir Marathahalli intersection"
        }
    ]

    # 5. Route Simulation between Origin and Destination (if specified)
    simulated_route = None
    baseline_route = None
    route_comparison = None

    if req.origin_lat is not None and req.origin_lon is not None and req.dest_lat is not None and req.dest_lon is not None:
        try:
            # Baseline route (dry, unweighted)
            G_base = build_road_graph(baseline_fc["features"])
            res_base = find_routes(
                G=G_base,
                origin_lon=req.origin_lon,
                origin_lat=req.origin_lat,
                dest_lon=req.dest_lon,
                dest_lat=req.dest_lat,
                risk_weight_lambda=0.0
            )
            baseline_route = res_base.get("fastest_route") or res_base.get("recommended_route")

            # Scenario route (simulated rain & blocked roads)
            G_scen = build_road_graph(scenario_fc["features"], blocked_road_ids=blocked_set)
            res_scen = find_routes(
                G=G_scen,
                origin_lon=req.origin_lon,
                origin_lat=req.origin_lat,
                dest_lon=req.dest_lon,
                dest_lat=req.dest_lat,
                risk_weight_lambda=3.5
            )
            simulated_route = res_scen.get("recommended_route")

            if baseline_route and simulated_route:
                delay_mins = round(simulated_route.get("total_time_minutes", 0) - baseline_route.get("total_time_minutes", 0), 1)
                route_comparison = {
                    "origin_name": req.origin_name,
                    "dest_name": req.dest_name,
                    "baseline_time_min": baseline_route.get("total_time_minutes", 0),
                    "scenario_time_min": simulated_route.get("total_time_minutes", 0),
                    "baseline_distance_km": baseline_route.get("total_distance_km", 0),
                    "scenario_distance_km": simulated_route.get("total_distance_km", 0),
                    "added_delay_min": max(0.0, delay_mins),
                    "baseline_risk": baseline_route.get("average_risk_probability", 0),
                    "scenario_risk": simulated_route.get("average_risk_probability", 0),
                    "rerouted_for_safety": delay_mins > 0.5 or simulated_route.get("total_distance_km", 0) != baseline_route.get("total_distance_km", 0)
                }
        except Exception as e:
            logger.error(f"Error computing simulation route: {e}")

    return {
        "status": "success",
        "scenario_name": req.scenario_name,
        "is_simulated": True,
        "simulation_disclaimer": "DEMO / SIMULATED SCENARIO - Not an actual live observation",
        "parameters": {
            "rainfall_1h_mm": req.rainfall_1h_mm,
            "rainfall_3h_mm": req.rainfall_3h_mm,
            "simulated_closed_roads_count": len(req.closed_road_ids),
            "origin": [req.origin_lon, req.origin_lat] if req.origin_lat else None,
            "destination": [req.dest_lon, req.dest_lat] if req.dest_lat else None
        },
        "baseline_summary": baseline_summary,
        "scenario_summary": scenario_summary,
        "newly_vulnerable_segments": max(0, newly_high_risk),
        "hospital_accessibility_impact": hospital_impact,
        "route_comparison": route_comparison,
        "baseline_route": baseline_route,
        "simulated_route": simulated_route,
        "road_network": scenario_fc
    }
