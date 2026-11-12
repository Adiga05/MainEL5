"""Rainfall models."""

from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime

from app.database.database import Base


class RainfallObservation(Base):
    __tablename__ = "rainfall_observations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    station_id = Column(String(50), index=True)
    station_name = Column(String(100))
    latitude = Column(Float)
    longitude = Column(Float)
    timestamp = Column(DateTime, index=True)
    rainfall_mm = Column(Float)
    source = Column(String(20), default="observed")  # observed, manual, simulated, forecast
    quality_flag = Column(String(20))


class RainfallStation(Base):
    __tablename__ = "rainfall_stations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    station_id = Column(String(50), unique=True, index=True)
    station_name = Column(String(100))
    latitude = Column(Float)
    longitude = Column(Float)
    source = Column(String(50))
