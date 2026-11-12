"""Dataset model."""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text

from app.database.database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    dataset_type = Column(String(50))  # kml, geojson, csv, xlsx, shp, geotiff
    upload_timestamp = Column(DateTime, default=datetime.utcnow)
    processing_status = Column(String(30), default="pending")  # pending, processing, completed, failed
    metadata_json = Column(Text)  # JSON string
    file_path = Column(String(500), nullable=False)
