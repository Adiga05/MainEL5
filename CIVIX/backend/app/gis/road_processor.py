"""Road network processor and geometry builder for Bommanahalli–Marathahalli corridor."""

import os
import json
from typing import List, Dict, Any, Tuple
from app.gis.corridor_filter import is_in_study_area, haversine_distance

# Speed profiles in km/h for emergency and general traffic
ROAD_SPEED_PROFILES = {
    "motorway": 70.0,
    "trunk": 60.0,
    "primary": 45.0,
    "secondary": 35.0,
    "tertiary": 25.0,
    "residential": 20.0,
    "service": 12.0,
    "unclassified": 20.0,
    "living_street": 15.0
}


def load_study_area_roads(road_geojson_path: str, max_roads: int = 25000) -> Dict[str, Any]:
    """
    Extract, clean, and filter roads to Bommanahalli–Marathahalli study area.
    Filters out area polygons, retains LineStrings, calculates segment lengths and travel times.
    """
    if not os.path.exists(road_geojson_path):
        return {"type": "FeatureCollection", "features": []}

    with open(road_geojson_path, "r", encoding="utf-8", errors="ignore") as f:
        data = json.load(f)

    raw_features = data.get("features", [])
    valid_roads = []
    road_id_counter = 1

    for feat in raw_features:
        geom = feat.get("geometry", {})
        props = feat.get("properties", {})
        g_type = geom.get("type")

        # Skip area polygons
        if g_type != "LineString" or props.get("area") == "yes":
            continue

        raw_coords = geom.get("coordinates", [])
        if len(raw_coords) < 2:
            continue

        # Check if any coordinate is inside study area
        in_area = False
        coords = []
        for pt in raw_coords:
            lon, lat = pt[0], pt[1]
            coords.append([lon, lat])
            if is_in_study_area(lat, lon):
                in_area = True

        if not in_area:
            continue

        # Calculate length
        length_m = 0.0
        for i in range(len(coords) - 1):
            p1 = coords[i]
            p2 = coords[i+1]
            length_m += haversine_distance(p1[1], p1[0], p2[1], p2[0])

        if length_m < 3.0:  # Skip degenerate slivers
            continue

        highway_type = props.get("highway", "unclassified")
        if isinstance(highway_type, list):
            highway_type = highway_type[0]
        highway_type = str(highway_type).lower()

        road_name = props.get("name") or props.get("addr:street") or f"{highway_type.capitalize()} Road"
        speed_kmh = ROAD_SPEED_PROFILES.get(highway_type, 20.0)
        speed_ms = (speed_kmh * 1000.0) / 3600.0
        travel_time_sec = length_m / max(speed_ms, 1.0)

        # Centroid
        centroid_lon = sum(c[0] for c in coords) / len(coords)
        centroid_lat = sum(c[1] for c in coords) / len(coords)

        road_info = {
            "id": road_id_counter,
            "osm_id": str(feat.get("id", f"way_{road_id_counter}")),
            "road_name": str(road_name),
            "road_type": highway_type,
            "length_m": round(length_m, 2),
            "travel_time_sec": round(travel_time_sec, 2),
            "speed_kmh": speed_kmh,
            "coordinates": coords,
            "start_node": [round(coords[0][0], 6), round(coords[0][1], 6)],
            "end_node": [round(coords[-1][0], 6), round(coords[-1][1], 6)],
            "centroid": [round(centroid_lon, 6), round(centroid_lat, 6)]
        }
        valid_roads.append(road_info)
        road_id_counter += 1

        if len(valid_roads) >= max_roads:
            break

    # Build GeoJSON
    features = []
    for r in valid_roads:
        features.append({
            "type": "Feature",
            "id": r["id"],
            "geometry": {
                "type": "LineString",
                "coordinates": r["coordinates"]
            },
            "properties": {
                "id": r["id"],
                "osm_id": r["osm_id"],
                "road_name": r["road_name"],
                "road_type": r["road_type"],
                "length_m": r["length_m"],
                "travel_time_sec": r["travel_time_sec"],
                "speed_kmh": r["speed_kmh"],
                "start_node": r["start_node"],
                "end_node": r["end_node"],
                "centroid": r["centroid"]
            }
        })

    return {
        "type": "FeatureCollection",
        "metadata": {
            "total_segments": len(valid_roads),
            "total_length_km": round(sum(r["length_m"] for r in valid_roads) / 1000.0, 2),
            "study_area": "Bommanahalli–Marathahalli Corridor"
        },
        "features": features
    }

