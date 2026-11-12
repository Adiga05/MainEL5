"""BBMP complaint data ingestion service."""

import logging
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

from app.models.complaint import Complaint

logger = logging.getLogger(__name__)


def ingest_bbmp_csv(db: Session, file_path: str, original_filename: str) -> dict:
    """Ingest BBMP grievance CSVs.

    Expected columns:
      _id, Complaint ID, Category, Sub Category, Grievance Date,
      Ward Name, Grievance Status, Staff Remarks, Staff Name

    Note: NO lat/lon columns in BBMP data.
    """
    df = pd.read_csv(file_path)
    inserted = 0

    # Infer year from filename
    year = None
    for token in Path(original_filename).stem.replace("_", " ").split():
        if token.isdigit() and len(token) == 4:
            year = int(token)
            break

    for _, row in df.iterrows():
        complaint_id = str(row.get("Complaint ID", "")).strip()

        # Parse date
        date_raw = row.get("Grievance Date")
        try:
            complaint_date = pd.to_datetime(date_raw)
        except Exception:
            complaint_date = None

        c = Complaint(
            complaint_id_original=complaint_id,
            category=str(row.get("Category", "")).strip() or None,
            sub_category=str(row.get("Sub Category", "")).strip() or None,
            complaint_date=complaint_date,
            ward_name=str(row.get("Ward Name", "")).strip() or None,
            status=str(row.get("Grievance Status", "")).strip() or None,
            latitude=None,  # BBMP has no coordinates
            longitude=None,
            source_file=original_filename,
            year=year or (complaint_date.year if complaint_date else None),
        )
        db.add(c)
        inserted += 1

        if inserted % 2000 == 0:
            db.flush()

    db.commit()
    logger.info("Ingested %d BBMP complaints from %s.", inserted, original_filename)
    return {"complaints_inserted": inserted, "source": original_filename, "year": year}


def get_complaints(db: Session, ward: str = None, year: int = None, category: str = None):
    q = db.query(Complaint)
    if ward:
        q = q.filter(Complaint.ward_name.ilike(f"%{ward}%"))
    if year:
        q = q.filter(Complaint.year == year)
    if category:
        q = q.filter(Complaint.category.ilike(f"%{category}%"))
    return q.order_by(Complaint.complaint_date.desc()).all()
