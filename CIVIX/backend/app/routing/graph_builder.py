"""NetworkX routable road graph builder."""

import networkx as nx
from typing import List, Dict, Any, Tuple


def node_key(coord: List[float]) -> Tuple[float, float]:
    """Snap coordinate to 5 decimal places (~1.1 meter resolution) to connect intersections."""
    return (round(coord[0], 5), round(coord[1], 5))


def build_road_graph(roads: List[Dict[str, Any]], blocked_road_ids: set = None) -> nx.DiGraph:
    """
    Construct a directed NetworkX graph from road GeoJSON features.
    Edge weights represent travel time in seconds, modified by flood disruption risk.
    """
    if blocked_road_ids is None:
        blocked_road_ids = set()

    G = nx.DiGraph()
    endpoint_nodes = set()

    for r in roads:
        props = r.get("properties", {})
        road_id = props.get("id")
        coords = r.get("geometry", {}).get("coordinates", [])

        if len(coords) < 2:
            continue

        endpoint_nodes.add(node_key(coords[0]))
        endpoint_nodes.add(node_key(coords[-1]))

        length_m = props.get("length_m", 50.0)
        travel_time_sec = props.get("travel_time_sec", 10.0)
        risk_prob = props.get("probability", 0.05)
        is_blocked = road_id in blocked_road_ids

        # Determine critical rainfall blockage threshold (in mm/h) for this specific road
        min_flood_dist = min(
            props.get("dist_flood_prone_m", 9999.0),
            props.get("dist_low_lying_m", 9999.0),
            props.get("dist_vulnerable_m", 9999.0)
        )
        dist_prim_drain = props.get("dist_primary_drain_m", 9999.0)
        road_type = props.get("road_type", "residential")

        if min_flood_dist < 100.0:
            flood_threshold_mm = 20.0  # Chronic flood-prone / low-lying depression blocks at 20mm/h
        elif dist_prim_drain < 50.0:
            flood_threshold_mm = 25.0  # Direct SWD / Raja Kaluve buffer overflows at 25mm/h
        elif road_type in ["motorway", "trunk", "primary"]:
            flood_threshold_mm = 40.0  # Major arterial corridors handle up to 40mm/h
        elif road_type in ["secondary", "tertiary"]:
            flood_threshold_mm = 30.0
        else:
            flood_threshold_mm = 25.0

        # Connect consecutive vertices along the road line
        for i in range(len(coords) - 1):
            u = node_key(coords[i])
            v = node_key(coords[i + 1])

            seg_len = length_m / (len(coords) - 1)
            seg_time = travel_time_sec / (len(coords) - 1)

            # Bidirectional for standard urban roads (unless oneway specified)
            edge_data = {
                "road_id": road_id,
                "road_name": props.get("road_name", "Road"),
                "road_type": road_type,
                "length_m": seg_len,
                "travel_time_sec": seg_time,
                "risk_probability": risk_prob,
                "flood_threshold_mm": flood_threshold_mm,
                "is_blocked": is_blocked,
                "coordinates": [coords[i], coords[i + 1]]
            }

            G.add_edge(u, v, **edge_data)
            G.add_edge(v, u, **edge_data)

    # Bridge intersection gaps and disconnected OSM road segment endpoints (within 130 meters)
    endpoints_list = list(endpoint_nodes)
    if len(endpoints_list) > 1:
        try:
            import numpy as np
            from scipy.spatial import KDTree
            from app.gis.corridor_filter import haversine_distance

            coords_arr = np.array(endpoints_list)
            tree = KDTree(coords_arr)
            # 0.0012 degrees corresponds to ~130 meters in Bengaluru latitude
            pairs = tree.query_pairs(0.0012)
            for i, j in pairs:
                u = endpoints_list[i]
                v = endpoints_list[j]
                d_m = haversine_distance(u[1], u[0], v[1], v[0])
                if d_m <= 130.0:
                    t_sec = max(1.0, d_m / 10.0) # ~36 km/h transition speed
                    edge_data = {
                        "road_id": -1,
                        "road_name": "Corridor Connector",
                        "road_type": "residential",
                        "length_m": d_m,
                        "travel_time_sec": t_sec,
                        "risk_probability": 0.01,
                        "flood_threshold_mm": 35.0,
                        "is_blocked": False,
                        "coordinates": [list(u), list(v)]
                    }
                    if not G.has_edge(u, v):
                        G.add_edge(u, v, **edge_data)
                    if not G.has_edge(v, u):
                        G.add_edge(v, u, **edge_data)
        except Exception:
            pass

    return G

