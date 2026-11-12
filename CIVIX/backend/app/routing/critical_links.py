"""Critical road segment identification using betweenness centrality and emergency connectivity."""

import networkx as nx
from typing import List, Dict, Any


def identify_critical_roads(G: nx.DiGraph, top_n: int = 15) -> List[Dict[str, Any]]:
    """
    Calculate edge betweenness centrality on the study area road graph
    to identify bottleneck roads critical for emergency connectivity.
    """
    if len(G) < 5:
        return []

    # For performance on interactive web graphs, sample a k-node subset if graph is large
    k_sample = min(200, len(G.nodes))
    centrality = nx.edge_betweenness_centrality(G, k=k_sample, weight="travel_time_sec")

    # Aggregate centrality by road_id
    road_centrality = {}
    road_metadata = {}

    for (u, v), score in centrality.items():
        edge_data = G.get_edge_data(u, v, {})
        r_id = edge_data.get("road_id")
        if not r_id:
            continue
        road_centrality[r_id] = road_centrality.get(r_id, 0.0) + score
        if r_id not in road_metadata:
            road_metadata[r_id] = {
                "road_id": r_id,
                "road_name": edge_data.get("road_name", f"Road #{r_id}"),
                "road_type": edge_data.get("road_type", "primary"),
                "coordinates": edge_data.get("coordinates")
            }

    sorted_roads = sorted(road_centrality.items(), key=lambda x: x[1], reverse=True)[:top_n]

    results = []
    for r_id, score in sorted_roads:
        meta = road_metadata.get(r_id, {})
        results.append({
            "road_id": r_id,
            "road_name": meta.get("road_name", f"Road #{r_id}"),
            "road_type": meta.get("road_type", "primary"),
            "criticality_score": round(float(score * 1000.0), 2),
            "emergency_impact": "High Bottleneck - Major arterial route connecting emergency hubs" if score > 0.02 else "Moderate Arterial Link",
            "coordinates": meta.get("coordinates")
        })

    return results

