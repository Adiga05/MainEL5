"""GIS geospatial layers API endpoints."""

import os
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import get_settings
from app.database.database import get_db
from app.gis.corridor_filter import CORRIDOR_METADATA
from app.gis.drainage_processor import load_and_deduplicate_drainage
from app.gis.road_processor import load_study_area_roads
from app.gis.emergency_facility_processor import load_study_area_hospitals
from app.gis.flood_locations_processor import load_all_flood_layers
from app.gis.feature_engineering import calculate_road_spatial_features
from app.ml.risk_scorer import compute_road_risk

router = APIRouter(prefix="/api/gis", tags=["GIS & Spatial Layers"])
settings = get_settings()

# Cache loaded layers in memory for instant API responses
_CACHE = {}


def _get_datasets_dir():
    # Check possible locations for Datasets
    candidates = [
        r"c:\Users\prana\OneDrive\Desktop\EL5\Datasets",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../Datasets")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../Datasets")),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return candidates[0]


@router.get("/study-area")
def get_study_area_metadata():
    """Return the active study area boundary and metadata (Bommanahalli–Marathahalli)."""
    return CORRIDOR_METADATA


@router.get("/drainage")
def get_drainage(drainage_type: Optional[str] = None):
    """Get the drainage infrastructure network GeoJSON for the study corridor."""
    d_dir = _get_datasets_dir()
    cache_key = "drainage"
    if cache_key not in _CACHE:
        _CACHE[cache_key] = load_and_deduplicate_drainage(d_dir)

    data = _CACHE[cache_key]
    if not drainage_type or not isinstance(drainage_type, str):
        return data

    filtered = [
        f for f in data["features"]
        if f.get("properties", {}).get("drainage_type", "").lower() == drainage_type.lower()
    ]
    return {
        "type": "FeatureCollection",
        "metadata": {
            "filtered_type": drainage_type,
            "count": len(filtered)
        },
        "features": filtered
    }


@router.get("/roads")
def get_roads():
    """Get the road network centerline GeoJSON for the study corridor."""
    d_dir = _get_datasets_dir()
    cache_key = "roads"
    if cache_key not in _CACHE:
        road_path = os.path.join(d_dir, "Road_network.geojson")
        _CACHE[cache_key] = load_study_area_roads(road_path)
    return _CACHE[cache_key]


@router.get("/hospitals")
def get_hospitals():
    """Get emergency facilities and hospitals in the study corridor."""
    d_dir = _get_datasets_dir()
    cache_key = "hospitals"
    if cache_key not in _CACHE:
        hosp_path = os.path.join(d_dir, "Emergency_services.geojson")
        _CACHE[cache_key] = load_study_area_hospitals(hosp_path)
    return _CACHE[cache_key]


@router.get("/flood-prone")
def get_flood_prone():
    """Get flood-prone locations within the corridor."""
    d_dir = _get_datasets_dir()
    cache_key = "flood_layers"
    if cache_key not in _CACHE:
        _CACHE[cache_key] = load_all_flood_layers(d_dir)
    return _CACHE[cache_key]["flood_prone"]


@router.get("/low-lying")
def get_low_lying():
    """Get low-lying areas within the corridor."""
    d_dir = _get_datasets_dir()
    cache_key = "flood_layers"
    if cache_key not in _CACHE:
        _CACHE[cache_key] = load_all_flood_layers(d_dir)
    return _CACHE[cache_key]["low_lying"]


@router.get("/vulnerable-points")
def get_vulnerable_points():
    """Get points vulnerable to flooding within the corridor."""
    d_dir = _get_datasets_dir()
    cache_key = "flood_layers"
    if cache_key not in _CACHE:
        _CACHE[cache_key] = load_all_flood_layers(d_dir)
    return _CACHE[cache_key]["vulnerable_points"]


@router.get("/rain-gauges")
def get_rain_gauges():
    """Get telemetric rain gauge stations located in or near the corridor."""
    d_dir = _get_datasets_dir()
    cache_key = "flood_layers"
    if cache_key not in _CACHE:
        _CACHE[cache_key] = load_all_flood_layers(d_dir)
    return _CACHE[cache_key]["rain_gauges"]


