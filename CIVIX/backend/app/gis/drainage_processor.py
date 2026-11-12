"""Drainage network KML processor and spatial indexer."""

import os
import re
import json
from typing import List, Dict, Any, Tuple
from shapely.geometry import shape, LineString, Point, mapping

from app.gis.corridor_filter import is_in_study_area, haversine_distance


def parse_kml_placemarks(kml_path: str, default_type: str = "primary") -> List[Dict[str, Any]]:
    """Parse Placemarks from a drainage KML file, preserving classification and coordinates."""
    if not os.path.exists(kml_path):
        return []

    with open(kml_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    # Extract all placemarks
    placemark_blocks = re.findall(r"<Placemark[\s\S]*?</Placemark>", content)
    features = []

    for idx, block in enumerate(placemark_blocks):
        # Extract name if present
        name_match = re.search(r"<name>([\s\S]*?)</name>", block)
        name = name_match.group(1).strip() if name_match else f"{default_type.capitalize()} Drain #{idx+1}"

        # Extract coordinates
        coord_match = re.search(r"<coordinates>([\s\S]*?)</coordinates>", block)
        if not coord_match:
            continue

        raw_coords = coord_match.group(1).strip().split()
        coord_list = []
        in_corridor = False

        for pt_str in raw_coords:
            parts = pt_str.split(",")
            if len(parts) >= 2:
                try:
                    lon = float(parts[0])
                    lat = float(parts[1])
                    coord_list.append([lon, lat])
                    if is_in_study_area(lat, lon):
                        in_corridor = True
                except ValueError:
                    continue

        if not in_corridor or len(coord_list) < 2:
            continue

        # Calculate approximate length in meters
        length_m = 0.0
        for i in range(len(coord_list) - 1):
            p1 = coord_list[i]
            p2 = coord_list[i+1]
            length_m += haversine_distance(p1[1], p1[0], p2[1], p2[0])

        features.append({
            "id": f"{default_type}_{idx+1}",
            "name": name,
            "drainage_type": default_type,
            "length_m": round(length_m, 2),
            "coordinates": coord_list,
            "centroid": [
                sum(c[0] for c in coord_list) / len(coord_list),
                sum(c[1] for c in coord_list) / len(coord_list)
            ]
        })

    return features


def load_and_deduplicate_drainage(datasets_dir: str) -> Dict[str, Any]:
    """
    Load Primary, Secondary, and Tertiary drains.
    De-duplicate segments that might be identical between all layers.
    Returns GeoJSON FeatureCollection.
    """
    primary_file = os.path.join(datasets_dir, "Primary_Drains.kml")
    secondary_file = os.path.join(datasets_dir, "Secendory_Drains.kml")
    tertiary_file = os.path.join(datasets_dir, "Tertiary_Drains.kml")

    primaries = parse_kml_placemarks(primary_file, "primary")
    secondaries = parse_kml_placemarks(secondary_file, "secondary")
    tertiaries = parse_kml_placemarks(tertiary_file, "tertiary")

    # Geometry hash to deduplicate
    seen_hashes = set()
    cleaned_features = []

    def feature_hash(coords):
        # Round coordinates to 5 decimal places (~1m) for comparison
        start = (round(coords[0][0], 5), round(coords[0][1], 5))
        end = (round(coords[-1][0], 5), round(coords[-1][1], 5))
        return (start, end, len(coords))

    # Priority order: primary > secondary > tertiary
    for group, group_name in [(primaries, "primary"), (secondaries, "secondary"), (tertiaries, "tertiary")]:
        for item in group:
            h = feature_hash(item["coordinates"])
            rev_h = (h[1], h[0], h[2])
            if h in seen_hashes or rev_h in seen_hashes:
                continue
            seen_hashes.add(h)
            cleaned_features.append(item)

    # Convert to GeoJSON features
    geojson_features = []
    for f in cleaned_features:
        geojson_features.append({
            "type": "Feature",
            "id": f["id"],
            "geometry": {
                "type": "LineString",
                "coordinates": f["coordinates"]
            },
            "properties": {
                "id": f["id"],
                "name": f["name"],
                "drainage_type": f["drainage_type"],
                "length_m": f["length_m"],
                "centroid": f["centroid"]
            }
        })

    return {
        "type": "FeatureCollection",
        "metadata": {
            "primary_count": sum(1 for f in cleaned_features if f["drainage_type"] == "primary"),
            "secondary_count": sum(1 for f in cleaned_features if f["drainage_type"] == "secondary"),
            "tertiary_count": sum(1 for f in cleaned_features if f["drainage_type"] == "tertiary"),
            "total_count": len(cleaned_features)
        },
        "features": geojson_features
    }

