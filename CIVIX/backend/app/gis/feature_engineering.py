"""GIS feature engineering with spatial grid indexing for high-performance spatial indicator calculation."""

import math
from typing import List, Dict, Any, Tuple
from app.gis.corridor_filter import haversine_distance


def get_grid_cell(lat: float, lon: float, cell_size: float = 0.005) -> Tuple[int, int]:
    """Spatial hashing into ~500m grid cells."""
    return (int(lat / cell_size), int(lon / cell_size))


def calculate_road_spatial_features(
    roads: List[Dict[str, Any]],
    drainage_features: List[Dict[str, Any]],
    flood_prone_points: List[Dict[str, Any]],
    low_lying_points: List[Dict[str, Any]],
    vulnerable_points: List[Dict[str, Any]],
    complaints: List[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Compute comprehensive GIS and vulnerability indicators for each road segment.
    Uses spatial bucket indexing for sub-second execution.
    """
    # Separate drainage by classification
    primary_drains = [d for d in drainage_features if d.get("properties", {}).get("drainage_type") == "primary"]
    secondary_drains = [d for d in drainage_features if d.get("properties", {}).get("drainage_type") == "secondary"]
    tertiary_drains = [d for d in drainage_features if d.get("properties", {}).get("drainage_type") == "tertiary"]

    def get_drain_centroid(d):
        c = d.get("properties", {}).get("centroid")
        if c:
            return c[1], c[0]  # lat, lon
        coords = d.get("geometry", {}).get("coordinates", [])
        if coords:
            return sum(p[1] for p in coords) / len(coords), sum(p[0] for p in coords) / len(coords)
        return None, None

    prim_cents = [get_drain_centroid(d) for d in primary_drains if get_drain_centroid(d)[0] is not None]
    sec_cents = [get_drain_centroid(d) for d in secondary_drains if get_drain_centroid(d)[0] is not None]
    tert_cents = [get_drain_centroid(d) for d in tertiary_drains if get_drain_centroid(d)[0] is not None]

    fp_pts = [(p["properties"]["latitude"], p["properties"]["longitude"]) for p in flood_prone_points]
    ll_pts = [(p["properties"]["latitude"], p["properties"]["longitude"]) for p in low_lying_points]
    vp_pts = [(p["properties"]["latitude"], p["properties"]["longitude"]) for p in vulnerable_points]

    # Build spatial grid index for drainage features
    drain_grid = {}
    for d in drainage_features:
        c = get_drain_centroid(d)
        if c[0] is None:
            continue
        cell = get_grid_cell(c[0], c[1])
        if cell not in drain_grid:
            drain_grid[cell] = []
        drain_grid[cell].append((c[0], c[1], d.get("properties", {}).get("length_m", 50.0)))

    enriched_roads = []

    for r in roads:
        props = r.get("properties", {})
        centroid = props.get("centroid", [0, 0])
        r_lon, r_lat = centroid[0], centroid[1]

        # 1. Distances to nearest drains
        def min_dist(pts):
            if not pts:
                return 9999.0
            return min(haversine_distance(r_lat, r_lon, pt[0], pt[1]) for pt in pts)

        dist_primary = min_dist(prim_cents)
        dist_secondary = min_dist(sec_cents)
        dist_tertiary = min_dist(tert_cents)

        # 2. Drainage density via neighboring grid cells (checks 9 cells instead of all 1,368 drains)
        center_cell = get_grid_cell(r_lat, r_lon)
        drains_50m = 0
        drains_100m = 0
        drain_len_50m = 0.0
        drain_len_100m = 0.0

        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                neighbor = (center_cell[0] + di, center_cell[1] + dj)
                if neighbor in drain_grid:
                    for d_lat, d_lon, d_len in drain_grid[neighbor]:
                        dist = haversine_distance(r_lat, r_lon, d_lat, d_lon)
                        if dist <= 50.0:
                            drains_50m += 1
                            drain_len_50m += d_len
                        if dist <= 100.0:
                            drains_100m += 1
                            drain_len_100m += d_len

        # 3. Proximity to flood vulnerability locations
        dist_flood_prone = min_dist(fp_pts)
        dist_low_lying = min_dist(ll_pts)
        dist_vulnerable = min_dist(vp_pts)

        # 4. Road classification vulnerability factor
        road_type = props.get("road_type", "unclassified")
        type_risk_factors = {
            "residential": 0.6,
            "service": 0.7,
            "tertiary": 0.5,
            "secondary": 0.4,
            "primary": 0.3,
            "trunk": 0.25,
            "motorway": 0.2
        }
        type_factor = type_risk_factors.get(road_type, 0.5)

        features = {
            "road_id": props.get("id"),
            "road_name": props.get("road_name"),
            "road_type": road_type,
            "length_m": props.get("length_m", 0.0),
            "dist_primary_drain_m": round(dist_primary, 1),
            "dist_secondary_drain_m": round(dist_secondary, 1),
            "dist_tertiary_drain_m": round(dist_tertiary, 1),
            "drains_count_50m": drains_50m,
            "drains_count_100m": drains_100m,
            "drain_length_50m": round(drain_len_50m, 1),
            "drain_length_100m": round(drain_len_100m, 1),
            "dist_flood_prone_m": round(dist_flood_prone, 1),
            "dist_low_lying_m": round(dist_low_lying, 1),
            "dist_vulnerable_m": round(dist_vulnerable, 1),
            "road_type_factor": type_factor,
        }

        new_props = dict(props)
        new_props.update(features)
        enriched_roads.append({
            "type": "Feature",
            "id": r.get("id"),
            "geometry": r.get("geometry"),
            "properties": new_props
        })

    return enriched_roads
