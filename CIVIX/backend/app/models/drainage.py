"""Drainage model."""

from sqlalchemy import Column, Integer, String, Text

from app.database.database import Base


class Drainage(Base):
    __tablename__ = "drainage"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    drainage_type = Column(String(20), nullable=False)  # primary, secondary, tertiary
    geometry_json = Column(Text)  # GeoJSON geometry string
    attributes_json = Column(Text)  # JSON string of KML attributes
    source_file = Column(String(255))
