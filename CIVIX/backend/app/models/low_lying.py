"""Low-lying areas model."""

from sqlalchemy import Column, Integer, String, Text

from app.database.database import Base


class LowLyingArea(Base):
    __tablename__ = "low_lying_areas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255))
    geometry_json = Column(Text)  # GeoJSON geometry string
    source_file = Column(String(255))
