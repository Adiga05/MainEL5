"""Flood-prone locations, low-lying areas, vulnerable points, and rain-gauge processor."""

import os
import re
from typing import Dict, Any, List
from app.gis.corridor_filter import is_in_study_area


def parse_kml_points(kml_path: str, category_name: str) -> Dict[str, Any]:
    """Parse point / polygon features from vulnerability KMLs, filtering to study area."""
    if not os.path.exists(kml_path):
        return {"type": "FeatureCollection", "features": []}

    with open(kml_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    placemarks = re.findall(r"<Placemark[\s\S]*?</Placemark>", content)
    features = []

    for idx, block in enumerate(placemarks):
        name_match = re.search(r"<name>([\s\S]*?)</name>", block)
        name = name_match.group(1).strip() if name_match else f"{category_name} #{idx+1}"

        coord_match = re.search(r"<coordinates>([\s\S]*?)</coordinates>", block)
        if not coord_match:
            continue

        raw_str = coord_match.group(1).strip()
        pts = raw_str.split()
        if not pts:
            continue

        # Extract representative coordinate
        p_first = pts[0].split(",")
        if len(p_first) < 2:
            continue

        try:
            lon = float(p_first[0])
            lat = float(p_first[1])
        except ValueError:
            continue

        if not is_in_study_area(lat, lon):
            continue

        features.append({
            "type": "Feature",
            "id": idx + 1,
            "geometry": {
                "type": "Point",
                "coordinates": [round(lon, 6), round(lat, 6)]
            },
            "properties": {
                "id": idx + 1,
                "name": name,
                "category": category_name,
                "latitude": round(lat, 6),
                "longitude": round(lon, 6)
            }
        })

    return {
        "type": "FeatureCollection",
        "metadata": {
            "total": len(features),
            "category": category_name,
            "study_area": "Bommanahalli–Marathahalli Corridor"
        },
        "features": features
    }


def load_all_flood_layers(datasets_dir: str) -> Dict[str, Any]:
    """Load and return all four flood-vulnerability and telemetry layers."""
    fp_path = os.path.join(datasets_dir, "Flood-prone_locations_map.kml")
    ll_path = os.path.join(datasets_dir, "Low_Lying_Areas.kml")
    vp_path = os.path.join(datasets_dir, "Points_vulnerable_to_flooding.kml")
    rg_path = os.path.join(datasets_dir, "Telemetric_Rain_Gauge.kml")

    return {
        "flood_prone": parse_kml_points(fp_path, "Flood-Prone Location"),
        "low_lying": parse_kml_points(ll_path, "Low-Lying Area"),
        "vulnerable_points": parse_kml_points(vp_path, "Points Vulnerable to Flooding"),
        "rain_gauges": parse_kml_points(rg_path, "Telemetric Rain Gauge Station")
    }

