"""Emergency facility processor (hospitals, clinics, trauma centers)."""

import os
import json
from typing import List, Dict, Any
from app.gis.corridor_filter import is_in_study_area


def load_study_area_hospitals(geojson_path: str) -> Dict[str, Any]:
    """Extract and format emergency facilities located within the study corridor."""
    if not os.path.exists(geojson_path):
        return {"type": "FeatureCollection", "features": []}

    with open(geojson_path, "r", encoding="utf-8", errors="ignore") as f:
        data = json.load(f)

    raw_features = data.get("features", [])
    hospitals = []
    hosp_id = 1

    for feat in raw_features:
        geom = feat.get("geometry", {})
        props = feat.get("properties", {})
        g_type = geom.get("type")

        # Extract representative point
        lat, lon = None, None
        coords = geom.get("coordinates", [])

        if g_type == "Point" and len(coords) >= 2:
            lon, lat = coords[0], coords[1]
        elif g_type == "Polygon" and coords and len(coords[0]) > 0:
            ring = coords[0]
            lon = sum(p[0] for p in ring) / len(ring)
            lat = sum(p[1] for p in ring) / len(ring)
        elif g_type == "MultiPolygon" and coords:
            all_pts = [p for poly in coords for ring in poly for p in ring]
            if all_pts:
                lon = sum(p[0] for p in all_pts) / len(all_pts)
                lat = sum(p[1] for p in all_pts) / len(all_pts)

        if lat is None or lon is None or not is_in_study_area(lat, lon):
            continue

        name = (
            props.get("name")
            or props.get("operator")
            or props.get("addr:housename")
            or f"Emergency Health Facility #{hosp_id}"
        )

        amenity = props.get("amenity", "hospital")
        emergency = props.get("emergency", "yes")

        hospitals.append({
            "type": "Feature",
            "id": hosp_id,
            "geometry": {
                "type": "Point",
                "coordinates": [round(lon, 6), round(lat, 6)]
            },
            "properties": {
                "id": hosp_id,
                "name": str(name),
                "category": amenity,
                "emergency_service": emergency,
                "address": props.get("addr:street") or props.get("addr:suburb") or "Bommanahalli–Marathahalli Corridor",
                "phone": props.get("phone") or props.get("contact:phone") or "108 / 112",
                "latitude": round(lat, 6),
                "longitude": round(lon, 6)
            }
        })
        hosp_id += 1

    return {
        "type": "FeatureCollection",
        "metadata": {
            "total_facilities": len(hospitals),
            "study_area": "Bommanahalli–Marathahalli Corridor"
        },
        "features": hospitals
    }

