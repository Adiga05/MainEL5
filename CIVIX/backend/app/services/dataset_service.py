"""Dataset upload, storage, and processing orchestration."""

import os
import uuid
import json
import logging
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.dataset import Dataset
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

ALLOWED_EXTENSIONS = {
    ".kml", ".kmz", ".geojson", ".json",
    ".csv", ".xlsx", ".xls",
    ".zip",  # shapefile zips
    ".tif", ".tiff",  # GeoTIFF
}


def _detect_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    mapping = {
        ".kml": "kml", ".kmz": "kmz",
        ".geojson": "geojson", ".json": "geojson",
        ".csv": "csv", ".xlsx": "xlsx", ".xls": "xlsx",
        ".zip": "shapefile",
        ".tif": "geotiff", ".tiff": "geotiff",
    }
    return mapping.get(ext, "unknown")


def upload_dataset(db: Session, file_bytes: bytes, original_filename: str) -> Dataset:
    """Save uploaded file and create a dataset record."""
    ext = Path(original_filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext}")

    uid = uuid.uuid4().hex[:12]
    safe_name = f"{uid}_{original_filename}"
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / safe_name
    dest.write_bytes(file_bytes)

    ds = Dataset(
        filename=safe_name,
        original_filename=original_filename,
        dataset_type=_detect_type(original_filename),
        file_path=str(dest),
        processing_status="pending",
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)
    logger.info("Dataset %s uploaded → %s", ds.id, dest)
    return ds


def list_datasets(db: Session):
    return db.query(Dataset).order_by(Dataset.upload_timestamp.desc()).all()


def get_dataset(db: Session, dataset_id: int):
    return db.query(Dataset).filter(Dataset.id == dataset_id).first()


def delete_dataset(db: Session, dataset_id: int) -> bool:
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if ds is None:
        return False
    # Remove file
    try:
        if os.path.exists(ds.file_path):
            os.remove(ds.file_path)
    except OSError:
        logger.warning("Could not remove file %s", ds.file_path)
    db.delete(ds)
    db.commit()
    return True


def process_dataset(db: Session, dataset_id: int) -> Dataset:
    """Kick off processing for a dataset (dispatch to correct processor)."""
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if ds is None:
        raise ValueError("Dataset not found")

    ds.processing_status = "processing"
    db.commit()

    try:
        if ds.dataset_type == "kml":
            from app.gis.kml_processor import process_kml
            result = process_kml(db, ds.file_path, ds.original_filename)
        elif ds.dataset_type == "geojson":
            from app.gis.road_processor import process_geojson
            result = process_geojson(db, ds.file_path, ds.original_filename)
        elif ds.dataset_type == "csv":
            # Could be rainfall or BBMP
            result = _process_csv(db, ds.file_path, ds.original_filename)
        else:
            result = {"message": f"No processor for type {ds.dataset_type}"}

        ds.processing_status = "completed"
        ds.metadata_json = json.dumps(result) if isinstance(result, dict) else str(result)
    except Exception as e:
        logger.exception("Processing failed for dataset %s", dataset_id)
        ds.processing_status = "failed"
        ds.metadata_json = json.dumps({"error": str(e)})
    db.commit()
    db.refresh(ds)
    return ds


def _process_csv(db: Session, file_path: str, original_filename: str):
    """Route CSV to the right service based on columns."""
    import pandas as pd
    df = pd.read_csv(file_path, nrows=2)
    cols = set(df.columns)

    if "Telemetry Hourly Rainfall (mm)" in cols or "Station" in cols:
        from app.services.rainfall_service import ingest_rainfall_csv
        return ingest_rainfall_csv(db, file_path)
    elif "Complaint ID" in cols or "Grievance Date" in cols:
        from app.services.complaint_service import ingest_bbmp_csv
        return ingest_bbmp_csv(db, file_path, original_filename)
    else:
        return {"message": "CSV type not recognized", "columns": list(cols)}
