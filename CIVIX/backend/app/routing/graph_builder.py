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

    return G