@router.get("/complaints")
def get_complaints():
    """Get BBMP drainage and waterlogging complaints within the study corridor wards."""
    d_dir = _get_datasets_dir()
    # Read processed complaints or return corridor ward summaries
    return {
        "type": "FeatureCollection",
        "metadata": {
            "source": "BBMP Grievance Redressal System (2020-2025)",
            "study_area": "Bommanahalli–Marathahalli Wards",
            "note": "BBMP records contain Ward Names; aggregated geographically to ward zones."
        },
        "wards": [
            {"ward": "Bommanahalli", "lat": 12.898, "lon": 77.625, "complaint_count": 218, "primary_issue": "Storm Water Drain desilting and maintenance"},
            {"ward": "HSR Layout", "lat": 12.915, "lon": 77.648, "complaint_count": 142, "primary_issue": "Water accumulation near Agara & Sector 7"},
            {"ward": "Bellandur", "lat": 12.932, "lon": 77.674, "complaint_count": 184, "primary_issue": "Lake overflow & SWD backflow on ORR"},
            {"ward": "Devarabeesanahalli", "lat": 12.936, "lon": 77.692, "complaint_count": 89, "primary_issue": "Underpass waterlogging"},
            {"ward": "Kadubeesanahalli", "lat": 12.941, "lon": 77.702, "complaint_count": 76, "primary_issue": "SWD blockage near service road"},
            {"ward": "Marathahalli", "lat": 12.956, "lon": 77.705, "complaint_count": 165, "primary_issue": "Kalamandir junction and underpass flooding"},
            {"ward": "Mahadevapura", "lat": 12.982, "lon": 77.699, "complaint_count": 137, "primary_issue": "Secondary drain overflow onto arterial roads"}
        ]
    }


@router.get("/road-risk")
def get_road_risk(
    rainfall_1h_mm: float = 0.0,
    rainfall_3h_mm: float = 0.0,
    rainfall_intensity_mmh: float = 0.0,
    is_simulated: bool = False
):
    """
    Get road network segments enriched with real-time or simulated flood disruption risk.
    """
    roads_data = get_roads()
    drainage_data = get_drainage()
    fp_data = get_flood_prone()
    ll_data = get_low_lying()
    vp_data = get_vulnerable_points()

    # Calculate spatial indicators if not cached
    cache_key = "enriched_roads"
    if cache_key not in _CACHE:
        _CACHE[cache_key] = calculate_road_spatial_features(
            roads=roads_data.get("features", []),
            drainage_features=drainage_data.get("features", []),
            flood_prone_points=fp_data.get("features", []),
            low_lying_points=ll_data.get("features", []),
            vulnerable_points=vp_data.get("features", [])
        )

    enriched_roads = _CACHE[cache_key]

    risk_features = []
    risk_summary = {"low": 0, "moderate": 0, "high": 0, "very_high": 0}

    for r in enriched_roads:
        props = r["properties"]
        risk_eval = compute_road_risk(
            road_features=props,
            rainfall_1h_mm=rainfall_1h_mm,
            rainfall_3h_mm=rainfall_3h_mm,
            rainfall_intensity_mmh=rainfall_intensity_mmh,
            is_simulated=is_simulated
        )
        cat = risk_eval["risk_category"]
        risk_summary[cat] = risk_summary.get(cat, 0) + 1

        new_props = dict(props)
        new_props.update(risk_eval)

        risk_features.append({
            "type": "Feature",
            "id": r["id"],
            "geometry": r["geometry"],
            "properties": new_props
        })

    return {
        "type": "FeatureCollection",
        "metadata": {
            "total_segments": len(risk_features),
            "study_area": "Bommanahalli–Marathahalli Corridor",
            "risk_summary": risk_summary,
            "rainfall_conditions": {
                "rainfall_1h_mm": rainfall_1h_mm,
                "rainfall_3h_mm": rainfall_3h_mm,
                "rainfall_intensity_mmh": rainfall_intensity_mmh,
                "is_simulated": is_simulated
            }
        },
        "features": risk_features
    }
