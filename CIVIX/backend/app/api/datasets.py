"""Dataset management and upload API endpoints."""

import os
import uuid
import json
import shutil
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.dataset import Dataset
from app.core.config import get_settings

router = APIRouter(prefix="/api/datasets", tags=["Dataset Management"])
settings = get_settings()


def _ensure_upload_dirs():
    base = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data"))
    raw_dir = os.path.join(base, "uploads", "raw")
    proc_dir = os.path.join(base, "uploads", "processed")
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(proc_dir, exist_ok=True)
    return raw_dir, proc_dir


@router.get("")
def list_datasets(db: Session = Depends(get_db)):
    """List all available raw and processed datasets with feature counts and validation status."""
    # First, load the dataset inventory created by the validator if available
    inv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/processed/dataset_inventory.json"))
    raw_inventory = {}
    if os.path.exists(inv_path):
        try:
            with open(inv_path, "r", encoding="utf-8") as f:
                inv_data = json.load(f)
                raw_inventory = inv_data.get("datasets", {})
        except Exception:
            pass

    # Fetch any user-uploaded datasets from the database
    db_datasets = db.query(Dataset).order_by(Dataset.upload_timestamp.desc()).all()
    user_uploaded = [
        {
            "id": f"upload_{d.id}",
            "filename": d.original_filename or d.filename,
            "dataset_type": d.dataset_type,
            "format": os.path.splitext(d.original_filename or d.filename)[1].replace(".", "").upper(),
            "upload_timestamp": d.upload_timestamp.isoformat() if d.upload_timestamp else None,
            "processing_status": d.processing_status or "Processed",
            "feature_count": 0,
            "study_area_overlap_count": 0,
            "summary": "User uploaded GIS / tabular dataset"
        }
        for d in db_datasets
    ]

    # Format the preloaded datasets
    preloaded = []
    for fname, meta in raw_inventory.items():
        preloaded.append({
            "id": fname,
            "filename": fname,
            "dataset_type": meta.get("type", "Geospatial"),
            "format": meta.get("format", "DATA"),
            "size_kb": meta.get("size_kb", 0),
            "feature_count": meta.get("feature_count", 0),
            "study_area_overlap_count": meta.get("study_area_overlap_count", 0),
            "geometry_type": meta.get("geometry_type"),
            "crs": meta.get("crs", "EPSG:4326"),
            "processing_status": "Verified & Active",
            "summary": meta.get("summary", ""),
            "issues": meta.get("issues", [])
        })

    return {
        "status": "success",
        "study_area": "Bommanahalli–Marathahalli Corridor",
        "total_datasets": len(preloaded) + len(user_uploaded),
        "datasets": preloaded + user_uploaded
    }


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    dataset_type: str = Form("road_network"),
    db: Session = Depends(get_db)
):
    """
    Upload a new dataset (KML/KMZ, GeoJSON, Shapefile ZIP, CSV, XLSX, GeoTIFF).
    Never overwrites existing files. Preserves raw copy with unique ID.
    """
    raw_dir, _ = _ensure_upload_dirs()

    # Allowed extensions
    allowed = {".kml", ".kmz", ".geojson", ".json", ".zip", ".csv", ".xlsx", ".tif", ".tiff"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: KML, KMZ, GeoJSON, ZIP, CSV, XLSX, GeoTIFF."
        )

    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    saved_path = os.path.join(raw_dir, unique_filename)

    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size_kb = round(os.path.getsize(saved_path) / 1024, 2)

    # Save to database
    record = Dataset(
        filename=unique_filename,
        original_filename=file.filename,
        dataset_type=dataset_type,
        file_path=saved_path,
        upload_timestamp=datetime.utcnow(),
        processing_status="Processed",
        metadata_json=json.dumps({"size_kb": file_size_kb, "format": ext.replace(".", "").upper()})
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "status": "success",
        "message": f"Dataset '{file.filename}' uploaded successfully.",
        "dataset_id": record.id,
        "filename": record.filename,
        "size_kb": file_size_kb
    }


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Remove a user-uploaded dataset."""
    record = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if record.file_path and os.path.exists(record.file_path):
        try:
            os.remove(record.file_path)
        except Exception:
            pass

    db.delete(record)
    db.commit()
    return {"status": "success", "message": f"Dataset #{dataset_id} removed."}

