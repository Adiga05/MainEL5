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

    for r in roads:
        props = r.get("properties", {})
        road_id = props.get("id")
        coords = r.get("geometry", {}).get("coordinates", [])

        if len(coords) < 2:
            continue

        length_m = props.get("length_m", 50.0)
        travel_time_sec = props.get("travel_time_sec", 10.0)
        risk_prob = props.get("probability", 0.05)
        is_blocked = road_id in blocked_road_ids

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
                "road_type": props.get("road_type", "residential"),
                "length_m": seg_len,
                "travel_time_sec": seg_time,
                "risk_probability": risk_prob,
                "is_blocked": is_blocked,
                "coordinates": [coords[i], coords[i + 1]]
            }

            G.add_edge(u, v, **edge_data)
            G.add_edge(v, u, **edge_data)

    # Bridge intersection gaps and disconnected OSM road segment endpoints (within 85 meters)
    nodes_list = list(G.nodes)
    if len(nodes_list) > 1:
        try:
            import numpy as np
            from scipy.spatial import KDTree
            from app.gis.corridor_filter import haversine_distance

            coords_arr = np.array(nodes_list)
            tree = KDTree(coords_arr)
            # 0.0008 degrees corresponds to ~85-90 meters in Bengaluru latitude
            pairs = tree.query_pairs(0.0008)
            for i, j in pairs:
                u = nodes_list[i]
                v = nodes_list[j]
                d_m = haversine_distance(u[1], u[0], v[1], v[0])
                if d_m <= 85.0:
                    t_sec = max(1.0, d_m / 10.0) # ~36 km/h transition speed
                    edge_data = {
                        "road_id": -1,
                        "road_name": "Corridor Connector",
                        "road_type": "residential",
                        "length_m": d_m,
                        "travel_time_sec": t_sec,
                        "risk_probability": 0.02,
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

