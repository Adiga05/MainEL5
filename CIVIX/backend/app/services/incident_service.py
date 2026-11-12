"""Incident CRUD service."""

import logging
from datetime import datetime
from typing import Optional, List

from sqlalchemy.orm import Session

from app.models.incident import Incident

logger = logging.getLogger(__name__)


def create_incident(db: Session, data: dict) -> Incident:
    inc = Incident(
        road_id=data.get("road_id"),
        incident_type=data["incident_type"],
        description=data.get("description"),
        reported_by=data.get("reported_by"),
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
        verification_status="reported",
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    return inc


def list_incidents(
    db: Session,
    status: Optional[str] = None,
    incident_type: Optional[str] = None,
) -> List[Incident]:
    q = db.query(Incident)
    if status:
        q = q.filter(Incident.verification_status == status)
    if incident_type:
        q = q.filter(Incident.incident_type == incident_type)
    return q.order_by(Incident.reported_at.desc()).all()


def get_incident(db: Session, incident_id: int) -> Optional[Incident]:
    return db.query(Incident).filter(Incident.id == incident_id).first()


def verify_incident(db: Session, incident_id: int, verified_by: str, comments: str = None) -> Optional[Incident]:
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if inc is None:
        return None
    inc.verification_status = "verified"
    inc.verified_by = verified_by
    inc.verified_at = datetime.utcnow()
    if comments:
        inc.comments = comments
    db.commit()
    db.refresh(inc)
    return inc


def reject_incident(db: Session, incident_id: int, comments: str = None) -> Optional[Incident]:
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if inc is None:
        return None
    inc.verification_status = "rejected"
    if comments:
        inc.comments = comments
    db.commit()
    db.refresh(inc)
    return inc


def resolve_incident(db: Session, incident_id: int, resolution_status: str = "resolved", comments: str = None) -> Optional[Incident]:
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if inc is None:
        return None
    inc.verification_status = "resolved"
    inc.resolution_status = resolution_status
    if comments:
        inc.comments = comments
    db.commit()
    db.refresh(inc)
    return inc
