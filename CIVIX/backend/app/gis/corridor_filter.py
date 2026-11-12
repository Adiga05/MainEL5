"""Study area boundary definitions and spatial filtering utilities."""

from typing import Dict, Any, Tuple, Optional
import math
from app.core.config import get_settings

settings = get_settings()

CORRIDOR_METADATA = {
    "study_area_id": settings.STUDY_AREA_ID,
    "name": settings.STUDY_AREA_NAME,
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India",
    "bbox": {
        "min_lat": settings.STUDY_AREA_MIN_LAT,
        "max_lat": settings.STUDY_AREA_MAX_LAT,
        "min_lon": settings.STUDY_AREA_MIN_LON,
        "max_lon": settings.STUDY_AREA_MAX_LON,
    },
    "key_corridors": [
        "Bommanahalli (NH-44 / Hosur Road Junction)",
        "HSR Layout (Sectors 1 to 7)",
        "Bellandur Lake & ORR Junction",
        "Devarabeesanahalli (Outer Ring Road Tech Corridor)",
        "Kadubeesanahalli (Outer Ring Road)",
        "Marathahalli (Old Airport Road / ORR Intersection)",
        "Mahadevapura (Outer Ring Road / Whitefield Road link)"
    ],
    "center": {
        "lat": settings.STUDY_AREA_CENTER_LAT,
        "lon": settings.STUDY_AREA_CENTER_LON,
    },
    "default_zoom": settings.STUDY_AREA_DEFAULT_ZOOM
}


def is_in_study_area(lat: float, lon: float) -> bool:
    """Return True if point (lat, lon) is within study corridor bounding box."""
    if lat is None or lon is None:
        return False
    return (
        settings.STUDY_AREA_MIN_LAT <= lat <= settings.STUDY_AREA_MAX_LAT
        and settings.STUDY_AREA_MIN_LON <= lon <= settings.STUDY_AREA_MAX_LON
    )


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points in meters.
    """
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

