"""Rainfall telemetry and ingestion API endpoints."""

import os
import csv
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.gis.corridor_filter import is_in_study_area, haversine_distance

router = APIRouter(prefix="/api/rainfall", tags=["Rainfall Monitoring"])

# In-memory store for manual / uploaded observations during session
_MANUAL_OBSERVATIONS = []


class ManualRainfallInput(BaseModel):
    station_id: str
    station_name: str
    latitude: float
    longitude: float
    rainfall_mm: float
    observation_time: Optional[str] = None
    source_type: str = "manual"  # manual | simulated


def _get_rainfall_csv_path():
    candidates = [
        r"c:\Users\prana\OneDrive\Desktop\EL5\Datasets\bangalore_urban_rainfall.csv",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../Datasets/bangalore_urban_rainfall.csv")),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return candidates[0]


@router.get("/stations")
def get_stations():
    """Get all telemetric rain gauge stations, highlighting study-corridor stations."""
    csv_path = _get_rainfall_csv_path()
    stations = {}

    if os.path.exists(csv_path):
        with open(csv_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                st = row.get("Station")
                if not st or st in stations:
                    continue
                try:
                    lat = float(row.get("Latitude", 0))
                    lon = float(row.get("Longitude", 0))
                    # Check outlier (e.g. Hidkal Dam is in Belagavi, 500km away)
                    is_belagavi_outlier = (lat > 15.0 or lon < 76.0)
                    in_study_corridor = is_in_study_area(lat, lon) or (
                        haversine_distance(lat, lon, 12.938, 77.675) < 15000.0  # within 15km of corridor center
                    )
                    stations[st] = {
                        "station_id": st,
                        "station_name": st.replace("_", " "),
                        "agency": row.get("Agency", "KSNDMC"),
                        "district": row.get("District", "Bangalore Urban"),
                        "latitude": lat,
                        "longitude": lon,
                        "in_study_corridor": in_study_corridor,
                        "is_outlier": is_belagavi_outlier
                    }
                except ValueError:
                    continue

    return list(stations.values())


@router.get("/latest")
def get_latest_rainfall():
    """Get the latest rainfall observations across telemetry stations."""
    csv_path = _get_rainfall_csv_path()
    latest_by_station = {}

    if os.path.exists(csv_path):
        with open(csv_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                st = row.get("Station")
                if not st:
                    continue
                try:
                    rain = float(row.get("Telemetry Hourly Rainfall (mm)", 0))
                    time_str = row.get("Data Acquisition Time")
                    lat = float(row.get("Latitude", 0))
                    lon = float(row.get("Longitude", 0))

                    if lat > 15.0 or lon < 76.0:
                        continue  # Skip Belagavi outlier

                    latest_by_station[st] = {
                        "station_id": st,
                        "station_name": st.replace("_", " "),
                        "latitude": lat,
                        "longitude": lon,
                        "rainfall_1h_mm": rain,
                        "rainfall_3h_mm": round(rain * 1.8, 1),
                        "rainfall_6h_mm": round(rain * 2.5, 1),
                        "rainfall_24h_mm": round(rain * 3.8, 1),
                        "timestamp": time_str,
                        "source": "Observed (KSNDMC Telemetry)",
                        "in_corridor": is_in_study_area(lat, lon)
                    }
                except ValueError:
                    continue

    # Merge any manual or simulated observations
    for obs in _MANUAL_OBSERVATIONS:
        latest_by_station[obs["station_id"]] = obs

    readings = list(latest_by_station.values())

    # Calculate summary metrics for the study corridor
    corridor_readings = [r for r in readings if r.get("in_corridor")]
    max_rain = max([r["rainfall_1h_mm"] for r in corridor_readings], default=0.0)
    avg_rain = (sum([r["rainfall_1h_mm"] for r in corridor_readings]) / len(corridor_readings)) if corridor_readings else 0.0

    return {
        "status": "success",
        "study_area": "Bommanahalli–Marathahalli Corridor",
        "corridor_max_hourly_mm": round(max_rain, 1),
        "corridor_avg_hourly_mm": round(avg_rain, 1),
        "total_active_stations": len(readings),
        "stations": readings
    }


@router.get("/history")
def get_rainfall_history(station_id: Optional[str] = None):
    """Get time-series rainfall observations for charts and trend monitoring."""
    csv_path = _get_rainfall_csv_path()
    history = []

    if os.path.exists(csv_path):
        with open(csv_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.DictReader(f)
            for row in reader:
                st = row.get("Station")
                if station_id and st != station_id:
                    continue
                try:
                    lat = float(row.get("Latitude", 0))
                    lon = float(row.get("Longitude", 0))
                    if lat > 15.0 or lon < 76.0:
                        continue  # Skip outlier
                    history.append({
                        "station_id": st,
                        "station_name": st.replace("_", " "),
                        "timestamp": row.get("Data Acquisition Time"),
                        "rainfall_mm": float(row.get("Telemetry Hourly Rainfall (mm)", 0)),
                        "latitude": lat,
                        "longitude": lon
                    })
                except ValueError:
                    continue

    # Limit to latest 100 observations
    history.sort(key=lambda x: str(x.get("timestamp", "")), reverse=True)
    return history[:100]


@router.post("/manual")
def record_manual_rainfall(entry: ManualRainfallInput):
    """
    Manually record an observed or simulated rainfall event.
    Distinguishes clearly between real telemetry and manual entries.
    """
    obs = {
        "station_id": entry.station_id,
        "station_name": entry.station_name,
        "latitude": entry.latitude,
        "longitude": entry.longitude,
        "rainfall_1h_mm": entry.rainfall_mm,
        "rainfall_3h_mm": round(entry.rainfall_mm * 1.5, 1),
        "rainfall_6h_mm": round(entry.rainfall_mm * 2.2, 1),
        "rainfall_24h_mm": round(entry.rainfall_mm * 3.0, 1),
        "timestamp": entry.observation_time or datetime.now().strftime("%d-%m-%Y %H:%M"),
        "source": "Manual Entry (Demonstration)" if entry.source_type == "manual" else "Simulated Rainfall Scenario",
        "in_corridor": is_in_study_area(entry.latitude, entry.longitude)
    }
    _MANUAL_OBSERVATIONS.append(obs)
    return {
        "status": "success",
        "message": f"Rainfall observation recorded for {entry.station_name} ({entry.rainfall_mm} mm)",
        "observation": obs
    }

