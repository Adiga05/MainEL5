"""Emergency vehicle routing engine with risk-penalized Dijkstra / A* routing."""

import networkx as nx
from typing import List, Dict, Any, Tuple, Optional
from app.gis.corridor_filter import haversine_distance


def find_nearest_node(G: nx.DiGraph, lon: float, lat: float, target_component: set = None) -> Optional[Tuple[float, float]]:
    """Find the nearest graph node to a given coordinate, optionally within a specified connected component."""
    if not G.nodes:
        return None

    candidate_nodes = target_component if target_component else G.nodes
    best_node = None
    min_dist = float("inf")

    for node in candidate_nodes:
        dist = haversine_distance(lat, lon, node[1], node[0])
        if dist < min_dist:
            min_dist = dist
            best_node = node

    return best_node


def calculate_edge_weight(u, v, data, risk_weight_lambda: float = 2.0) -> float:
    """
    Weighted edge-cost function:
    C(edge) = TravelTime(edge) * (1 + lambda * DisruptionProbability(edge))
    If the road is verified blocked, edge cost is infinite.
    """
    if data.get("is_blocked", False):
        return float("inf")

    base_time = data.get("travel_time_sec", 1.0)
    risk_prob = data.get("risk_probability", 0.0)

    # Cost penalization
    cost = base_time * (1.0 + risk_weight_lambda * (risk_prob ** 1.5))
    return cost


def format_route_result(G: nx.DiGraph, path_nodes: List[Tuple[float, float]], route_name: str, apply_risk_delay: bool = True) -> Dict[str, Any]:
    """Extract path coordinates, total length, travel time, and risk exposure."""
    coords = []
    total_length_m = 0.0
    total_time_sec = 0.0
    high_risk_count = 0
    risk_probs = []
    warnings = []

    for i in range(len(path_nodes) - 1):
        u = path_nodes[i]
        v = path_nodes[i + 1]
        edge_data = G.get_edge_data(u, v, {})

        base_time = edge_data.get("travel_time_sec", 0.0)
        p = edge_data.get("risk_probability", 0.0)
        risk_probs.append(p)

        # Under flood conditions, vehicles experience hydrodynamic speed reduction and water hazard delays
        flood_factor = 1.0 + (min(p * 2.2, 3.0) if apply_risk_delay else 0.0)
        total_time_sec += base_time * flood_factor
        total_length_m += edge_data.get("length_m", 0.0)

        if p >= 0.50:
            high_risk_count += 1
            road_name = edge_data.get("road_name", "Road")
            warn_msg = f"Segment on {road_name} has {int(p*100)}% disruption probability"
            if warn_msg not in warnings:
                warnings.append(warn_msg)

        seg_coords = edge_data.get("coordinates")
        if seg_coords:
            if not coords:
                coords.extend(seg_coords)
            else:
                coords.append(seg_coords[1])
        else:
            coords.append([u[0], u[1]])

    if path_nodes and not coords:
        coords = [[n[0], n[1]] for n in path_nodes]

    avg_risk = sum(risk_probs) / max(len(risk_probs), 1)

    return {
        "route_name": route_name,
        "total_distance_km": round(total_length_m / 1000.0, 2),
        "total_time_minutes": round(total_time_sec / 60.0, 1),
        "average_risk_probability": round(avg_risk, 3),
        "high_risk_segments": high_risk_count,
        "warnings": warnings[:5],
        "geometry": {
            "type": "LineString",
            "coordinates": coords
        }
    }


