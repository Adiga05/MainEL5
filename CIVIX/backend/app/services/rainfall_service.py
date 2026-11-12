"""Rainfall data ingestion and query service."""

import logging
from datetime import datetime
from typing import Optional, List

import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.rainfall import RainfallObservation, RainfallStation

logger = logging.getLogger(__name__)


def ingest_rainfall_csv(db: Session, file_path: str) -> dict:
    """Ingest bangalore_urban_rainfall.csv format.

    Expected columns:
      SlNo, Station, Agency, District, Latitude, Longitude,
      Data Acquisition Time, Telemetry Hourly Rainfall (mm)
    """
    df = pd.read_csv(file_path)
    inserted = 0
    stations_seen: dict = {}

    for _, row in df.iterrows():
        station_name = str(row.get("Station", "")).strip()
        if not station_name:
            continue

        lat = float(row["Latitude"]) if pd.notna(row.get("Latitude")) else None
        lon = float(row["Longitude"]) if pd.notna(row.get("Longitude")) else None

        # Upsert station
        if station_name not in stations_seen:
            existing = db.query(RainfallStation).filter(
                RainfallStation.station_id == station_name
            ).first()
            if existing is None:
                st = RainfallStation(
                    station_id=station_name,
                    station_name=station_name,
                    latitude=lat,
                    longitude=lon,
                    source="telemetry",
                )
                db.add(st)
            stations_seen[station_name] = True

        # Parse timestamp
        ts_raw = row.get("Data Acquisition Time")
        try:
            ts = pd.to_datetime(ts_raw, dayfirst=True)
        except Exception:
            ts = None

        rainfall_mm = float(row["Telemetry Hourly Rainfall (mm)"]) if pd.notna(
            row.get("Telemetry Hourly Rainfall (mm)")
        ) else 0.0

        obs = RainfallObservation(
            station_id=station_name,
            station_name=station_name,
            latitude=lat,
            longitude=lon,
            timestamp=ts,
            rainfall_mm=rainfall_mm,
            source="observed",
            quality_flag="ok",
        )
        db.add(obs)
        inserted += 1

        if inserted % 2000 == 0:
            db.flush()

    db.commit()
    logger.info("Ingested %d rainfall observations.", inserted)
    return {"observations_inserted": inserted, "stations": len(stations_seen)}


def add_manual_observation(db: Session, data: dict) -> RainfallObservation:
    obs = RainfallObservation(
        station_id=data["station_id"],
        station_name=data["station_name"],
        latitude=data["latitude"],
        longitude=data["longitude"],
        timestamp=data["timestamp"],
        rainfall_mm=data["rainfall_mm"],
        source="manual",
        quality_flag=data.get("quality_flag", "manual"),
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)
    return obs


def get_latest_observations(db: Session, limit: int = 50) -> List[RainfallObservation]:
    return (
        db.query(RainfallObservation)
        .order_by(RainfallObservation.timestamp.desc())
        .limit(limit)
        .all()
    )


def get_history(
    db: Session,
    station_id: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
) -> List[RainfallObservation]:
    q = db.query(RainfallObservation)
    if station_id:
        q = q.filter(RainfallObservation.station_id == station_id)
    if start:
        q = q.filter(RainfallObservation.timestamp >= start)
    if end:
        q = q.filter(RainfallObservation.timestamp <= end)
    return q.order_by(RainfallObservation.timestamp.asc()).all()


def get_stations(db: Session) -> List[RainfallStation]:
    return db.query(RainfallStation).all()


def get_summary(db: Session) -> dict:
    total = db.query(func.count(RainfallObservation.id)).scalar() or 0
    station_count = db.query(func.count(RainfallStation.id)).scalar() or 0
    latest_ts = db.query(func.max(RainfallObservation.timestamp)).scalar()
    avg_rain = db.query(func.avg(RainfallObservation.rainfall_mm)).scalar()
    max_rain = db.query(func.max(RainfallObservation.rainfall_mm)).scalar()
    return {
        "total_observations": total,
        "station_count": station_count,
        "latest_timestamp": latest_ts,
        "avg_rainfall_mm": round(avg_rain, 2) if avg_rain else None,
        "max_rainfall_mm": max_rain,
    }
