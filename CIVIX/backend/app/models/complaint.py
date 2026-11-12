"""Complaint model (BBMP grievances)."""

from sqlalchemy import Column, Integer, String, Float, DateTime

from app.database.database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    complaint_id_original = Column(String(50), index=True)
    category = Column(String(100))
    sub_category = Column(String(200))
    complaint_date = Column(DateTime)
    ward_name = Column(String(100), index=True)
    status = Column(String(50))  # Closed, Open, etc.
    latitude = Column(Float, nullable=True)  # BBMP data has no lat/lon; may be geocoded later
    longitude = Column(Float, nullable=True)
    source_file = Column(String(255))
    year = Column(Integer, index=True)