def find_routes(
    G: nx.DiGraph,
    origin_lon: float,
    origin_lat: float,
    dest_lon: float,
    dest_lat: float,
    risk_weight_lambda: float = 2.0,
    vehicle_type: str = "ambulance"
) -> Dict[str, Any]:
    """
    Compute Recommended Route (risk-weighted) and Alternative Routes.
    Snaps to the main connected street network component.
    """
    if not G.nodes:
        return {"error": "Road graph is empty. Please verify road network dataset."}

    # Find the largest weakly connected component (the main contiguous road network)
    components = sorted(nx.weakly_connected_components(G), key=len, reverse=True)
    main_component = components[0] if components else set(G.nodes)

    start_node = find_nearest_node(G, origin_lon, origin_lat, target_component=main_component)
    target_node = find_nearest_node(G, dest_lon, dest_lat, target_component=main_component)

    if not start_node or not target_node:
        return {"error": "Origin or destination could not be connected to the corridor road network."}

    if start_node == target_node:
        # If snapped to identical node, find secondary neighbor
        neighbors = list(G.neighbors(start_node))
        if neighbors:
            target_node = neighbors[0]
        else:
            return {"error": "Origin and destination are within the same road node."}

    # 1. Recommended Route (Risk-Penalized)
    try:
        def weight_func(u, v, d):
            return calculate_edge_weight(u, v, d, risk_weight_lambda=risk_weight_lambda)

        recommended_path = nx.shortest_path(G, source=start_node, target=target_node, weight=weight_func)
        recommended = format_route_result(G, recommended_path, "Recommended Route (Flood-Aware)")
        recommended["recommendation_reason"] = (
            "Optimized to minimize exposure to waterlogged roads, low-lying bottlenecks, and overflowing stormwater drains while maintaining rapid emergency transit."
        )
    except nx.NetworkXNoPath:
        return {"error": "No passable route available between the selected locations due to verified closures or network disconnections."}
    except Exception as e:
        return {"error": f"Routing calculation error: {str(e)}"}

    # 2. Fastest Route (Unweighted by flood risk, lambda = 0)
    try:
        def time_func(u, v, d):
            return calculate_edge_weight(u, v, d, risk_weight_lambda=0.0)

        fastest_path = nx.shortest_path(G, source=start_node, target=target_node, weight=time_func)
        fastest = format_route_result(G, fastest_path, "Fastest Route (Standard Shortest Path)", apply_risk_delay=False)
        fastest["recommendation_reason"] = "Standard shortest travel time path ignoring pluvial flood exposure."
    except Exception:
        fastest = None

    # 3. Alternative Route 1 (High-Ground Bypass by penalizing recommended path)
    alternative = None
    alt_path = None
    try:
        def alt_weight_func(u, v, d):
            cost = calculate_edge_weight(u, v, d, risk_weight_lambda=risk_weight_lambda * 1.5)
            if u in recommended_path and v in recommended_path:
                cost *= 3.5
            return cost

        alt_path = nx.shortest_path(G, source=start_node, target=target_node, weight=alt_weight_func)
        if alt_path != recommended_path:
            alternative = format_route_result(G, alt_path, "Alternative Route (High-Ground Bypass)")
            alternative["recommendation_reason"] = "Alternative corridor path bypassing primary low-lying road segments."
    except Exception:
        pass

    # 4. Alternative Route 2 (Secondary Bypass)
    secondary_alt = None
    try:
        def alt2_weight_func(u, v, d):
            cost = calculate_edge_weight(u, v, d, risk_weight_lambda=risk_weight_lambda)
            if u in recommended_path:
                cost *= 5.0
            if alt_path and u in alt_path:
                cost *= 3.0
            return cost

        alt2_path = nx.shortest_path(G, source=start_node, target=target_node, weight=alt2_weight_func)
        if alt2_path != recommended_path and alt2_path != alt_path:
            secondary_alt = format_route_result(G, alt2_path, "Secondary Bypass Route (Outer Arterials)")
            secondary_alt["recommendation_reason"] = "Secondary peripheral route avoiding central corridor choke points."
    except Exception:
        pass

    # Collect up to 3 distinct routes
    candidate_routes = []
    
    # 1. Primary Recommended
    recommended["id"] = "route-1"
    recommended["badge"] = "Safest (Flood-Aware)"
    recommended["color"] = "#2563eb" # Royal Blue
    candidate_routes.append(recommended)

    # 2. Alternative High-Ground
    if alternative and alternative.get("geometry") != recommended.get("geometry"):
        alternative["id"] = "route-2"
        alternative["badge"] = "High-Ground Bypass"
        alternative["color"] = "#0891b2" # Cyan / Teal
        candidate_routes.append(alternative)

    # 3. Fastest (if distinct from recommended and alternative)
    if fastest and fastest.get("geometry") != recommended.get("geometry"):
        if not alternative or fastest.get("geometry") != alternative.get("geometry"):
            fastest["id"] = f"route-{len(candidate_routes) + 1}"
            fastest["badge"] = "Direct Shortest Path"
            fastest["color"] = "#d97706" # Amber
            candidate_routes.append(fastest)

    # 4. Secondary alternative if we still have < 3 routes
    if len(candidate_routes) < 3 and secondary_alt:
        is_dup = any(r.get("geometry") == secondary_alt.get("geometry") for r in candidate_routes)
        if not is_dup:
            secondary_alt["id"] = f"route-{len(candidate_routes) + 1}"
            secondary_alt["badge"] = "Outer Bypass"
            secondary_alt["color"] = "#7c3aed" # Purple
            candidate_routes.append(secondary_alt)

    return {
        "status": "success",
        "origin": [origin_lon, origin_lat],
        "destination": [dest_lon, dest_lat],
        "vehicle_type": vehicle_type,
        "risk_penalty_weight": risk_weight_lambda,
        "recommended_route": recommended,
        "fastest_route": fastest or recommended,
        "alternative_route": alternative or (candidate_routes[1] if len(candidate_routes) > 1 else recommended),
        "routes": candidate_routes[:3]
    }
