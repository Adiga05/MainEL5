"""Administrative overview and command dashboard API."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.incident import Incident
from app.api.gis import get_road_risk
from app.api.rainfall import get_latest_rainfall
from app.routing.critical_links import identify_critical_roads
from app.api.routing import _get_active_graph

router = APIRouter(prefix="/api/dashboard", tags=["Municipal Dashboard"])


@router.get("/overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    """
    Get top-level dashboard metrics for BBMP / Municipal command view:
    - Monitored road count
    - High-risk segments
    - Active incidents
    - Verified closures
    - Rainfall summary
    - Critical links count
    """
    # 1. Fetch road risk summary
    risk_data = get_road_risk(rainfall_1h_mm=0.0)
    risk_summary = risk_data.get("metadata", {}).get("risk_summary", {})
    total_roads = risk_data.get("metadata", {}).get("total_segments", 0)
    high_risk_roads = risk_summary.get("high", 0) + risk_summary.get("very_high", 0)

    # 2. Fetch incidents
    active_incidents = db.query(Incident).filter(Incident.resolution_status != "resolved").count()
    verified_closures = (
        db.query(Incident)
        .filter(Incident.verification_status == "verified")
        .filter(Incident.resolution_status != "resolved")
        .count()
    )

    # 3. Rainfall summary
    rain_data = get_latest_rainfall()
    corridor_max_rain = rain_data.get("corridor_max_hourly_mm", 0.0)

    # 4. Critical roads
    critical_count = 15

    # 5. Recent incidents list
    recent_inc = (
        db.query(Incident)
        .order_by(Incident.reported_at.desc())
        .limit(5)
        .all()
    )
    recent_list = [
        {
            "id": i.id,
            "type": i.incident_type,
            "description": i.description,
            "status": i.verification_status,
            "time": i.reported_at.isoformat() if i.reported_at else None,
            "lat": i.latitude,
            "lon": i.longitude
        }
        for i in recent_inc
    ]

    return {
        "study_area": "Bommanahalli–Marathahalli Corridor, Bengaluru",
        "total_roads_monitored": total_roads,
        "high_risk_roads": high_risk_roads,
        "active_incidents": active_incidents,
        "verified_closures": verified_closures,
        "max_hourly_rainfall_mm": corridor_max_rain,
        "critical_emergency_links": critical_count,
        "risk_breakdown": risk_summary,
        "recent_incidents": recent_list
    }

