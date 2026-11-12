"""Citizen and driver incident reporting & municipal verification API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from app.database.database import get_db
from app.models.incident import Incident
from app.schemas.incident import IncidentCreate, IncidentVerify, IncidentResolve

router = APIRouter(prefix="/api/incidents", tags=["Incident Management"])


class SimpleIncidentInput(BaseModel):
    road_id: Optional[int] = None
    road_name: Optional[str] = None
    incident_type: str  # waterlogging | blocked | partial | drainage_overflow | other
    description: Optional[str] = None
    reported_by: Optional[str] = "Emergency Driver"
    latitude: float
    longitude: float


@router.get("")
def list_incidents(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all reported and verified road incidents."""
    query = db.query(Incident)
    if status_filter:
        query = query.filter(Incident.verification_status == status_filter)
    incidents = query.order_by(Incident.reported_at.desc()).all()

    return [
        {
            "id": inc.id,
            "road_id": inc.road_id,
            "incident_type": inc.incident_type,
            "description": inc.description,
            "reported_by": inc.reported_by,
            "reported_at": inc.reported_at.isoformat() if inc.reported_at else None,
            "verification_status": inc.verification_status,
            "resolution_status": inc.resolution_status,
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "verified_by": inc.verified_by,
            "verified_at": inc.verified_at.isoformat() if inc.verified_at else None,
            "comments": inc.comments
        }
        for inc in incidents
    ]


@router.post("")
def report_incident(data: SimpleIncidentInput, db: Session = Depends(get_db)):
    """Submit a driver incident report (e.g. waterlogging or road blocked)."""
    inc = Incident(
        road_id=data.road_id,
        incident_type=data.incident_type,
        description=data.description,
        reported_by=data.reported_by or "Driver",
        reported_at=datetime.utcnow(),
        verification_status="under_verification",
        resolution_status="unresolved",
        latitude=data.latitude,
        longitude=data.longitude,
        comments="Report received from emergency vehicle. Awaiting BBMP field verification."
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    return {
        "status": "success",
        "message": f"Incident #{inc.id} ({inc.incident_type}) reported successfully. Under municipal verification.",
        "incident_id": inc.id
    }


@router.patch("/{incident_id}/verify")
def verify_incident(incident_id: int, verify_data: IncidentVerify, db: Session = Depends(get_db)):
    """
    Verify an incident by municipal authority.
    Once verified as blocked, this segment is excluded from emergency routing.
    """
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    inc.verification_status = "verified"
    inc.verified_by = verify_data.verified_by or "BBMP Engineer"
    inc.verified_at = datetime.utcnow()
    if verify_data.comments:
        inc.comments = verify_data.comments
    db.commit()
    return {
        "status": "success",
        "message": f"Incident #{incident_id} verified. Road closure reflected in emergency routing.",
        "incident_id": incident_id,
        "verification_status": inc.verification_status
    }


@router.patch("/{incident_id}/reject")
def reject_incident(incident_id: int, reason: Optional[str] = "Report unconfirmed upon inspection", db: Session = Depends(get_db)):
    """Reject a false report."""
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    inc.verification_status = "rejected"
    inc.resolution_status = "rejected"
    inc.comments = reason
    db.commit()
    return {"status": "success", "message": f"Incident #{incident_id} rejected."}


@router.patch("/{incident_id}/resolve")
def resolve_incident(incident_id: int, resolve_data: IncidentResolve, db: Session = Depends(get_db)):
    """Mark a road waterlogging incident as drained and reopened to traffic."""
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    inc.resolution_status = "resolved"
    inc.verification_status = "resolved"
    if resolve_data.comments:
        inc.comments = resolve_data.comments
    db.commit()
    return {
        "status": "success",
        "message": f"Incident #{incident_id} resolved. Road reopened in routing engine.",
        "incident_id": incident_id
    }

